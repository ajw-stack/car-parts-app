#!/usr/bin/env node
// Insert Holden HJ (1974-1976), HX (1976-1977), HZ (1977-1980), WB (1980-1985)
// Usage: node scripts/insert-holden-hj-hx-hz-wb.js [--dry-run]

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

  // ── HJ Holden (1974–1976) — 176,202 built ────────────────────────────────
  // Dropped: 350 V8 and LC variants. Monaro last series.
  // Added: Statesman Caprice. 308 compression raised to 9.7:1 vs HQ's 9.0:1.
  {
    make: 'Holden', model: 'HJ', series: null,
    year_from: 1974, year_to: 1976,
    engine_code: '173', engine_litres: 2.834, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'Belmont standard; optional on Kingswood',
    specs: {
      engine_description: '173ci 2834cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'QD',
      grades: ['Belmont', 'Kingswood'],
      num_built: 176202,
    },
  },
  {
    make: 'Holden', model: 'HJ', series: null,
    year_from: 1974, year_to: 1976,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'Standard on Kingswood, Premier, Monaro LS; optional on Belmont',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC (9.4:1)',
      torque_nm: 263,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'QL',
      grades: ['Belmont', 'Kingswood', 'Premier', 'Monaro LS', 'Statesman', 'Statesman Caprice'],
    },
  },
  {
    make: 'Holden', model: 'HJ', series: null,
    year_from: 1974, year_to: 1976,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'Standard on Monaro GTS; optional on all models',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'QR',
      grades: ['Kingswood', 'Premier', 'Monaro GTS', 'Statesman', 'Statesman Caprice'],
    },
  },
  {
    make: 'Holden', model: 'HJ', series: null,
    year_from: 1974, year_to: 1976,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'Optional on all models; dual exhaust standard on V8',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.7:1)',
      torque_nm: 427,
      compression: '9.7:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      engine_prefix: 'QT',
      exhaust: 'Dual exhaust standard on V8; Turbo-Hydramatic 400 for GTS',
      grades: ['Kingswood', 'Premier', 'Monaro GTS', 'Statesman', 'Statesman Caprice'],
    },
  },

  // ── HX Holden (1976–1977) — 110,669 built ────────────────────────────────
  // All engines detuned to comply with ADR 27A emissions. 173 dropped.
  // 202: 81kW (was 101kW). 253: 120kW (was 138kW). 308: 161kW (was 179kW).
  // Last Monaro (LE coupe Limited Edition). New Statesman Caprice.
  {
    make: 'Holden', model: 'HX', series: null,
    year_from: 1976, year_to: 1977,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 81, fuel_type: 'ULP',
    notes: 'Standard on Belmont, Kingswood and Premier; ADR 27A emissions',
    specs: {
      engine_description: '202ci 3310cc OHV I6 (9.4:1) — ADR 27A compliant',
      torque_nm: 251,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 82.5',
      power_rpm: 3900,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'XQL',
      grades: ['Belmont', 'Kingswood', 'Premier'],
      num_built: 110669,
    },
  },
  {
    make: 'Holden', model: 'HX', series: null,
    year_from: 1976, year_to: 1977,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 120, fuel_type: 'ULP',
    notes: 'Standard on Monaro GTS; optional on all models; ADR 27A emissions',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.4:1) — ADR 27A compliant',
      torque_nm: 325,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4550,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'QR',
      grades: ['Kingswood', 'Premier', 'Monaro GTS', 'Statesman'],
    },
  },
  {
    make: 'Holden', model: 'HX', series: null,
    year_from: 1976, year_to: 1977,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 161, fuel_type: 'ULP',
    notes: 'Optional on all models; standard on Monaro LE; ADR 27A emissions',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.7:1) — ADR 27A compliant',
      torque_nm: 400,
      compression: '9.7:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      engine_prefix: 'QT',
      grades: ['Kingswood', 'Premier', 'Monaro GTS', 'Monaro LE', 'Statesman', 'Statesman Caprice'],
    },
  },

  // ── HZ Holden (1977–1980) — 154,155 built ────────────────────────────────
  // Same 3-engine lineup as HX. Introduced Radial Tuned Suspension (RTS).
  // 202 produces 81kW (manual) or 88kW (auto) — stored as 81kW with auto noted.
  // New Statesman SL/E added July 1979. Last commercial Holden before WB.
  {
    make: 'Holden', model: 'HZ', series: null,
    year_from: 1977, year_to: 1980,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 81, fuel_type: 'ULP',
    notes: 'Manual 81kW; Automatic 88kW. Kingswood SL and Premier standard',
    specs: {
      engine_description: '202ci 3310cc OHV I6 (9.4:1)',
      torque_nm: 251,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 82.5',
      power_rpm: 3900,
      engine_kw_auto: 88,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'XQL / ZL',
      suspension: 'Radial Tuned Suspension (RTS) — new for HZ',
      grades: ['Kingswood SL', 'Premier', 'Statesman', 'Statesman Caprice', 'Statesman SL/E'],
      num_built: 154155,
    },
  },
  {
    make: 'Holden', model: 'HZ', series: null,
    year_from: 1977, year_to: 1980,
    engine_code: '253', engine_litres: 4.142, engine_config: 'V8',
    engine_kw: 120, fuel_type: 'ULP',
    notes: 'Standard on Monaro GTS and Sandman; optional on all models',
    specs: {
      engine_description: '253ci 4142cc OHV V8 (9.4:1)',
      torque_nm: 325,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4550,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'QR / ZR',
      grades: ['Kingswood SL', 'Premier', 'Monaro GTS', 'Sandman', 'Statesman'],
    },
  },
  {
    make: 'Holden', model: 'HZ', series: null,
    year_from: 1977, year_to: 1980,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 161, fuel_type: 'ULP',
    notes: 'Optional on all models; Turbo-Hydramatic optional on GTS and Sandman',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.7:1)',
      torque_nm: 400,
      compression: '9.7:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Rochester Quadrajet carburettor',
      engine_prefix: 'QT / ZT',
      grades: ['Kingswood SL', 'Premier', 'Monaro GTS', 'Sandman', 'Statesman', 'Statesman Caprice', 'Statesman SL/E'],
    },
  },

  // ── WB Holden (1980–1985) — 60,231 built ─────────────────────────────────
  // No passenger cars — commercials (Utility, Panel Van, One-Tonner, Kingswood Ute/Van)
  // and Statesman only. Series II Statesman from August 1983.
  // WB Commercial uses 202 and 253. Statesman uses 308 only.
  // HDT Statesman Magnum: 308 tuned to 188kW by Brock's HDT.
  {
    make: 'Holden', model: 'WB', series: null,
    year_from: 1980, year_to: 1985,
    engine_code: '202', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 83, fuel_type: 'ULP',
    notes: 'Commercials (Utility, Panel Van, One-Tonner, Kingswood Ute/Van). GM Varajet twin-barrel carb.',
    specs: {
      engine_description: '202ci 3298cc OHV I6 (8.8:1) — GM Strasbourg Varajet twin-barrel',
      torque_nm: 231,
      compression: '8.8:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4000,
      fuel_system: 'GM Strasbourg Varajet twin-barrel downdraft carburettor',
      grades: ['Utility', 'Kingswood Utility', 'Panel Van', 'Kingswood Panel Van', 'One-Tonner'],
      num_built: 60231,
    },
  },
  {
    make: 'Holden', model: 'WB', series: null,
    year_from: 1980, year_to: 1985,
    engine_code: '253', engine_litres: 4.142, engine_config: 'V8',
    engine_kw: 100, fuel_type: 'ULP',
    notes: 'Commercials; single exhaust 100kW / dual exhaust 115kW',
    specs: {
      engine_description: '253ci 4142cc OHV V8 Rochester Quadrajet (9.0:1)',
      torque_nm: 269,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4200,
      engine_kw_dual_exhaust: 115,
      torque_nm_dual_exhaust: 289,
      fuel_system: 'Rochester Quadrajet four-barrel downdraft carburettor',
      grades: ['Utility', 'Kingswood Utility', 'Panel Van', 'Kingswood Panel Van', 'One-Tonner'],
    },
  },
  {
    make: 'Holden', model: 'WB', series: null,
    year_from: 1980, year_to: 1985,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 126, fuel_type: 'ULP',
    notes: 'Statesman DeVille and Caprice; Series II from August 1983; Turbo-Hydramatic 400',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.2:1)',
      torque_nm: 361,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      transmission_auto: 'Turbo-Hydramatic 400 3-speed automatic',
      grades: ['Statesman DeVille', 'Statesman Caprice', 'Statesman DeVille Series II', 'Statesman Caprice Series II'],
    },
  },
  // HDT Statesman Magnum — 308 tuned by Peter Brock's HDT
  {
    make: 'Holden', model: 'WB', series: null,
    year_from: 1980, year_to: 1985,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 188, fuel_type: 'ULP',
    trim_code: 'HDT Magnum',
    notes: 'HDT Statesman Magnum — Brock-tuned 308, Momo aero-disc wheels, Pirelli P6 235/30 VR15',
    specs: {
      engine_description: '308ci 5044cc OHV V8 (9.2:1) — HDT high-performance tune',
      torque_nm: 429,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 5000,
      fuel_system: 'Four-barrel downdraft carburettor with HDT exhaust manifold',
      exhaust: 'HDT high-performance exhaust system',
      tyres: 'Pirelli P6 235/30 VR15',
      wheels: 'Momo alloy 7.00JJ x 15',
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HJ + HX + HZ + WB HOLDEN ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=in.(HJ,HX,HZ,WB)&select=model,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.model}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.model}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  // PostgREST requires uniform keys — split records with/without trim_code
  const withTrim    = toInsert.filter(v => v.trim_code);
  const withoutTrim = toInsert.filter(v => !v.trim_code);

  const inserted = [];
  for (const batch of [withoutTrim, withTrim]) {
    if (batch.length === 0) continue;
    const r = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(batch),
    });
    if (!Array.isArray(r)) { console.error('Unexpected response:', r); process.exit(1); }
    inserted.push(...r);
  }
  const res = inserted;

  console.log(`Inserted ${res.length} vehicles:`);
  for (const v of res) {
    console.log(`  ${v.id}  ${v.model} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
