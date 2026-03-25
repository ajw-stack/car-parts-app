#!/usr/bin/env node
// Insert Toyota vehicles extracted from the pre-processed Bendix CSV.
//
// Unique vehicle key: make + model + series + year_from + year_to + engine_string + trim + drivetrain
// Engine_code is derived from the engine string for DB uniqueness.
// Drivetrain + body stored in notes.
//
// Usage:
//   node scripts/insert-toyota-vehicles.js <clean.csv> [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg  = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/insert-toyota-vehicles.js <clean.csv> [--dry-run]');
  process.exit(1);
}

// ─── Env ───────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbSelect(path2, params = '') {
  const all = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${path2}?${params}`;
    const res = await fetch(url, {
      headers: { ...headers, 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!res.ok) throw new Error(`GET ${path2}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function sbInsertBatch(rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT vehicles: ${res.status} ${await res.text()}`);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
}

// ─── CSV parser (quoted fields) ────────────────────────────────────────────────
function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuote = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// ─── Engine parsing ────────────────────────────────────────────────────────────
function parseEngine(engineStr) {
  if (!engineStr) return { litres: null, fuelType: 'ULP', code: null };

  const s = engineStr.trim();

  // Detect fuel type
  let fuelType = 'ULP';
  if (/\bev\b|electric/i.test(s) || /^bz/i.test(s)) fuelType = 'EV';
  else if (/hybrid/i.test(s)) fuelType = 'Hybrid';
  else if (/\bD-4D\b|\bTDi?\b|\bDTFI\b|\bDi\b|\bTD\b|\bD$/i.test(s) || / D /i.test(s) || /\bDiesel\b/i.test(s)) fuelType = 'Diesel';

  // Parse leading litres
  const litresMatch = s.match(/^(\d+(?:\.\d+)?)/);
  const litres = litresMatch ? parseFloat(litresMatch[1]) : null;

  // Derive a short engine code for uniqueness (e.g. "2.0L", "2.4L-D", "EV")
  let code = null;
  if (fuelType === 'EV') {
    code = 'EV';
  } else if (litres !== null) {
    code = litres.toFixed(1) + 'L';
    if (fuelType === 'Diesel') code += '-D';
    else if (fuelType === 'Hybrid') code += '-H';
    // If there's a suffix like EFI, VVTi, TRD that distinguishes variants, append it
    const suffixMatch = s.match(/^[\d.]+[L]?\s+([A-Za-z][A-Za-z0-9]*)/);
    if (suffixMatch) {
      const suffix = suffixMatch[1].toUpperCase();
      // Only append distinguishing suffixes, not generic ones
      const GENERIC = new Set(['D', 'L', 'LI', 'I', 'EFI', 'FI', 'DI', 'SX', 'ZR', 'WD']);
      if (!GENERIC.has(suffix) && suffix.length <= 6) code += '-' + suffix;
    }
  }

  return { litres, fuelType, code };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT TOYOTA VEHICLES ===');

  // 1. Parse CSV into unique vehicle combinations
  const lines = fs.readFileSync(path.resolve(csvArg), 'utf8').split(/\r?\n/);
  let hdr = null;
  const seen = new Map(); // dedup key → vehicle row

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const cols = splitCSVLine(line);
    if (!hdr) { hdr = cols.map(h => h.toLowerCase()); continue; }

    const get = n => cols[hdr.indexOf(n)] ?? '';
    const make       = get('make');
    const model      = get('model').trim();
    const series     = get('series').trim();
    const engineStr  = get('engine').trim();
    const trim       = get('trim').trim();
    const drivetrain = get('drivetrain').trim();
    const body       = get('body').trim();
    const yearFrom   = parseInt(get('year_from'), 10) || null;
    const yearTo     = parseInt(get('year_to'),   10) || null;

    if (!model) continue;

    const { litres, fuelType, code } = parseEngine(engineStr);

    // Dedup key must match DB unique constraint:
    // (make, model, series, year_from, year_to, engine_code, COALESCE(trim_code,''), COALESCE(fuel_type,''))
    const dedupeKey = [make, model, series ?? '', yearFrom, yearTo, code ?? '', trim ?? '', fuelType ?? ''].join('|');
    if (seen.has(dedupeKey)) continue;

    const notes = body || null;

    seen.set(dedupeKey, {
      make,
      model,
      series:          series || null,
      year_from:       yearFrom,
      year_to:         yearTo,
      engine_litres:   litres,
      engine_code:     code,
      fuel_type:       fuelType,
      trim_code:       trim || null,
      notes,
    });
  }

  const toInsert = Array.from(seen.values());
  console.log(`Unique vehicles from CSV: ${toInsert.length}`);

  // 2. Load existing Toyota vehicles from DB to avoid inserting duplicates
  console.log('Loading existing Toyota vehicles from DB...');
  const existing = await sbSelect('vehicles', 'make=eq.Toyota&select=make,model,series,year_from,year_to,engine_code,trim_code,fuel_type');
  console.log(`Existing Toyota vehicles in DB: ${existing.length}`);

  const existingKeys = new Set(existing.map(v =>
    [v.make, v.model, v.series ?? '', v.year_from, v.year_to, v.engine_code ?? '', v.trim_code ?? '', v.fuel_type ?? ''].join('|')
  ));

  const newVehicles = toInsert.filter(v => {
    const key = [v.make, v.model, v.series ?? '', v.year_from, v.year_to, v.engine_code ?? '', v.trim_code ?? '', v.fuel_type ?? ''].join('|');
    return !existingKeys.has(key);
  });

  console.log(`New vehicles to insert: ${newVehicles.length}`);

  if (DRY_RUN) {
    // Show sample
    const models = [...new Set(newVehicles.map(v => v.model))].sort();
    console.log(`\nModels (${models.length}):`);
    models.forEach(m => {
      const count = newVehicles.filter(v => v.model === m).length;
      console.log(`  ${m}: ${count} variant(s)`);
    });
    console.log('\nSample (first 10):');
    newVehicles.slice(0, 10).forEach(v =>
      console.log(`  ${v.model} ${v.series ?? ''} ${v.year_from}-${v.year_to ?? 'ON'} ${v.engine_litres ?? '?'}L ${v.fuel_type} ${v.trim_code ?? ''} [${v.notes ?? ''}]`)
    );
    return;
  }

  // 3. Insert in batches
  console.log(`Inserting ${newVehicles.length} vehicles...`);
  await sbInsertBatch(newVehicles);
  console.log(`Done. Inserted ${newVehicles.length} Toyota vehicles.`);

  // 4. Verify
  const after = await sbSelect('vehicles', 'make=eq.Toyota&select=id');
  console.log(`Toyota vehicles in DB now: ${after.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
