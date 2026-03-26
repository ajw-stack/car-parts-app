#!/usr/bin/env node
// Insert Holden Gemini vehicles from holden_gemini.csv
// Usage: node scripts/insert-holden-gemini.js <csv> [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg  = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/insert-holden-gemini.js <csv> [--dry-run]');
  process.exit(1);
}

// ─── Env ───────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
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

// ─── CSV parser ────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
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

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HOLDEN GEMINI ===');

  const lines = fs.readFileSync(path.resolve(csvArg), 'utf8').split(/\r?\n/);
  let hdr = null;
  const seen = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (!hdr) { hdr = cols.map(h => h.toLowerCase()); continue; }

    const get = n => cols[hdr.indexOf(n)] ?? '';

    const make          = get('make');
    const model         = get('model');
    const series        = get('series');
    const trim          = get('trim');
    const body          = get('body');
    const yearFrom      = parseInt(get('year_from'), 10) || null;
    const yearTo        = parseInt(get('year_to'),   10) || null;
    const engineCode    = get('engine_code') || null;
    const engineLitres  = parseFloat(get('engine_litres')) || null;
    const engineConfig  = get('engine_config') || null;
    const rawFuel       = get('fuel_type').toLowerCase();
    const drivetrain    = get('drivetrain') || null;
    const engineVariant = get('engine_variant') || null;
    const csvNotes      = get('notes') || null;

    // Map fuel type
    const fuelType = rawFuel === 'petrol' ? 'ULP'
                   : rawFuel === 'diesel' ? 'Diesel'
                   : rawFuel === 'lpg'    ? 'LPG'
                   : rawFuel;

    // notes = body type; engine variant in specs
    const notes = body || null;
    const specs = engineVariant ? { engine_variant: engineVariant } : null;

    // Dedup key matches DB unique constraint
    const dedupeKey = [make, model, series ?? '', yearFrom, yearTo, engineCode ?? '', trim ?? '', fuelType ?? ''].join('|');
    if (seen.has(dedupeKey)) continue;

    seen.set(dedupeKey, {
      make,
      model,
      series:         series || null,
      year_from:      yearFrom,
      year_to:        yearTo,
      engine_code:    engineCode,
      engine_litres:  engineLitres,
      engine_config:  engineConfig,
      fuel_type:      fuelType,
      trim_code:      trim || null,
      notes,
      specs,
    });
  }

  const toInsert = Array.from(seen.values());
  console.log(`Unique vehicles from CSV: ${toInsert.length}`);

  console.log('Loading existing Holden Gemini vehicles from DB...');
  const existing = await sbSelect('vehicles', 'make=eq.Holden&model=eq.Gemini&select=make,model,series,year_from,year_to,engine_code,trim_code,fuel_type');
  console.log(`Existing Holden Gemini in DB: ${existing.length}`);

  const existingKeys = new Set(existing.map(v =>
    [v.make, v.model, v.series ?? '', v.year_from, v.year_to, v.engine_code ?? '', v.trim_code ?? '', v.fuel_type ?? ''].join('|')
  ));

  const newVehicles = toInsert.filter(v => {
    const key = [v.make, v.model, v.series ?? '', v.year_from, v.year_to, v.engine_code ?? '', v.trim_code ?? '', v.fuel_type ?? ''].join('|');
    return !existingKeys.has(key);
  });

  console.log(`New vehicles to insert: ${newVehicles.length}`);

  if (DRY_RUN) {
    newVehicles.forEach(v =>
      console.log(`  ${v.series} ${v.trim_code} ${v.notes} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.fuel_type}`)
    );
    return;
  }

  console.log(`Inserting ${newVehicles.length} vehicles...`);
  await sbInsertBatch(newVehicles);
  console.log(`Done.`);

  const after = await sbSelect('vehicles', 'make=eq.Holden&model=eq.Gemini&select=id');
  console.log(`Holden Gemini in DB now: ${after.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
