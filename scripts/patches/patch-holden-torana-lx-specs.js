#!/usr/bin/env node
// Patch full technical specs into LX Torana vehicle records
// Usage: node scripts/patch-holden-torana-lx-specs.js [--dry-run]

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

// ─────────────────────────────────────────────────────────────────────────────
// LX TORANA (1976–1978)
// ─────────────────────────────────────────────────────────────────────────────
const LX = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions_sedan: {
      length_mm: 4509,
      width_mm: 1704,
      height_mm: 1331,
      wheelbase_mm: 2586,
      front_track_mm: 1400,
      rear_track_mm: 1372,
    },
    dimensions_hatch: {
      length_mm: 4509,
      width_mm: 1704,
      height_mm: 1326,
      wheelbase_mm: 2586,
      front_track_mm: 1400,
      rear_track_mm: 1372,
    },
    kerb_weight_kg: '1143 to 1183kg',
    turning_circle_m: 11.0,
    fuel_tank_litres_sedan: 55.0,
    fuel_tank_litres_hatch: 52.5,
    suspension_front: 'Wishbone and swivel A-type; coil springs; direct acting shock absorbers; SL/R and SS fitted with stabiliser bar. From April 1977 (RTS): relocated arms; RTS geometry; uprated coil springs; stabiliser bar all models',
    suspension_rear: 'Four link type; rubber-bushed arms; coil springs; hydraulic double acting telescopic shocks; live rear axle; stabiliser bar on SL/R and V8 models. From April 1977 (RTS): uprated springs and shocks; stabiliser bar all models',
    steering: 'Rack and pinion; ratio 18.0:1 (pre-April 1977); 20.4:1 after April 1977 RTS introduction',
    brakes: {
      'S model front': 'Drums',
      'SL and SL/R front': '254mm discs',
      'A9X option front': '254mm discs',
      'All models rear': '228mm drums',
      'A9X option rear': '293mm discs',
    },
    wheels: {
      'S and SL': '4.50JJ x 13 full circle vented disc',
      'SL/R and SS': '5.50JJ x 13 full circle vented disc',
    },
    tyres: {
      'S/SL 4-cyl': 'A78L13 4 P/R',
      'SL 6-cyl': 'B78L13 4 P/R',
      'SL/R and SS': '175SR13 radials',
      'Note': 'Radials fitted to all models from April 1977 with introduction of RTS',
    },
    ignition: '4-cyl: 12V 33A alternator; 6-cyl/V8: 12V 35A alternator; coil and distributor',
    exhaust_std: 'Cast iron manifold and single exhaust',
    exhaust_slr_ss: 'Dual exhaust pipes on SS Hatch and SL/R 5000',
    transmissions: {
      '4 spd 1900 manual':          { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.90 },
      '3 spd 1900/2850/3300 auto':  { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      '3 spd 2850/3300 manual':     { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
      '4 spd 3300 manual':          { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
      '4 spd 253 V8 manual':        { '1st': 2.54, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
      '4 spd 5000 manual':          { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
      '3 spd 4.2/5.0 auto':         { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    },
    rear_axle_ratios: {
      '1900 manual':        '3.90:1',
      '1900 auto':          '3.55:1',
      '2850 manual':        '3.36:1',
      '2850 auto':          '2.78:1',
      '3300 manual':        '3.08:1',
      '3300 auto':          '2.78:1',
      '4.2 and 5.0 manual': '2.78:1',
      '4.2 and 5.0 auto':   '2.78:1',
      'Note':               'Other ratios available as options; 2.60:1 with T10 4-spd available on A9X option',
    },
    performance: [
      {
        test_config: '4.2L V8 Hatchback 3 speed automatic',
        gear_speeds_km_h: [88, 138, 165],
        '0_100_km_h_s': 11.6,
        quarter_mile_s: 18.1,
      },
      {
        test_config: 'SS 5000 Hatchback 4 speed manual',
        gear_speeds_km_h: [85, 117, 156, 188],
        '0_100_km_h_s': 7.8,
        quarter_mile_s: 15.6,
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH LX TORANA FULL SPECS ===');

  const records = await api(
    '/vehicles?make=eq.Holden&model=eq.Torana&series=eq.LX&select=id,engine_code,trim_code,engine_kw,specs'
  );
  console.log(`LX: ${records.length} records`);

  for (const rec of records) {
    const merged = { ...(rec.specs ?? {}), ...LX.common };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  LX ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  LX ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
