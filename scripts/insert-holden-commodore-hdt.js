#!/usr/bin/env node
// Insert HDT Brock Commodore performance variants (VC, VH, VK, VL)
// Usage: node scripts/insert-holden-commodore-hdt.js [--dry-run]
//
// Only records with genuinely distinct engine tunes are inserted here.
// HDT Group One / Group Two (VH) use standard 253/308 engines — covered by existing VH records.
// New records:
//   VC HDT:              308 160kW (vs standard VC 126kW)
//   VH HDT Group 3:      308 184kW L31/V5H (vs standard VH 126kW)
//   VH HDT 5.8L:         354ci 5.766L 251kW one-off
//   VK HDT Group A:      308 196kW 4.987L special stroke (vs standard VK SS 177kW)
//   VL HDT SS Group A:   308 137kW 4.987L 76.8mm stroke / 8.5:1 (homologation)
//   VL HDT SS Group 3:   308 187kW 4.987L 76.8mm stroke / 9.2:1
//   VL HDT Director Stroker: 5.643L 231kW 102.4x85.7mm bore/stroke

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
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

  // ── VC HDT (500 built, October 1980) ────────────────────────────────────────
  // 308 tuned to 160kW dual exhaust (vs standard VC 308 at 126kW)
  {
    make: 'Holden', model: 'Commodore', series: 'VC',
    year_from: 1980, year_to: 1981,
    engine_code: '308', engine_litres: 5.040, engine_config: 'V8',
    engine_kw: 160, fuel_type: 'ULP',
    trim_code: 'HDT',
    notes: 'HDT Brock VC; 500 built; bird-bath rear spoiler; Irmscher 6×15 alloys; Uniroyal ER60H15',
    specs: {
      engine_description: '308ci 5040cc OHV V8 Rochester Quadrajet (9.2:1) — HDT tune',
      torque_nm: 450,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4500,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual cast iron manifolds with single crossover; dual optional',
      steering_ratio: '15.8:1',
      brakes_front: '268mm vented disc',
      brakes_rear: '258mm disc',
      num_built: 500,
      colours: ['White', 'Red', 'Black'],
    },
  },

  // ── VH HDT Group Three (majority of 322 built, June 1982) ───────────────────
  // L31/V5H option: 184kW — distinct from standard VH 308 at 126kW and standard SS 115kW dual
  {
    make: 'Holden', model: 'Commodore', series: 'VH',
    year_from: 1982, year_to: 1984,
    engine_code: '308', engine_litres: 5.040, engine_config: 'V8',
    engine_kw: 184, fuel_type: 'ULP',
    trim_code: 'HDT Group 3',
    notes: 'HDT Brock VH Group Three; L31 engine with V5H option; ~322 built; 281mm all-round discs',
    specs: {
      engine_description: '308ci 5040cc OHV V8 Rochester Quadrajet L31/V5H (9.2:1) — HDT Group Three',
      torque_nm: 418,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4750,
      engine_prefix: 'L31/V5H',
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'HDT exhaust manifold in VHT white; dual optional',
      steering_ratio: '15.8:1',
      brakes_front: '281mm vented disc',
      brakes_rear: '281mm disc',
      wheels: '7.0×15 Irmscher alloys',
      tyres: 'Uniroyal 225×60×15 Wildcat',
      num_built: 322,
    },
  },

  // VH HDT 5.8L (one-off)
  {
    make: 'Holden', model: 'Commodore', series: 'VH',
    year_from: 1982, year_to: 1984,
    engine_code: '354', engine_litres: 5.766, engine_config: 'V8',
    engine_kw: 251, fuel_type: 'ULP',
    trim_code: 'HDT 5.8',
    notes: 'HDT Brock VH 5.8L one-off; 354ci punched/stroked 308 block; 101.6×88.9 bore/stroke',
    specs: {
      engine_description: '354ci 5766cc OHV V8 Rochester Quadrajet (9.8:1) — HDT 5.8L one-off',
      torque_nm: 522,
      compression: '9.8:1',
      bore_stroke_mm: '101.6 x 88.9',
      power_rpm: 4800,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      num_built: 1,
    },
  },

  // ── VK HDT Group A (500 built, March 1985) ──────────────────────────────────
  // Distinct engine: 4.987L with shorter stroke (76.8mm vs 77.8mm), 196kW, 8.8:1 — homologation unit
  {
    make: 'Holden', model: 'Commodore', series: 'VK',
    year_from: 1985, year_to: 1986,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 196, fuel_type: 'ULP',
    trim_code: 'HDT Group A',
    notes: 'HDT Brock VK Group A; 500 built; homologation engine 76.8mm stroke; 7×16 HDT alloys; Bilstein suspension',
    specs: {
      engine_description: '308ci 4987cc OHV V8 Rochester Quadrajet Group A (8.8:1) — HDT homologation',
      torque_nm: 418,
      compression: '8.8:1',
      bore_stroke_mm: '101.6 x 76.8',
      power_rpm: 5200,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Low-restriction dual with white heat-proof coated headers',
      suspension_front: 'MacPherson struts with Bilstein inserts, heavy-duty stabiliser bar',
      suspension_rear: 'Panhard rod location with HDT rear stabiliser kit',
      steering_ratio: '15.8:1',
      brakes_front: '281mm vented disc',
      brakes_rear: '281mm disc',
      wheels: '7.0×16 HDT Alloys',
      tyres: 'Bridgestone Potenza 225/50 VR16',
      num_built: 500,
    },
  },

  // ── VL HDT (1986-1987) ──────────────────────────────────────────────────────

  // VL HDT SS Group A (500 built, November 1986) — homologation engine 76.8mm stroke, 8.5:1
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1986, year_to: 1987,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 137, fuel_type: 'ULP',
    trim_code: 'HDT Group A',
    notes: 'HDT Brock VL SS Group A; 500 built Nov 1986; 76.8mm stroke; Momo 5-spoke 7×16; Bilstein; red only',
    specs: {
      engine_description: '4987cc OHV V8 Rochester Quadrajet Group A (8.5:1) — HDT homologation 76.8mm stroke',
      torque_nm: 345,
      compression: '8.5:1',
      bore_stroke_mm: '101.6 x 76.8',
      power_rpm: 4400,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Catalytic converter fitted',
      suspension_front: 'MacPherson struts with Bilstein dampers',
      suspension_rear: 'Panhard rod; Bilstein dampers',
      brakes_front: '289mm vented disc',
      brakes_rear: '230mm disc',
      wheels: '7.0×16 HDT Momo 5-spoke alloys',
      tyres: 'Bridgestone RE71 205/55 VR15',
      num_built: 500,
    },
  },

  // VL HDT SS Group Three (mid 1987) — high performance 9.2:1 short-stroke 187kW
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1987, year_to: 1988,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 187, fuel_type: 'ULP',
    trim_code: 'HDT Group 3',
    notes: 'HDT Brock VL SS Group Three; 187kW short-stroke 9.2:1; 7×16 HDT alloys; white only',
    specs: {
      engine_description: '4987cc OHV V8 Rochester Quadrajet Group Three (9.2:1) — HDT 76.8mm stroke',
      torque_nm: 415,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 76.8',
      power_rpm: 4700,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Catalytic converter fitted',
      suspension_front: 'MacPherson struts with Bilstein dampers',
      brakes_front: '289mm vented disc',
      brakes_rear: '230mm disc',
      wheels: '7.0×16 HDT alloys',
      tyres: 'Bridgestone RE71 225/50 VR16',
    },
  },

  // VL HDT Calais Director Stroker — 5.643L punched/stroked V8, 231kW
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1987, year_to: 1988,
    engine_code: '345', engine_litres: 5.643, engine_config: 'V8',
    engine_kw: 231, fuel_type: 'ULP',
    trim_code: 'HDT Director Stroker',
    notes: 'HDT Brock VL Calais Director Stroker; 5.643L big-bore stroker 102.4×85.7mm; Opel IRS optional; Momo 8×16',
    specs: {
      engine_description: '345ci 5643cc OHV V8 Rochester Quadrajet Director Stroker (9.2:1)',
      torque_nm: 536,
      compression: '9.2:1',
      bore_stroke_mm: '102.4 x 85.7',
      power_rpm: 5400,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Catalytic converter fitted',
      suspension_rear: 'Live axle Bilstein; optional Opel semi-trailing arm IRS',
      brakes_front: '289mm vented disc',
      brakes_rear: '230mm disc',
      wheels: '8.0×16 HDT Momo 5-spoke alloys',
      tyres: 'Bridgestone RE71 245/45 VR16',
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HDT BROCK COMMODORE VARIANTS ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} (${v.trim_code}) ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  // All records have trim_code — single batch is fine
  const r = await api('/vehicles', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'return=representation' },
    body: JSON.stringify(toInsert),
  });
  if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }

  console.log(`Inserted ${r.length} vehicles:`);
  for (const v of r) {
    console.log(`  ${v.id}  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} (${v.trim_code}) ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
