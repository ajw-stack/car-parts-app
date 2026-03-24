#!/usr/bin/env node
// Import cross-reference data into Supabase
// CSV format: part_number,brand,cross_reference
//
// Interpretation:
//   part_number = canonical/base part number (must already exist in parts table)
//   brand       = brand that sells the equivalent
//   cross_reference = that brand's part number for the equivalent part
//
// Usage:
//   node scripts/import-cross-references.js <file.csv> [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg  = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/import-cross-references.js <file.csv> [--dry-run]');
  process.exit(1);
}

// ─── Load env ─────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
const hdrs = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbSelect(table, params = '', pageSize = 1000) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { ...hdrs, 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function sbUpsert(table, rows, onConflict = '') {
  if (DRY_RUN || rows.length === 0) return rows;
  const qs = onConflict ? `?on_conflict=${onConflict}` : '';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`UPSERT ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
  }
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const rows  = [];
  let colHeaders = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    if (!colHeaders) { colHeaders = cols.map(h => h.toLowerCase()); continue; }
    const get = (k) => cols[colHeaders.indexOf(k)] ?? '';
    const partNumber  = get('part_number').toUpperCase();
    const brand       = get('brand').toUpperCase();
    const crossRef    = get('cross_reference').toUpperCase();
    if (!partNumber || !brand || !crossRef) continue;
    rows.push({ partNumber, brand, crossRef });
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT START ===');

  const csvRows = parseCSV(path.resolve(csvArg));
  console.log(`Parsed ${csvRows.length} cross-reference rows`);

  // Group by canonical part number
  const byCanonical = new Map(); // partNumber → [{ brand, crossRef }]
  for (const r of csvRows) {
    if (!byCanonical.has(r.partNumber)) byCanonical.set(r.partNumber, []);
    byCanonical.get(r.partNumber).push({ brand: r.brand, crossRef: r.crossRef });
  }
  console.log(`Unique canonical part numbers: ${byCanonical.size}`);

  // 1. Load all parts from DB (we need to match by part_number)
  console.log('Loading parts from DB...');
  const allParts = await sbSelect('parts', 'select=id,brand,part_number,name,category,category_id');
  const partsByNumber = new Map(); // part_number (upper) → [{ id, brand, ... }]
  for (const p of allParts) {
    const key = p.part_number.toUpperCase();
    if (!partsByNumber.has(key)) partsByNumber.set(key, []);
    partsByNumber.get(key).push(p);
  }
  console.log(`Loaded ${allParts.length} parts`);

  // 2. For each canonical number, find the base parts in DB
  const missingCanonicals = [];
  const crossRefPartsToUpsert = []; // { brand, part_number, name, category, category_id }
  const linkPairs = [];             // { base_part_id, brand, crossRef }

  for (const [canonical, refs] of byCanonical) {
    const baseParts = partsByNumber.get(canonical) ?? [];

    if (baseParts.length === 0) {
      missingCanonicals.push(canonical);
      continue;
    }

    // Use first base part's category/name for any new cross-ref parts we need to create
    const template = baseParts[0];

    for (const { brand, crossRef } of refs) {
      // Ensure cross-ref part exists in parts table
      const existing = (partsByNumber.get(crossRef) ?? []).find(
        p => p.brand.toUpperCase() === brand
      );
      if (!existing) {
        crossRefPartsToUpsert.push({
          brand:       brand.charAt(0) + brand.slice(1).toLowerCase(), // Title-case
          part_number: crossRef,
          name:        template.name,
          category:    template.category,
          category_id: template.category_id,
        });
      }

      // Record link pairs for each base part
      for (const base of baseParts) {
        linkPairs.push({ base_id: base.id, brand, crossRef });
      }
    }
  }

  // 3. Upsert cross-reference parts
  if (crossRefPartsToUpsert.length > 0) {
    console.log(`Upserting ${crossRefPartsToUpsert.length} cross-reference parts...`);
    await sbUpsert('parts', crossRefPartsToUpsert, 'brand,part_number');
  }

  // 4. Re-fetch parts to get IDs for newly created cross-ref parts
  const allPartsRefreshed = await sbSelect('parts', 'select=id,brand,part_number');
  const partIdByBrandAndNumber = new Map();
  for (const p of allPartsRefreshed) {
    partIdByBrandAndNumber.set(`${p.brand.toUpperCase()}|${p.part_number.toUpperCase()}`, p.id);
  }

  // 5. Load existing cross_references to avoid duplicates
  const existingLinks = new Set();
  const allLinks = await sbSelect('cross_references', 'select=part_id,cross_part_id');
  for (const l of allLinks) existingLinks.add(`${l.part_id}:${l.cross_part_id}`);
  console.log(`Existing cross_references: ${existingLinks.size}`);

  // 6. Build insert rows
  const linksToInsert = [];
  let skipCount = 0;

  for (const { base_id, brand, crossRef } of linkPairs) {
    const crossId = partIdByBrandAndNumber.get(`${brand}|${crossRef}`);
    if (!crossId) {
      console.warn(`  Could not find ID for ${brand} ${crossRef}`);
      continue;
    }
    if (base_id === crossId) continue;

    // Insert both directions so lookup works either way
    for (const [a, b] of [[base_id, crossId], [crossId, base_id]]) {
      const key = `${a}:${b}`;
      if (existingLinks.has(key)) { skipCount++; continue; }
      existingLinks.add(key);
      linksToInsert.push({ part_id: a, cross_part_id: b });
    }
  }

  console.log(`\nNew cross_references to insert: ${linksToInsert.length}`);
  console.log(`Skipped (already exist): ${skipCount}`);

  // 7. Insert
  if (linksToInsert.length > 0) {
    console.log(`Inserting ${linksToInsert.length} cross_references...`);
    await sbInsert('cross_references', linksToInsert);
    console.log('Done.');
  }

  // 8. Report missing canonicals
  if (missingCanonicals.length > 0) {
    console.log(`\nCanonical part numbers not found in DB (${missingCanonicals.length}):`);
    for (const p of missingCanonicals) console.log(`  ${p}`);
    console.log('  → Import the main parts first, then re-run this script.');
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
