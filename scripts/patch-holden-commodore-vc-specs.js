#!/usr/bin/env node
// Patch full technical specs into VC Commodore vehicle records
// Usage: node scripts/patch-holden-commodore-vc-specs.js [--dry-run]

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

// ─────────────────────────────────────────────────────────────────────────────
// VC COMMODORE (1980–1981)
// ─────────────────────────────────────────────────────────────────────────────
const VC = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions: {
      length_mm: 4706,
      length_mm_sle: 4730,
      width_mm: 1722,
      width_mm_sle: 1736,
      height_mm: 1379,
      height_mm_sl: 1375,
      height_mm_sle: 1368,
      wheelbase_mm: 2668,
      front_track_mm: 1451,
      front_track_mm_sle: 1449,
      rear_track_mm: 1416,
      rear_track_mm_sle: 1422,
    },
    kerb_weight_kg: {
      'Commodore L 4': 1158,
      'Commodore SL 4': 1192,
      'Commodore L 6': 1218,
      'Commodore SL 6': 1262,
      'Commodore SL/E 6': 1348,
    },
    fuel_tank_litres: 63,
    turning_circle_m: 10.2,
    turning_circle_m_sle: 10.7,
    suspension_front: "Independent MacPherson 'wet' strut design; linear rate springs; 24mm stabiliser bar (26mm on wagons)",
    suspension_rear: 'Salisbury type rear axle; rigid axle; 4 trailing arms and panhard rod; progressive rate coil springs; twin-tube telescopic shocks; 14mm decoupled stabiliser bar L6; 19mm V8 with A/C; no stabiliser bar on L4',
    brakes_front: '268mm vented disc — single piston sliding head lightweight caliper',
    brakes_rear_std: '229mm self-adjusting leading trailing shoe drum',
    brakes_rear_sle: '274mm solid disc — lightweight caliper',
    steering: 'Coaxial rack and pinion; direct linkage rear of front wheels; ratio 19.9:1; power hydraulic assist standard on SL/E and all V8; optional on L6 SL',
    ignition_l4: '12V negative ground; 48 A/H 7 plate; 4-contact breaker ignition; TVRS neoprene 7mm leads',
    ignition_l6_v8: '12V negative ground; 48 A/H 7 plate (L6); 61 A/H 9 plate (V8); high energy breakerless ignition; 8mm silicone insulated fibreglass core leads',
    ignition_note: '14V 40A alternator standard; 13.5V 55A for 5.0L V8 and all A/C',
    exhaust_l4: 'Cast iron manifold; single exhaust with reverse flow forward muffler and straight-through rear muffler',
    exhaust_l6: 'Cast iron manifold; single seam welded steel exhaust; 2 reverse flow mufflers',
    exhaust_v8: 'Dual cast iron manifolds; single crossover pipe; single seam welded steel exhaust; 2 reverse flow mufflers; optional dual pipes with 3 mufflers',
  },
  variants: {
    '1900 Starfire': {
      wheels: '5.5JJ x 13 pressed steel',
      tyres: 'BR78S13 steel belted radials',
      transmissions: {
        '4 spd MC6 L4 Sedan': { '1st': 3.51, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.57 },
        '4 spd MC6 L4 Wagon': { '1st': 3.75, '2nd': 2.16, '3rd': 1.38, '4th': 1.00, 'R': 3.82 },
        '3 spd M40 auto':     { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '1.9 L4 4 spd manual': '3.90:1',
        '1.9 L4 3 spd auto':   '3.90:1',
      },
      performance: [
        {
          test_config: 'Commodore SL 1.9 L4 automatic',
          gear_speeds_km_h: [70, 105, 140],
          '0_100_km_h_s': 17.5,
          quarter_mile_s: 21.0,
        },
      ],
    },
    '161': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78S14 4P/R steel belted radials',
      transmissions: {
        '4 spd M20 L6':    { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40 L6': { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '2.85 L6 4 spd manual': '3.55:1',
      },
    },
    '202': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78S14 4P/R steel belted radials',
      wheels_sle: 'Styled cast alloy 6.00JJ x 15',
      tyres_sle: 'BR60 H15 6P/R steel belted radials',
      transmissions: {
        '4 spd M20 L6':    { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40 L6': { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '3.3 L6 4 spd manual':    '3.36:1 (LSD optional)',
        '3.3 L6 TriMatic M40':    '3.08:1 / 3.36:1 (LSD)',
      },
      performance: [
        {
          test_config: 'Commodore SL 3.3 L6 manual',
          gear_speeds_km_h: [60, 83, 121, 166],
          '0_100_km_h_s': 12.2,
          quarter_mile_s: 18.2,
        },
        {
          test_config: 'Commodore L 3.3 L6 automatic',
          gear_speeds_km_h: [88, 139, 170],
          '0_100_km_h_s': 13.0,
          quarter_mile_s: 18.4,
        },
      ],
    },
    '253': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78H14 6P/R steel belted radials',
      transmissions: {
        '4 spd M20 4.2 V8': { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40 V8':  { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '4.2 V8 TriMatic M40':  '2.78:1 / 3.08:1 (LSD)',
        '4.2 V8 4 spd M20':    '3.08:1 / 3.36:1 (LSD)',
      },
    },
    '308': {
      wheels_std: '6.00JJ x 14 ventilated pressed steel',
      wheels_sle: 'Styled cast alloy 6.00JJ x 15',
      tyres_std: 'CR78H14 6P/R steel belted radials',
      tyres_sle: 'BR60 H15 6P/R steel belted radials',
      transmissions: {
        '4 spd M21 5.0 V8':      { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
        'TurboHydramatic M41 V8':{ '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
      },
      rear_axle_ratios: {
        '5.0 V8 M38 auto':     '2.60:1 / 3.08:1 (LSD)',
        '5.0 V8 4 spd M21':    '3.36:1',
      },
      performance: [
        {
          test_config: 'Commodore L 5.0 V8 manual',
          gear_speeds_km_h: [57, 80, 116, 157],
          '0_100_km_h_s': 12.8,
          quarter_mile_s: 18.4,
        },
        {
          test_config: 'Commodore SL/E 5.0 V8 automatic',
          gear_speeds_km_h: [78, 130, 172],
          '0_100_km_h_s': 10.4,
          quarter_mile_s: 17.1,
        },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN VC COMMODORE FULL SPECS ===');

  const records = await api(
    '/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VC&select=id,engine_code,trim_code,engine_kw,specs'
  );
  console.log(`VC: ${records.length} records`);

  for (const rec of records) {
    const ec = rec.engine_code ?? '';

    const patch = { ...VC.common };
    const variantKey = Object.keys(VC.variants).find(k => ec.includes(k));
    if (variantKey) {
      Object.assign(patch, VC.variants[variantKey]);
    }

    const merged = { ...(rec.specs ?? {}), ...patch };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  VC ${ec} ${rec.engine_kw ?? ''}kW — variant: ${variantKey ?? '(none)'}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  VC ${ec} ${rec.engine_kw ?? ''}kW`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
