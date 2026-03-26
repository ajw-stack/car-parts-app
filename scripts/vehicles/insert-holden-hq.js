#!/usr/bin/env node
// Insert Holden HQ (1971-1974) vehicle records — 485,650 built
// Usage: node scripts/insert-holden-hq.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const hdrs = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(urlPath, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// HQ introduced the all-new 173ci and 202ci six-cylinder engines (replacing 161/186),
// a new 4-link coil-spring rear suspension (replacing leaf springs), and the Statesman model.
// Wheel PCD changed from 4.25" (108mm) to 4.75" (121mm) — not interchangeable with earlier H-series.

const vehicles = [

  // 173ci LC — 8.3:1 compression, engine prefix QE
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '173 LC', engine_litres: 2.834, engine_config: 'I6',
    engine_kw: 84, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood standard',
    specs: {
      engine_description: '173ci 2834cc OHV I6 LC (8.3:1)',
      torque_nm: 217,
      compression: '8.3:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'QE',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
      num_built: 485650,
    },
  },
  // 173ci HC — 9.4:1 compression, engine prefix QD
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '173', engine_litres: 2.834, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / Monaro',
    specs: {
      engine_description: '173ci 2834cc OHV I6 HC (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'QD',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
    },
  },
  // 202ci LC — 7.8:1 compression, single carb, engine prefix QM
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '202 LC', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 96, fuel_type: 'ULP',
    notes: 'Optional on Belmont, Kingswood and base Monaro',
    specs: {
      engine_description: '202ci 3310cc OHV I6 LC (7.8:1)',
      torque_nm: 258,
      compression: '7.8:1',
      bore_stroke_mm: '92.1 x 82.6',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'QM',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
    },
  },
  // 202ci HC — 9.4:1 compression, twin-barrel carb, engine prefix QL
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'Standard on Premier and Monaro LS; optional on Belmont, Kingswood',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC twin-barrel (9.4:1)',
      torque_nm: 263,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.6',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg twin-barrel single downdraft carburettor',
      engine_prefix: 'QL',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro LS', 'Statesman', 'Statesman DeVille'],
    },
  },
  // 253ci LC V8 — 8.0:1 compression, engine prefix QS
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '253 LC', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 130, fuel_type: 'ULP',
    notes: 'Optional on all models',
    specs: {
      engine_description: '253ci 4146cc OHV V8 LC (8.0:1)',
      torque_nm: 335,
      compression: '8.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'QS',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro', 'Statesman', 'Statesman DeVille'],
    },
  },
  // 253ci HC V8 — 9.0:1 compression, engine prefix QR; standard on Monaro GTS
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'Standard on Monaro GTS; optional on all models',
    specs: {
      engine_description: '253ci 4146cc OHV V8 HC (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'QR',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro GTS', 'Statesman', 'Statesman DeVille'],
    },
  },
  // 308ci V8 — 9.0:1 compression, Rochester Quadrajet 4-barrel, engine prefix QT
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'Optional on all models; standard disc brakes on V8',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.0:1)',
      torque_nm: 427,
      compression: '9.0:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      engine_prefix: 'QT',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro GTS', 'Statesman', 'Statesman DeVille'],
    },
  },
  // 350ci V8 — 8.5:1 compression (detuned vs HG/HT), Turbo-Hydramatic 400 auto, engine prefix QU
  {
    make: 'Holden', model: 'HQ', series: null,
    year_from: 1971, year_to: 1974,
    engine_code: '350', engine_litres: 5.740, engine_config: 'V8',
    engine_kw: 205, fuel_type: 'ULP',
    notes: 'Monaro GTS 350 standard; optional on Monaro GTS and LS; dual exhaust optional on V8 models',
    specs: {
      engine_description: '350ci 5740cc OHV V8 Rochester Quadrajet (8.5:1)',
      torque_nm: 488,
      compression: '8.5:1',
      bore_stroke_mm: '101.6 x 88.39',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      engine_prefix: 'QU',
      transmission_auto: 'Turbo-Hydramatic 400 3-speed automatic',
      grades: ['Monaro GTS 350', 'Monaro GTS', 'Monaro LS'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HQ HOLDEN ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.HQ&select=model,year_from,year_to,engine_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.model}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.model}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  const res = await api('/vehicles', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'return=representation' },
    body: JSON.stringify(toInsert),
  });

  if (!Array.isArray(res)) {
    console.error('Unexpected response:', res);
    process.exit(1);
  }

  console.log(`Inserted ${res.length} vehicles:`);
  for (const v of res) {
    console.log(`  ${v.id}  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
