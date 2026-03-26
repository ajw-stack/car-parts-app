#!/usr/bin/env node
// Insert Holden LX Torana (1976-1978) — 49,902 built (8,527 Hatchbacks)
// Usage: node scripts/insert-holden-torana-lx.js [--dry-run]
// A9X option pack available for 5.0L SL/R sedan and SS Hatchback.
// 253 V8 revised from 130kW to 120kW after July 1976; 308 from 186kW to 170kW.

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
  // 1.9L OHV I4 (Opel-sourced) — 76kW
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '1900', engine_litres: 1.897, engine_config: 'I4',
    engine_kw: 76, fuel_type: 'ULP',
    notes: 'Opel-sourced; S and SL Sedan; Sunbird from Nov 1976',
    specs: {
      engine_description: '1897cc OHV I4 (9.0:1)',
      torque_nm: 156,
      compression: '9.0:1',
      bore_stroke_mm: '93.0 x 69.8',
      power_rpm: 5400,
      fuel_system: 'Solex two-barrel downdraft carburettor',
      num_built: 49902,
    },
  },
  // 2.85L 161 OHV I6 — 88kW
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'S and SL Sedan',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  // 3.3L 202 OHV I6 — 101kW
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'SL/R 3300, SL and SS Hatchback',
    specs: {
      engine_description: '202ci 3050cc OHV I6 (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  // 4.2L 253 OHV V8 — 120kW (revised after July 1976; initial 130kW)
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 120, fuel_type: 'ULP',
    notes: 'SL/R and SS Hatchback; initial output 130kW revised to 120kW after July 1976',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4800,
      engine_kw_initial: 130,
      fuel_system: 'Bendix-Stromberg twin-barrel carburettor',
    },
  },
  // 5.0L 308 OHV V8 — 170kW (revised after July 1976; initial 186kW)
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 170, fuel_type: 'ULP',
    notes: 'SL/R 5000 and SS 5000 Hatchback; A9X option available; initial output 186kW revised to 170kW after July 1976',
    specs: {
      engine_description: '308ci 5047cc OHV V8 Rochester Quadrajet (9.7:1)',
      torque_nm: 434,
      compression: '9.7:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      engine_kw_initial: 186,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual exhaust on SS Hatch and SL/R 5000',
    },
  },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT LX TORANA ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) console.log(`  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Torana&series=eq.LX&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
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
    console.log(`  ${v.id}  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
