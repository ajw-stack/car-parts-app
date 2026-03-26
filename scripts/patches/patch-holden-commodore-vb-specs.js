#!/usr/bin/env node
// Patch full technical specs into VB Commodore vehicle records
// Usage: node scripts/patch-holden-commodore-vb-specs.js [--dry-run]

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
// VB COMMODORE (1978–1980)
// Common specs apply to all variants; variant-specific for wheels/tyres/transmissions
// ─────────────────────────────────────────────────────────────────────────────
const VB = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions: {
      length_mm: 4705,
      length_mm_sle: 4729,
      width_mm: 1722,
      height_mm: 1371,
      wheelbase_mm: 2668,
      front_track_mm: 1451,
      front_track_mm_sle: 1449,
      rear_track_mm: 1417,
      rear_track_mm_sle: 1422,
    },
    kerb_weight_kg: {
      'Commodore': 1220,
      'Commodore SL': 1255,
      'Commodore SL/E': 1400,
    },
    fuel_tank_litres: 63,
    turning_circle_m: 10.2,
    turning_circle_m_sle: 10.8,
    suspension_front: "Independent MacPherson 'wet' strut design; linear rate springs; 22mm stabiliser bar",
    suspension_rear: "Salisbury type rear axle; rigid axle 5-link with parallel short upper and long lower trailing arms and panhard rod; progressive rate coil springs; vertically mounted telescopic shocks; 18mm decoupled stabiliser bar on axle",
    brakes_front: '268mm vented disc — single piston sliding head lightweight caliper',
    brakes_rear_std: '230mm self-adjusting leading trailing shoe drum',
    brakes_rear_sle: '274mm solid disc — lightweight caliper',
    steering: 'Coaxial rack and pinion; direct linkage rear of front wheels; ratio 19.8:1; power hydraulic assist standard on SL/E; optional on SL',
    ignition_l6: '12V negative ground; 48 A/H 7 plate battery; 14V alternator with integral voltage regulator',
    ignition_253: '12V negative ground; 61 A/H 9 plate battery; 14V alternator',
    ignition_308: '12V negative ground; 62 A/H 11 plate battery; 13.5V 55A alternator (also all air-con); pre-engage solenoid starter',
    exhaust_l6: 'Cast iron manifold; single seam welded steel exhaust and tail pipe; 2 reverse flow mufflers',
    exhaust_v8: 'Dual cast iron manifolds; single crossover pipe; single seam welded steel exhaust and tail pipe; 2 reverse flow mufflers; optional dual pipes with 3 mufflers',
  },
  variants: {
    '161': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78 14 4P/R steel belted radials',
      transmissions: {
        '4 speed MC6 L6':   { '1st': 3.50, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.57 },
        '4 speed M20 L6':   { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40':     { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '2.85 L6 4 spd MC6': '3.36:1',
        '2.85 L6 4 spd M20': '3.36:1',
        '3.30 L6 4 spd MC6/M20': '3.08:1 / 3.36:1',
        '3.30 L6 TriMatic': '2.78:1 / 3.08:1 / 3.36:1',
      },
    },
    '202': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78 14 4P/R steel belted radials',
      transmissions: {
        '4 speed MC6 L6':   { '1st': 3.50, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.57 },
        '4 speed M20 L6':   { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40':     { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '3.30 L6 4 spd MC6/M20': '3.08:1 / 3.36:1',
        '3.30 L6 TriMatic': '2.78:1 / 3.08:1 / 3.36:1',
      },
    },
    '253': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR70 H14 6P/R steel belted radials',
      transmissions: {
        '4 speed M20 4.2 V8': { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'TriMatic M40 V8':    { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: {
        '4.2 V8 TriMatic': '2.78:1 / 3.08:1 / 3.36:1',
        '4.2 V8 4 spd M20': '3.08:1',
      },
      performance: [
        {
          test_config: '4.2 V8 87kW SL 4 speed manual',
          gear_speeds_km_h: [70, 100, 142, 175],
          '0_100_km_h_s': 10.3,
          quarter_mile_s: 17.5,
        },
        {
          test_config: '4.2 V8 87kW SL/E TriMatic 3 speed',
          gear_speeds_km_h: [97, 153, 171],
          '0_100_km_h_s': 13.4,
          quarter_mile_s: 18.3,
        },
      ],
    },
    '308': {
      wheels_std: '6.00JJ x 14 ventilated pressed steel',
      wheels_sle: 'Styled cast alloy 6.00JJ x 15',
      tyres_std: 'CR70 H14 6P/R steel belted radials',
      tyres_sle: 'BR60 H15 6P/R steel belted radial',
      transmissions: {
        '4 speed M21 5.0 V8': { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
        'TurboHydramatic 350 M41': { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
      },
      rear_axle_ratios: {
        '5.0 V8 TH350 auto': '2.60:1 / 3.08:1',
        '5.0 V8 4 spd M21':  '3.08:1 / 3.36:1',
      },
      performance: [
        {
          test_config: '5.0 V8 125kW SL/E 4 speed manual',
          gear_speeds_km_h: [79, 110, 146, 200],
          '0_100_km_h_s': 9.0,
          quarter_mile_s: 16.4,
        },
        {
          test_config: '5.0 V8 125kW SL/E TriMatic 3 speed',
          gear_speeds_km_h: [85, 140, 190],
          '0_100_km_h_s': 10.2,
          quarter_mile_s: 17.6,
        },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN VB COMMODORE FULL SPECS ===');

  const records = await api(
    '/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VB&select=id,engine_code,trim_code,engine_kw,specs'
  );
  console.log(`\nVB: ${records.length} records`);

  for (const rec of records) {
    const ec = rec.engine_code ?? '';

    // Build patch: common + variant-specific
    const patch = { ...VB.common };
    const variantKey = Object.keys(VB.variants).find(k => ec.includes(k)) ?? ec;
    if (VB.variants[variantKey]) {
      Object.assign(patch, VB.variants[variantKey]);
    }

    const merged = { ...(rec.specs ?? {}), ...patch };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  VB ${ec} ${rec.engine_kw ?? ''}kW — variant: ${variantKey}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  VB ${ec} ${rec.engine_kw ?? ''}kW`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
