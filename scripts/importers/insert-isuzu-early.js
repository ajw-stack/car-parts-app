#!/usr/bin/env node
// One-off insert for early Isuzu Wasp and Bellett vehicles.
// Usage: node scripts/importers/insert-isuzu-early.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=ignore-duplicates,return=representation',
};

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) { console.log(`[DRY-RUN] would insert ${rows.length} rows into ${table}`); return []; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers, body: JSON.stringify(rows),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${table} insert failed: ${res.status} ${t}`); }
  return res.json();
}

const vehicles = [
  {
    make: 'Isuzu', model: 'Wasp', series: 'KR20', chassis: 'Utility',
    year_from: 1965, year_to: 1971,
    engine_litres: 1.5, engine_kw: 43, engine_config: 'OHV I4',
    fuel_type: 'Petrol', trim_code: 'Base',
    notes: 'RWD. Approx 122 units imported to Australia',
  },
  {
    make: 'Isuzu', model: 'Bellett', series: 'Base', chassis: 'Sedan',
    year_from: 1963, year_to: 1973,
    engine_litres: 1.3, engine_kw: 51, engine_config: 'OHV I4',
    fuel_type: 'Petrol', trim_code: 'Base',
    notes: 'RWD',
  },
  {
    make: 'Isuzu', model: 'Bellett', series: 'Base', chassis: 'Sedan',
    year_from: 1963, year_to: 1973,
    engine_litres: 1.5, engine_kw: 57, engine_config: 'OHV I4',
    fuel_type: 'Petrol', trim_code: 'Base',
    notes: 'RWD',
  },
  {
    make: 'Isuzu', model: 'Bellett', series: 'GT', chassis: 'Coupe',
    year_from: 1964, year_to: 1973,
    engine_litres: 1.6, engine_kw: 88, engine_config: 'DOHC I4',
    fuel_type: 'Petrol', trim_code: 'GT-R',
    notes: 'RWD. GT-R performance model',
  },
  {
    make: 'Isuzu', model: 'Bellett', series: '1800', chassis: 'Sedan',
    year_from: 1968, year_to: 1973,
    engine_litres: 1.8, engine_kw: 85, engine_config: 'OHV I4',
    fuel_type: 'Petrol', trim_code: 'Base',
    notes: 'RWD',
  },
  {
    make: 'Isuzu', model: 'Bellett', series: 'Diesel', chassis: 'Sedan',
    year_from: 1968, year_to: 1973,
    engine_litres: 1.8, engine_kw: 40, engine_config: 'OHV I4',
    fuel_type: 'Diesel', trim_code: 'Diesel',
    notes: 'RWD',
  },
];

(async () => {
  console.log(`Inserting ${vehicles.length} vehicles...`);
  const inserted = await sbInsert('vehicles', vehicles);
  if (DRY_RUN) return;
  console.log(`Inserted ${inserted.length} vehicles.`);
  inserted.forEach(v => console.log(`  ${v.id}  ${v.make} ${v.model} ${v.series} ${v.year_from}–${v.year_to} ${v.engine_config}`));
})();
