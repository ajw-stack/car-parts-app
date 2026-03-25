#!/usr/bin/env node
// Patch full technical specs into LJ and UC Torana vehicle records
// Usage: node scripts/patch-holden-torana-lj-uc-specs.js [--dry-run]

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
// LJ Torana (1972–1974 / TA 1975)
// ─────────────────────────────────────────────────────────────────────────────
const LJ_common = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_4cyl: 4120,
    length_mm_6cyl: 4387,
    width_mm: 1544,
    height_mm_std: 1354,
    height_mm_gtr: 1436,
    wheelbase_mm_4cyl: 2433,
    wheelbase_mm_6cyl: 2540,
    front_track_mm_4cyl: 1303,
    front_track_mm_6cyl: 1316,
    front_track_mm_gtr: 1326,
    rear_track_mm_4cyl: 1295,
    rear_track_mm_6cyl: 1290,
    rear_track_mm_gtr: 1301,
  },
  kerb_weight_kg: {
    '4-cyl 2 door': 856,
    '4-cyl 4 door': 878,
    '6-cyl 2 door': 1042,
    '6-cyl 4 door': 1061,
    'GTR / GTR XU-1': 1100,
  },
  fuel_tank_litres_4cyl: 36.4,
  fuel_tank_litres_6cyl: 46.0,
  fuel_tank_litres_xu1: 77.0,
  suspension_front: 'Independent short and long arm type with coil springs and rubber bump stops; one piece stabiliser bar on GTR; hydraulic double acting telescopic shocks',
  suspension_rear: 'Four link type with rubber-bushed suspension arms and coil springs; hydraulic double acting telescopic shocks',
  suspension_note: 'Spring rates revised for XU-1 1972 Bathurst',
  steering: 'Rack and pinion',
  brakes: {
    '1200 4-cyl front': '203mm (8.0 inch) drums standard; 213.4mm (8.4 inch) discs optional',
    '1200 4-cyl rear': '203mm (8.0 inch) drums',
    '1300/1600 4-cyl front': '213.4mm (8.4 inch) discs standard',
    '1300/1600 4-cyl rear': '203mm (8.0 inch) drums',
    '6-cyl (excl GTR) front': '213.4mm (8.4 inch) discs standard',
    '6-cyl (excl GTR) rear': '229mm (9.0 inch) drums',
    'GTR / GTR XU-1 front': '254mm (10.0 inch) discs standard (dust shields removed on XU-1)',
    'GTR / GTR XU-1 rear': '229mm (9.0 inch) drums',
  },
  wheels: {
    '4-cyl': '4.00J x 12',
    '6-cyl': '4.50JJ x 13',
    'GTR / GTR XU-1': '5.50JJ x 13',
    'GTR XU-1 1972 Bathurst': '6x13 alloy Globe Sprintmaster',
  },
  tyres: {
    'Torana 1200': 'Tubeless 5.50x12 crossplies',
    'Torana 1300/1600': 'Tubeless 6.20L12 crossplies',
    '6-cyl (excl GTR)': 'Tubeless A78L13 crossplies',
    'GTR / GTR XU-1': 'Tubeless B70H13 red band crossplies',
  },
  ignition: '12 volt; 40 amp alternator (4-cyl), 48 amp (6-cyl), 44 amp (GTR XU-1); coil and distributor',
  exhaust_std: 'Cast iron manifold and single exhaust',
  exhaust_xu1: 'Twin manifolds, two inch system and sports muffler',
  exhaust_xu1_bathurst: 'Modified exhaust pipes and muffler',
  transmissions: {
    '4 speed 1200/1300 manual': { '1st': 3.46, '2nd': 2.21, '3rd': 1.40, '4th': 1.00, 'R': 3.71 },
    '4 speed 1600 manual':      { '1st': 2.78, '2nd': 1.98, '3rd': 1.41, '4th': 1.00, 'R': 3.06 },
    '3 speed 6-cyl manual':     { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 speed 6-cyl manual':     { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 speed M21 GTR/XU-1':     { '1st': 2.54, '2nd': 1.83, '3rd': 1.25, '4th': 1.00, 'R': 2.54 },
    'TriMatic 3 speed auto':    { '1st': 2.40, '2nd': 1.48, '3rd': 1.00, 'R': 1.92 },
  },
  transmission_note_xu1_bathurst_1973: 'M21 ratios: 2.54/2.54/2.32 (1st), 1.83/1.83/1.65 (2nd), 1.25/1.38/1.25 (3rd), 1.00 (4th)',
  rear_axle_ratios: {
    '1200cc engine': '3.89:1',
    'Series 70 and 1600': '4.125:1',
    'Manual S/SL/GTR': '3.08:1',
    'TriMatic S/SL': '2.78:1',
    'XU-1': '3.36:1 (3.08:1 optional)',
    'LSD': 'Standard on XU-1; optional on all other models',
  },
  performance: [
    {
      test_config: '1600 OHC 4-cyl 4 speed manual',
      gear_speeds_km_h: [55, 79, 113, 137],
      '0_100_km_h_s': 17.4,
      quarter_mile_s: 20.5,
    },
    {
      test_config: '202ci 3.3L 6-cyl GTR XU-1 4 speed manual',
      gear_speeds_km_h: [89, 116, 158, 194],
      '0_100_km_h_s': 8.4,
      quarter_mile_s: 15.8,
    },
  ],
};

