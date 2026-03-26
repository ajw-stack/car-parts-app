#!/usr/bin/env node
// Insert Holden VC Commodore (1980-1981) — 121,807 built (including 500 HDT)
// Usage: node scripts/insert-holden-commodore-vc.js [--dry-run]
// VC introduced new front/rear styling, Starfire 4-cyl added, GM Strasbourg carb on sixes.

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, options = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const vehicles = [

  // 1.9L Starfire 4-cyl — 58kW; Holden-designed replacement for Opel 1900 (UC Torana origin)
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '1900 Starfire', engine_litres: 1.892, engine_config: 'I4',
    engine_kw: 58, fuel_type: 'ULP',
    notes: 'Base engine; Sedan and Wagon',
    specs: {
      engine_description: '1892cc OHV I4 Starfire (8.7:1)',
      torque_nm: 140,
      compression: '8.7:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4600,
      fuel_system: 'GM Varajet twin-barrel downdraft carburettor',
      num_built: 121807,
    },
  },
  // 2.85L 161 I6 — 76kW; GM Strasbourg twin-barrel (upgraded from VB single-barrel)
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '161', engine_litres: 2.838, engine_config: 'I6',
    engine_kw: 76, fuel_type: 'ULP',
    notes: 'SL; Sedan and Wagon',
    specs: {
      engine_description: '161ci 2838cc OHV I6 (9.0:1)',
      torque_nm: 192,
      compression: '9.0:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'GM Strasbourg twin-barrel downdraft carburettor',
      grades: ['Commodore SL'],
    },
  },
  // 3.3L 202 I6 — 83kW; GM Strasbourg twin-barrel
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '202', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 83, fuel_type: 'ULP',
    notes: 'SL / SL/E; Sedan and Wagon',
    specs: {
      engine_description: '202ci 3298cc OHV I6 (8.8:1)',
      torque_nm: 231,
      compression: '8.8:1',
      bore_stroke_mm: '92.08 x 82.6',
      power_rpm: 4000,
      fuel_system: 'GM Strasbourg twin-barrel downdraft carburettor',
      grades: ['Commodore SL', 'Commodore SL/E'],
    },
  },
  // 4.2L 253 V8 — 100kW single / 115kW dual exhaust
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '253', engine_litres: 4.142, engine_config: 'V8',
    engine_kw: 100, fuel_type: 'ULP',
    notes: 'Optional on SL and SL/E; 115kW with dual exhaust',
    specs: {
      engine_description: '253ci 4142cc OHV V8 (9.0:1)',
      torque_nm: 269,
      torque_nm_dual_exhaust: 289,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4200,
      engine_kw_dual_exhaust: 115,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Single with crossover pipe; optional dual pipes with three mufflers',
      grades: ['Commodore SL', 'Commodore SL/E'],
    },
  },
  // 5.0L 308 V8 — 126kW dual exhaust
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 126, fuel_type: 'ULP',
    notes: 'Optional on SL/E; dual exhaust standard',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.2:1)',
      torque_nm: 325,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4200,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual pipes with three mufflers',
      grades: ['Commodore SL/E'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT VC COMMODORE ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VC&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  const r = await api('/vehicles', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'return=representation' },
    body: JSON.stringify(toInsert),
  });
  if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }

  console.log(`Inserted ${r.length} vehicles:`);
  for (const v of r) {
    console.log(`  ${v.id}  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
