#!/usr/bin/env node
// Insert Chery vehicles from chery_brake_catalogue.csv into the vehicles table.
// Usage: node scripts/importers/insert-chery-vehicles.js scripts/chery_brake_catalogue.csv [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) { console.error('Usage: node scripts/importers/insert-chery-vehicles.js <file.csv> [--dry-run]'); process.exit(1); }

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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
}

function parseCSVLine(line) {
  const fields = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) { if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQuote = false; } else cur += ch; }
    else { if (ch === '"') inQuote = true; else if (ch === ',') { fields.push(cur); cur = ''; } else cur += ch; }
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

function deriveFuelType(engineCode) {
  const ec = (engineCode || '').toLowerCase();
  if (ec === 'ev') return 'Electric';
  return 'ULP';
}

function drivetrainNotes(dt) {
  if (!dt) return null;
  const u = dt.toUpperCase();
  if (u === 'AWD') return 'AWD';
  if (u === '4WD') return '4WD';
  return null;
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

  const make         = get('make').trim();
  const model        = get('model').trim();
  const series       = get('series').trim();
  const body         = get('body').trim();
  const yearFrom     = parseInt(get('year_from')) || null;
  const yearTo       = parseInt(get('year_to'))   || null;
  const engineCode   = get('engine_code').trim();
  const engineLitres = parseFloat(get('engine_litres')) || null;
  const engineKw     = parseInt(get('engine_kw'))    || null;
  const trimCode     = get('trim_code').trim() || null;
  const drivetrain   = get('drivetrain').trim();

  if (!make || !model) continue;

  const fuelType     = deriveFuelType(engineCode);
  const engineConfig = engineCode || null;
  const notes        = drivetrainNotes(drivetrain);
  const chassis      = body || null;
  const litres       = (engineLitres === 0) ? null : engineLitres;

  const seriesList = series.split(',').map(s => s.trim()).filter(Boolean);
  if (seriesList.length === 0) seriesList.push(null);

  for (const s of seriesList) {
    const key = `${make}|${model}|${s ?? ''}|${yearFrom ?? ''}|${yearTo ?? ''}|${litres ?? ''}|${engineKw ?? ''}|${trimCode ?? ''}|${fuelType}`;
    if (vehicleMap.has(key)) continue;
    vehicleMap.set(key, { make, model, series: s || null, chassis, year_from: yearFrom, year_to: yearTo, engine_litres: litres, engine_config: engineConfig, engine_kw: engineKw, fuel_type: fuelType, trim_code: trimCode, notes });
  }
}

async function main() {
  const vehicles = Array.from(vehicleMap.values());
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT CHERY VEHICLES ===');
  console.log(`Unique vehicles to insert: ${vehicles.length}`);
  if (DRY_RUN) {
    for (const v of vehicles) console.log(`  ${v.make} ${v.model} ${v.series ?? '-'} ${v.year_from ?? '?'}-${v.year_to ?? 'ON'} ${v.engine_litres ?? '?'}L ${v.engine_config ?? ''} [${v.fuel_type}] trim=${v.trim_code ?? '-'}`);
    return;
  }
  await sbInsert('vehicles', vehicles);
  console.log(`Inserted ${vehicles.length} vehicles (duplicates ignored).`);
  console.log('=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