// LJ variant-specific specs (keyed by engine_kw to differentiate where needed)
const LJ_variants = {
  // 4-cylinder models share same common specs above
  // 6-cylinder / GTR XU-1 same — all common specs capture the differences
};

// ─────────────────────────────────────────────────────────────────────────────
// UC Torana (1978–1980)
// ─────────────────────────────────────────────────────────────────────────────
const UC_common = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm: 4515,
    width_mm: 1704,
    height_mm: 1339,
    wheelbase_mm: 2586,
    front_track_mm: 1415,
    rear_track_mm: 1382,
  },
  kerb_weight_kg: 1157,
  turning_circle_m: 11.0,
  fuel_tank_litres_sedan: 55.0,
  fuel_tank_litres_hatch: 52.5,
  suspension_front: 'Wishbone and swivel A-type, coil springs, direct acting shock absorbers; RTS with stabiliser bar',
  suspension_rear: 'Four link type with rubber-bushed arms and coil springs; hydraulic double acting telescopic shocks; live rear axle; stabiliser bar',
  steering: 'Rack and pinion; ratio 20.4:1',
  brakes: {
    'S model front': 'Drums',
    'SL and SL/R front': '254mm discs',
    'A9X option front': '254mm discs',
    'All models rear': '228mm drums',
    'A9X option rear': '293mm discs',
  },
  wheels: '4.50JJ x 13 full circle vented disc wheels',
  tyres: {
    'S/SL 4-cyl': 'A78L13 4 P/R',
    'SL 6-cyl': 'B78L13 4 P/R',
  },
  ignition: '4-cyl: 12V 33 amp alternator; 6-cyl: 12V 35 amp alternator; coil and distributor',
  exhaust: 'Cast iron manifold and single exhaust',
  transmissions: {
    '4 speed 1900 manual':         { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.90 },
    '3 speed 2850/3300 manual':    { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 speed 3300 manual':         { '1st': 3.05, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.05 },
    '3 speed auto (all engines)':  { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
  },
  rear_axle_ratios: {
    '1900 manual': '3.90:1',
    '1900 auto':   '3.55:1',
    '2850 manual': '3.36:1',
    '2850 auto':   '2.78:1',
    '3300 manual': '3.08:1',
    '3300 auto':   '2.78:1',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function patchSeries(make, model, series, specsDef) {
  const url = model
    ? `/vehicles?make=eq.${make}&model=eq.${encodeURIComponent(model)}&series=eq.${series}&select=id,engine_code,trim_code,engine_kw,specs`
    : `/vehicles?make=eq.${make}&series=eq.${series}&select=id,engine_code,trim_code,engine_kw,specs`;
  const records = await api(url);
  console.log(`\n${series}: ${records.length} records`);

  for (const rec of records) {
    const merged = { ...(rec.specs ?? {}), ...specsDef };

    if (DRY_RUN) {
      const keys = Object.keys(specsDef).join(', ');
      console.log(`  ${rec.id}  ${series} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW — adding: ${keys.substring(0, 100)}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  ${series} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN TORANA LJ/UC FULL SPECS ===');
  await patchSeries('Holden', 'Torana', 'LJ', LJ_common);
  await patchSeries('Holden', 'Torana', 'UC', UC_common);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
