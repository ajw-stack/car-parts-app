#!/usr/bin/env node
// Insert Holden HK (1968-1969) and HT (1969-1970) vehicle records
// Usage: node scripts/insert-holden-hk-ht.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
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

const vehicles = [

  // ── HK Holden (1968–1969) — 199,039 built ────────────────────────────────
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '161 LC', engine_litres: 2.638, engine_config: 'I6',
    engine_kw: 81, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood standard',
    specs: {
      engine_description: '161ci 2638cc OHV I6 Low Compression (8.2:1)',
      torque_nm: 198,
      compression: '8.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood'],
      num_built: 199039,
    },
  },
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '161 HC', engine_litres: 2.638, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / Monaro',
    specs: {
      engine_description: '161ci 2638cc OHV I6 High Compression (9.2:1)',
      torque_nm: 213,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
    },
  },
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '186', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 94, fuel_type: 'ULP',
    notes: 'Standard on Premier; optional on Belmont, Kingswood',
    specs: {
      engine_description: '186ci 3048cc OHV I6 (9.2:1)',
      torque_nm: 245,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4200,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro'],
    },
  },
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '186S', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 108, fuel_type: 'ULP',
    notes: 'Monaro GTS standard; optional on all models',
    specs: {
      engine_description: '186S 3048cc OHV I6 twin-barrel carburettor (9.2:1)',
      torque_nm: 249,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg twin-barrel single downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro GTS'],
    },
  },
  // 307 V8 — first V8 in Holden lineup; dual skin aluminised muffler
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '307', engine_litres: 5.035, engine_config: 'V8',
    engine_kw: 157, fuel_type: 'ULP',
    notes: 'Monaro GTS / Brougham; LSD mandatory',
    specs: {
      engine_description: '307ci 5035cc OHV V8 two-barrel Rochester (8.75:1)',
      torque_nm: 407,
      compression: '8.75:1',
      bore_stroke_mm: '98.4 x 82.6',
      power_rpm: 4600,
      fuel_system: 'Two-barrel Rochester downdraft carburettor',
      exhaust: 'Reverse-flow double-skin aluminised muffler with resonant chamber',
      grades: ['Brougham', 'Monaro GTS'],
    },
  },
  // 327 V8 — standard on Monaro GTS 327; dual exhaust with twin tail pipes
  {
    make: 'Holden', model: 'HK', series: null,
    year_from: 1968, year_to: 1969,
    engine_code: '327', engine_litres: 5.363, engine_config: 'V8',
    engine_kw: 186, fuel_type: 'ULP',
    notes: 'Monaro GTS 327 standard; 4-speed Chev M21 or M22, dual exhaust',
    specs: {
      engine_description: '327ci 5363cc OHV V8 four-barrel Rochester (8.75:1)',
      torque_nm: 441,
      compression: '8.75:1',
      bore_stroke_mm: '101.6 x 82.6',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester downdraft carburettor',
      exhaust: 'Dual reverse-flow resonators, single muffler with dual inlets/outlets, twin tail pipes with chrome dual-branch outlets',
      grades: ['Monaro GTS 327'],
    },
  },

  // ── HT Holden (1969–1970) ─────────────────────────────────────────────────
  // Same 161ci but now referred to without LC/HC suffix
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '161', engine_litres: 2.638, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood standard',
    specs: {
      engine_description: '161ci 2638cc OHV I6 (9.2:1)',
      torque_nm: 213,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
    },
  },
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '186', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 97, fuel_type: 'ULP',
    notes: 'Standard on Premier; optional on Belmont, Kingswood',
    specs: {
      engine_description: '186ci 3048cc OHV I6 (9.2:1)',
      torque_nm: 245,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro'],
    },
  },
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '186S', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 108, fuel_type: 'ULP',
    notes: 'Monaro GTS standard; optional on all models',
    specs: {
      engine_description: '186S 3048cc OHV I6 twin-barrel carburettor (9.2:1)',
      torque_nm: 249,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg twin-barrel single downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro GTS'],
    },
  },
  // 253 V8 — first Holden-designed V8 (introduced HT)
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'First Holden-designed V8; optional on all models',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1) — first Holden-designed V8',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Brougham', 'Monaro GTS'],
    },
  },
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '307', engine_litres: 5.035, engine_config: 'V8',
    engine_kw: 157, fuel_type: 'ULP',
    notes: 'Optional on all models',
    specs: {
      engine_description: '307ci 5035cc OHV V8 two-barrel Rochester (8.75:1)',
      torque_nm: 407,
      compression: '8.75:1',
      bore_stroke_mm: '98.4 x 82.6',
      power_rpm: 4600,
      fuel_system: 'Two-barrel Rochester downdraft carburettor',
      grades: ['Brougham', 'Monaro GTS'],
    },
  },
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '308', engine_litres: 5.035, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'Optional on all models',
    specs: {
      engine_description: '308ci 5035cc OHV V8 four-barrel Rochester Quadrajet (9.0:1)',
      torque_nm: 427,
      compression: '9.0:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4000,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      grades: ['Brougham', 'Monaro GTS'],
    },
  },
  // 350 V8 — manual 224kW, auto 205kW
  {
    make: 'Holden', model: 'HT', series: null,
    year_from: 1969, year_to: 1970,
    engine_code: '350', engine_litres: 5.740, engine_config: 'V8',
    engine_kw: 224, fuel_type: 'ULP',
    notes: 'Monaro GTS 350 standard; auto detuned to 205kW/495Nm; twin exhaust',
    specs: {
      engine_description: '350ci 5740cc OHV V8 Rochester Quadrajet (10.25:1)',
      torque_nm: 515,
      compression: '10.25:1',
      bore_stroke_mm: '101.6 x 88.39',
      power_rpm: 4800,
      engine_kw_auto: 205,
      torque_nm_auto: 495,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      exhaust: 'Twin exhaust with dual branch tail pipes',
      grades: ['Monaro GTS 350'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HK + HT HOLDEN ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=in.(HK,HT)&select=model,year_from,year_to,engine_code,fuel_type');
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
