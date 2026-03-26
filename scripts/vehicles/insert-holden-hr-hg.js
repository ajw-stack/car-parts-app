#!/usr/bin/env node
// Insert Holden HR (1966-1968) and HG (1970-1971) vehicle records
// Usage: node scripts/insert-holden-hr-hg.js [--dry-run]

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

// ─── Vehicle data ────────────────────────────────────────────────────────────

const vehicles = [

  // ── HR Holden (1966–1968) ─────────────────────────────────────────────────
  // 161ci (2638cc) LC — 8.2:1 compression, single carb
  {
    make: 'Holden', model: 'HR', series: null,
    year_from: 1966, year_to: 1968,
    engine_code: '161 LC', engine_litres: 2.64, engine_config: 'I6',
    engine_kw: 81, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / Premier / Brougham',
    specs: {
      engine_description: '161ci 2638cc OHV I6 LC (8.2:1)',
      torque_nm: 198,
      compression: '8.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      num_built: 252352,
    },
  },
  // 161ci HC — 9.2:1 compression, single carb
  {
    make: 'Holden', model: 'HR', series: null,
    year_from: 1966, year_to: 1968,
    engine_code: '161 HC', engine_litres: 2.64, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / Premier / Brougham',
    specs: {
      engine_description: '161ci 2638cc OHV I6 HC (9.2:1)',
      torque_nm: 213,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  // 186ci — 9.2:1 compression, single carb
  {
    make: 'Holden', model: 'HR', series: null,
    year_from: 1966, year_to: 1968,
    engine_code: '186', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 94, fuel_type: 'ULP',
    notes: 'Premier / Kingswood optional',
    specs: {
      engine_description: '186ci 3048cc OHV I6 (9.2:1)',
      torque_nm: 245,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4200,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  // 186ci X2 — twin carburettor
  {
    make: 'Holden', model: 'HR', series: null,
    year_from: 1966, year_to: 1968,
    engine_code: '186 X2', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 108, fuel_type: 'ULP',
    notes: 'Optional performance engine — twin carburettor',
    specs: {
      engine_description: '186ci 3048cc OHV I6 X2 twin carburettor (9.2:1)',
      torque_nm: 249,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Twin Bendix-Stromberg carburettors',
    },
  },
  // 186S — twin-barrel single carburettor, 4-speed available from June 1967
  {
    make: 'Holden', model: 'HR', series: null,
    year_from: 1966, year_to: 1968,
    engine_code: '186S', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 108, fuel_type: 'ULP',
    notes: '4-speed available from June 1967',
    specs: {
      engine_description: '186S 3048cc OHV I6 twin-barrel single carburettor (9.2:1)',
      torque_nm: 249,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg twin-barrel single downdraft carburettor',
    },
  },

  // ── HG Holden (1970–1971) ─────────────────────────────────────────────────
  // 161ci LC — 8.2:1 compression
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '161 LC', engine_litres: 2.64, engine_config: 'I6',
    engine_kw: 81, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / base Monaro',
    specs: {
      engine_description: '161ci 2640cc OHV I6 LC (8.2:1)',
      torque_nm: 198,
      compression: '8.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
      num_built: 155787,
    },
  },
  // 161ci (HC) — 9.2:1 compression
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '161', engine_litres: 2.64, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'Belmont / Kingswood / Monaro',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.2:1)',
      torque_nm: 213,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Monaro'],
    },
  },
  // 186 — standard on Premier, optional on Belmont/Kingswood
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '186', engine_litres: 3.05, engine_config: 'I6',
    engine_kw: 97, fuel_type: 'ULP',
    notes: 'Standard on Premier; optional on Belmont, Kingswood',
    specs: {
      engine_description: '186ci 3050cc OHV I6 (9.2:1)',
      torque_nm: 245,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier'],
    },
  },
  // 186S — optional on all, standard equipment on Monaro GTS
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '186S', engine_litres: 3.05, engine_config: 'I6',
    engine_kw: 108, fuel_type: 'ULP',
    notes: 'Monaro GTS standard; optional on all models',
    specs: {
      engine_description: '186S 3050cc OHV I6 twin-barrel carburettor (9.2:1)',
      torque_nm: 249,
      compression: '9.2:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg twin-barrel single downdraft carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro GTS'],
    },
  },
  // 253 V8 — first Holden-designed V8, optional on all models
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'Optional on all models',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Brougham', 'Monaro'],
    },
  },
  // 308 V8 — optional on all models
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '308', engine_litres: 5.035, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'Optional on all models',
    specs: {
      engine_description: '308ci 5035cc OHV V8 Rochester Quadrajet (9.0:1)',
      torque_nm: 427,
      compression: '9.0:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4000,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Brougham', 'Monaro GTS'],
    },
  },
  // 350 V8 — standard on Monaro GTS 350; twin exhaust
  // Manual: 224kW @ 4800rpm, 515Nm — Automatic: 205kW @ 4800rpm, 495Nm
  {
    make: 'Holden', model: 'HG', series: null,
    year_from: 1970, year_to: 1971,
    engine_code: '350', engine_litres: 5.740, engine_config: 'V8',
    engine_kw: 224, fuel_type: 'ULP',
    notes: 'Monaro GTS 350 standard; twin exhaust; auto detuned to 205kW/495Nm',
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
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HR + HG HOLDEN ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    }
    return;
  }

  // Check for existing records to avoid duplicates
  const existing = await api('/vehicles?make=eq.Holden&model=in.(HR,HG)&select=model,year_from,year_to,engine_code,fuel_type');
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
