#!/usr/bin/env node
// Insert HSV vehicles from hsv_brake_catalogue.csv into the vehicles table.
// Usage: node scripts/importers/insert-hsv-vehicles.js scripts/hsv_brake_catalogue.csv [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) { console.error('Usage: node scripts/importers/insert-hsv-vehicles.js <file.csv> [--dry-run]'); process.exit(1); }

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
  }
}

function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQuote = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

const lines = fs.readFileSync(path.resolve(csvArg), 'utf8').split(/\r?\n/);
let headerCols = null;
const vehicleMap = new Map();

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  if (!headerCols) { headerCols = cols.map(h => h.toLowerCase()); continue; }

  const get = (name) => cols[headerCols.indexOf(name)] ?? '';

  const make        = get('make').trim();
  const model       = get('model').trim();
  const series      = get('series').trim() || null;
  const body        = get('body').trim() || null;
  const yearFrom    = parseInt(get('year_from'), 10) || null;
  const yearTo      = parseInt(get('year_to'),   10) || null;
  const engineCode  = get('engine_code').trim() || null;
  const engineLitres = parseFloat(get('engine_litres')) || null;
  const engineKw    = parseInt(get('engine_kw'), 10) || null;
  const fuelTypeRaw = get('fuel_type').trim();
  const trimCode    = get('trim_code').trim() || null;
  const drivetrain  = get('drivetrain').trim();

  if (!make || !model) continue;

  // Fuel type: use explicit column, default to ULP
  let fuelType = fuelTypeRaw || 'ULP';
  if (fuelType === 'LPG') fuelType = 'LPG';

  // Drivetrain → notes (RWD is standard for HSV, no need to note it)
  let notes = null;
  if (drivetrain && drivetrain.toUpperCase() === 'AWD') notes = 'AWD';
  else if (drivetrain && drivetrain.toUpperCase() === '4WD') notes = '4WD';

  const key = `${make}|${model}|${series ?? ''}|${yearFrom ?? ''}|${yearTo ?? ''}|${engineLitres ?? ''}|${engineKw ?? ''}|${trimCode ?? ''}|${fuelType}`;
  if (vehicleMap.has(key)) continue;

  vehicleMap.set(key, {
    make,
    model,
    series,
    chassis:       body,
    year_from:     yearFrom,
    year_to:       yearTo,
    engine_code:   engineCode,
    engine_litres: engineLitres,
    engine_kw:     engineKw,
    fuel_type:     fuelType,
    trim_code:     trimCode,
    notes,
  });
}

async function main() {
  const vehicles = Array.from(vehicleMap.values());
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HSV VEHICLES ===');
  console.log(`Unique vehicles to insert: ${vehicles.length}`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  ${v.make} ${v.model} ${v.series ?? '-'} ${v.year_from}-${v.year_to ?? 'ON'} ${v.engine_litres ?? '?'}L ${v.engine_code ?? ''} [${v.fuel_type}] trim=${v.trim_code ?? '-'}`);
    }
    return;
  }

  // Fetch existing HSV vehicles to avoid unique constraint violations
  const existRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?make=eq.HSV&select=make,model,series,year_from,year_to,engine_code,trim_code,fuel_type`, {
    headers,
  });
  const existing = await existRes.json();
  const existSet = new Set(existing.map(v =>
    `${v.make}|${v.model}|${v.series ?? ''}|${v.year_from ?? ''}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`
  ));

  // Also deduplicate within the batch on the DB constraint columns (kW not included in constraint)
  const constraintSeen = new Set([...existSet]);
  const toInsert = [];
  for (const v of vehicles) {
    const ck = `${v.make}|${v.model}|${v.series ?? ''}|${v.year_from ?? ''}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    if (constraintSeen.has(ck)) continue;
    constraintSeen.add(ck);
    toInsert.push(v);
  }

  console.log(`Already exists: ${vehicles.length - toInsert.length}, new to insert: ${toInsert.length}`);
  await sbInsert('vehicles', toInsert);
  console.log(`Inserted ${toInsert.length} vehicles.`);
  console.log('=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
