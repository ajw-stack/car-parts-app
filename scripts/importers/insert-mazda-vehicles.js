#!/usr/bin/env node
// Insert Mazda vehicles from mazda_brake_catalogue.csv into the vehicles table.
// Reads the source CSV (with separate engine_code, engine_litres, engine_kw columns).
// Deduplicates in memory before inserting.
//
// Usage:
//   node scripts/importers/insert-mazda-vehicles.js scripts/mazda_brake_catalogue.csv [--dry-run]

const fs   = require('fs');
const path = require('path');

const csvArg = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/importers/insert-mazda-vehicles.js <file.csv> [--dry-run]');
  process.exit(1);
}

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
  }
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

// ─── Fuel type derivation ─────────────────────────────────────────────────────
// model and engineLitres passed in for EV detection (MX-30 EV has no engine_litres)
function deriveFuelType(engineCode, model, engineLitres) {
  // MX-30 with no engine_litres = EV (the SKYACTIV entry with 107kw and no litres)
  if (model === 'MX-30' && !engineLitres) return 'Electric';

  const ec = (engineCode || '').toLowerCase();

  // Diesel: SKYACTIV-D, e-SKYACTIV-D, MZR-CD, CDVi, TDi, B2200 D, E2200 D, standalone 'D'
  if (/skyactiv-d|mzr-cd|cdvi|tdi|\bd\b|b2200 d|e2200 d/.test(ec)) return 'Diesel';

  // Hybrid: SKYACTIV-X Hybrid, e-SKYACTIV-G MHEV, Hybrid (standalone)
  if (/hybrid|mhev/.test(ec)) return 'Hybrid';

  return 'ULP';
}

// ─── Drivetrain → notes ───────────────────────────────────────────────────────
function drivetrainNotes(dt) {
  if (!dt) return null;
  const u = dt.toUpperCase();
  if (u === 'AWD') return 'AWD';
  if (u === '4WD') return '4WD';
  return null;
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const lines = fs.readFileSync(path.resolve(csvArg), 'utf8').split(/\r?\n/);
let headerCols = null;
const vehicleMap = new Map();

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  if (!headerCols) {
    headerCols = cols.map(h => h.toLowerCase());
    continue;
  }

  const get = (name) => cols[headerCols.indexOf(name)] ?? '';

  const make         = get('make').trim();
  const model        = get('model').trim();
  const series       = get('series').trim();
  const body         = get('body').trim();
  const yearFromStr  = get('year_from').trim();
  const yearToStr    = get('year_to').trim();
  const engineCode   = get('engine_code').trim();
  const engineLitres = parseFloat(get('engine_litres')) || null;
  const engineKw     = parseInt(get('engine_kw'), 10) || null;
  const trimCode     = get('trim_code').trim() || null;
  const drivetrain   = get('drivetrain').trim();

  if (!make || !model) continue;

  const yearFrom = parseInt(yearFromStr, 10) || null;
  const yearTo   = parseInt(yearToStr,   10) || null;

  const fuelType     = deriveFuelType(engineCode, model, engineLitres);
  const engineConfig = engineCode || null;
  const notes        = drivetrainNotes(drivetrain);
  const chassis      = body || null;

  // Split series on comma (e.g. "DE, DH" → two vehicles)
  const seriesList = series.split(',').map(s => s.trim()).filter(Boolean);
  if (seriesList.length === 0) seriesList.push(null);

  for (const s of seriesList) {
    const key = `${make}|${model}|${s ?? ''}|${yearFrom ?? ''}|${yearTo ?? ''}|${engineLitres ?? ''}|${engineKw ?? ''}|${trimCode ?? ''}|${fuelType}`;
    if (vehicleMap.has(key)) continue;

    vehicleMap.set(key, {
      make,
      model,
      series:        s || null,
      chassis,
      year_from:     yearFrom,
      year_to:       yearTo,
      engine_litres: engineLitres,
      engine_config: engineConfig,
      engine_kw:     engineKw,
      fuel_type:     fuelType,
      trim_code:     trimCode,
      notes,
    });
  }
}

async function main() {
  const vehicles = Array.from(vehicleMap.values());
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT MAZDA VEHICLES ===');
  console.log(`Unique vehicles to insert: ${vehicles.length}`);

  if (DRY_RUN) {
    for (const v of vehicles.slice(0, 20)) {
      console.log(`  ${v.make} ${v.model} ${v.series ?? '-'} ${v.year_from ?? '?'}-${v.year_to ?? 'ON'} ${v.engine_litres ?? '?'}L ${v.engine_config ?? ''} [${v.fuel_type}] trim=${v.trim_code ?? '-'}`);
    }
    if (vehicles.length > 20) console.log(`  ... and ${vehicles.length - 20} more`);

    const byFuel = {};
    for (const v of vehicles) { byFuel[v.fuel_type] = (byFuel[v.fuel_type] || 0) + 1; }
    console.log('\nFuel type breakdown:', byFuel);
    return;
  }

  await sbInsert('vehicles', vehicles);
  console.log(`Inserted ${vehicles.length} vehicles (duplicates ignored).`);
  console.log('=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
