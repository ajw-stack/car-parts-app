#!/usr/bin/env node
// Patch full technical specs into HR / HG / HJ Holden vehicle records
// Usage: node scripts/patch-holden-hr-hg-hj-specs.js [--dry-run]

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
// HR (1966–1968)
// ─────────────────────────────────────────────────────────────────────────────
const HR = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_sedan: 4600,
    length_mm_station_sedan: 4577,
    width_mm: 1778,
    height_mm_sedan: 1481,
    height_mm_station_sedan: 1486,
    wheelbase_mm: 2692,
    front_track_mm: 1369,
    rear_track_mm: 1394,
  },
  kerb_weight_kg: {
    'Standard Sedan': 1178,
    'Special Sedan': 1183,
    'Premier Sedan': 1217,
    'Standard Station Sedan': 1242,
    'Special Station Sedan': 1250,
    'Premier Station Sedan': 1280,
    'Powerglide add': 18,
  },
  fuel_tank_litres: 53.3,
  turning_circle_m: 11.1,
  suspension_front: 'Short and long arm independent type with coil springs; stabiliser bar; direct acting tubular telescopic shocks',
  suspension_rear: 'Semi-elliptic springs (4 leaves Sedan, 5 leaves Station Sedan); direct acting tubular telescopic shocks',
  steering: 'Recirculating ball type; ratio 16.8:1; optional power assisted steering',
  brakes_front: '229mm (9 inch) hydraulic drums; optional disc brakes',
  brakes_rear: '229mm (9 inch) hydraulic drums',
  wheels: 'Demountable disc wheels',
  tyres: 'Tubeless 6.40x13 four-ply medium low profile; six-ply optional; safety rims',
  ignition: '12 volt; coil and distributor with automatic centrifugal and vacuum type advance',
  exhaust: 'Free flow design manifold; larger diameter exhaust and front tail pipes; X2 engine uses Y-connected exhaust pipes to single entry muffler and resonator',
  transmissions: {
    '3 speed manual':          { '1st': 2.99, '2nd': 1.59, '3rd': 1.00, 'R': 2.99 },
    '4 speed manual':          { '1st': 3.428, '2nd': 2.156, '3rd': 1.366, '4th': 1.000, 'R': 3.317 },
    'Powerglide 2 speed auto': { '1st': 1.82, '2nd': 1.10, 'R': 1.82 },
  },
  rear_axle_ratios: {
    'All combinations': '3.55:1',
  },
  performance: [
    {
      test_config: '186 HR Special Sedan 3 speed manual',
      gear_speeds_km_h: [56, 103, 156],
      '0_97_km_h_s': 12.9,
      quarter_mile_s: 18.5,
    },
    {
      test_config: '186 HR Premier Sedan Powerglide automatic',
      gear_speeds_km_h: [97, 140],
      '0_97_km_h_s': 15.3,
      quarter_mile_s: 19.5,
    },
    {
      test_config: '161 HR Special Sedan 3 speed manual',
      gear_speeds_km_h: [53, 103, 148],
      '0_97_km_h_s': 14.3,
      quarter_mile_s: 19.9,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HG (1970–1971)
// ─────────────────────────────────────────────────────────────────────────────
const HG = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_sedan: 4694,
    width_mm_belmont_kingswood: 1824,
    width_mm_premier: 1821,
    height_mm_sedan: 1412,
    height_mm_wagon: 1438,
    wheelbase_mm: 2819,
    front_track_mm: 1476,
    rear_track_mm: 1476,
  },
  kerb_weight_kg: {
    'Belmont': 1276,
    'Kingswood': 1286,
    'Premier': 1312,
    'Monaro 161': 1315,
    'Monaro GTS 186S 4 spd': 1337,
    'V8 option add': 43,
  },
  fuel_tank_litres: 75.1,
  turning_circle_m: 11.9,
  suspension_front: 'Short and long arm independent type with rubber bushed inner pivots, coil springs, stabiliser bar, direct acting tubular telescopic shocks',
  suspension_rear: 'Semi-elliptic springs (3 leaves Sedan, 6 leaves Station Wagon); direct acting tubular telescopic shocks',
  suspension_options: 'Optional heavy duty front and rear springs; optional Superlift rear shocks (adjustable under load)',
  steering: 'Energy absorbing column; recirculating ball 20:1 on Sedans; optional PA fast ratio 16.7:1',
  brakes_front: '254mm (10.0 inch) hydraulic drums; optional 271.8mm (10.7 inch) PA disc',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  wheels: '14 x 5.00JJ short spoke disc type; optional 6.00JJ rally wheels with radial or D70 tyres; double sided safety rims',
  tyres: 'Tubeless 6.95 x 14 four-ply (6-cyl and V8 sedans); 7.35 L14 4 P/R (V8 Station Wagons); optional whitewalls, red band, radial and premium',
  ignition: '12 volt; coil and distributor',
  exhaust_std: 'Single combined muffler and resonator; heat shield on 186S and V8',
  exhaust_350: 'Twin exhaust and two dual branch tail pipes',
  transmissions: {
    '3 speed manual':        { '1st': 2.48, '2nd': 1.36, '3rd': 1.00 },
    '4 speed Opel':          { '1st': 3.43, '2nd': 2.16, '3rd': 1.37, '4th': 1.00, 'R': 3.32 },
    '4 speed Chev':          { '1st': 2.54, '2nd': 1.80, '3rd': 1.44, '4th': 1.00, 'R': 2.54 },
    'Powerglide 2 speed':    { '1st': 1.76, '2nd': 1.00, 'R': 1.76 },
    'TriMatic 3 speed auto': { '1st': 2.40, '2nd': 1.48, '3rd': 1.00, 'R': 1.92 },
  },
  rear_axle_ratios: {
    '6-cyl 3/4 spd manual':          '3.36:1',
    '253 V8 3/4 spd manual':          '3.08:1',
    '6-cyl automatic':                '3.36:1',
    '253 V8 / 308 V8 automatic':      '2.78:1',
  },
  performance: [
    {
      test_config: '186 HG Kingswood TriMatic automatic',
      gear_speeds_km_h: [72, 121, 164],
      '0_97_km_h_s': 12.7,
      quarter_mile_s: 18.0,
    },
    {
      test_config: '253 V8 HG Kingswood TriMatic automatic',
      gear_speeds_km_h: [77, 132, 164],
      '0_97_km_h_s': 10.2,
      quarter_mile_s: 18.0,
    },
    {
      test_config: '350 V8 HG Monaro GTS 4 speed manual',
      gear_speeds_km_h: [88, 127, 159, 208],
      '0_97_km_h_s': 7.5,
      quarter_mile_s: 16.0,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HJ (1974–1976)
// ─────────────────────────────────────────────────────────────────────────────
const HJ = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_belmont_kingswood_gts_sedan: 4839,
    length_mm_premier_monaro_ls_gts_coupe: 4851,
    length_mm_belmont_kingswood_wagon: 4890,
    length_mm_premier_wagon: 4902,
    length_mm_statesman_deville_caprice: 5029,
    width_mm_belmont_gts_sedan: 1875,
    width_mm_kingswood_premier_sedan: 1882,
    width_mm_monaro_ls: 1885,
    width_mm_monaro_gts_coupe: 1877,
    width_mm_statesman: 1880,
    height_mm_belmont_sedan: 1379,
    height_mm_kingswood_sedan: 1374,
    height_mm_premier_sedan: 1382,
    height_mm_monaro_gts_sedan: 1367,
    height_mm_monaro_ls_coupe: 1369,
    height_mm_monaro_gts_coupe: 1354,
    height_mm_belmont_kingswood_wagon: 1405,
    height_mm_premier_wagon: 1400,
    height_mm_statesman: 1379,
    wheelbase_mm_sedan_monaro: 2819,
    wheelbase_mm_wagon_statesman: 2896,
    front_track_mm_std: 1529,
    front_track_mm_monaro_gts: 1537,
    rear_track_mm_std: 1529,
    rear_track_mm_monaro_gts: 1537,
  },
  kerb_weight_kg: {
    'Belmont Sedan': 1325,
    'Kingswood Sedan': 1345,
    'Premier Sedan': 1388,
    'Monaro Sedan': 1438,
    'Monaro LS Coupe': 1389,
    'Monaro GTS': 1442,
    'Belmont Station Wagon': 1415,
    'Kingswood Station Wagon': 1429,
    'Premier Station Wagon': 1469,
    'V8 option add': 41,
  },
  fuel_tank_litres: 72.7,
  turning_circle_m_sedan: 11.9,
  turning_circle_m_wagon: 12.2,
  suspension_front: 'Independent SLA type; coil springs; stabiliser bar; direct acting tubular telescopic shocks',
  suspension_rear: 'Live axle; four link system with coil springs; direct acting shocks',
  steering: 'Energy absorbing column; recirculating ball 20:1; optional 16:1; optional PA variable ratio 17.5:1 (centre) to 11.0:1 (lock)',
  steering_note: 'Std 2-spoke oval wheel; GTS 3-spoke circular wheel',
  brakes_front: '276mm (10.9 inch) power assisted ventilated disc — all models except Belmont and commercials',
  brakes_front_belmont: '254mm (10.0 inch) hydraulic drums',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  wheels_std: '5.00JJ x 14 short spoke steel disc',
  wheels_gts: '6.00JJ x 14 five-spoke pressed steel slotted rally',
  tyres: {
    'Belmont': '6.95 L14 4 P/R',
    'Kingswood': 'C78 L14 4 P/R',
    'Premier / Monaro LS': 'E78 L14 4 P/R',
    'Monaro GTS': 'ER14 radial',
    'Station Wagons': 'E78 L14 4 P/R',
  },
  ignition: '12 volt; 35A alternator; pre-engaged drive starter motor; coil and distributor',
  exhaust_std: 'Single exhaust pipe',
  exhaust_v8: 'Dual exhaust on V8 models',
  transmissions: {
    '3 speed 6-cyl manual':              { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 speed 253 V8 manual':             { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 speed 308 V8 floor shift manual': { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    'TriMatic 3 speed auto (6-cyl/253)': { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    'TurboHydramatic 400 (308 V8)':      { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
  },
  rear_axle_ratios: {
    '173 2.85L 6-cyl 3 spd manual std':         '3.55:1',
    '173 2.85L 6-cyl 3 spd manual perf':         '3.90:1',
    '173 2.85L 6-cyl 3 spd manual econ':         '3.36:1',
    '173 2.85L 6-cyl wide-ratio manual std':     '3.55:1',
    '173 2.85L 6-cyl TriMatic std':              '3.08:1',
    '173 2.85L 6-cyl TriMatic perf':             '3.55:1',
    '202 3.3L 6-cyl 3/4 spd manual std':         '3.55:1',
    '202 3.3L 6-cyl 3/4 spd manual econ':        '3.36:1',
    '202 3.3L 6-cyl TriMatic std':               '3.08:1',
    '202 3.3L 6-cyl TriMatic perf':              '3.55:1',
    '253 4.2L V8 3/4 spd manual std':            '3.08:1',
    '253 4.2L V8 3/4 spd manual perf':           '3.36:1',
    '253 V8 TriMatic std':                       '2.78:1',
    '253 V8 TriMatic perf':                      '3.08:1',
    '308 5.0L V8 HP 4 spd manual std':           '3.36:1',
    '308 5.0L V8 HP 4 spd manual perf':          '3.55:1',
    '308 5.0L V8 HP 4 spd manual econ':          '3.08:1',
    '308 5.0L V8 TH400 auto (excl GTS) std':     '2.78:1',
    '308 5.0L V8 TH400 auto (excl GTS) perf':   '3.08:1',
    '308 5.0L V8 TH400 auto GTS std':            '3.08:1',
    '308 5.0L V8 TH400 auto GTS econ':           '2.78:1',
  },
  performance: [
    {
      test_config: '202 HJ Kingswood Station Wagon 3 speed manual',
      gear_speeds_km_h: [57, 100],
      '0_100_km_h_s': 14.6,
      quarter_mile_s: 21.5,
    },
    {
      test_config: '202 HJ Kingswood TriMatic automatic',
      gear_speeds_km_h: [65, 103, 142],
      '0_100_km_h_s': 11.2,
      quarter_mile_s: 19.2,
    },
    {
      test_config: '253 HJ Premier TriMatic automatic',
      gear_speeds_km_h: [90, 134],
      '0_100_km_h_s': 14.4,
      quarter_mile_s: 19.3,
    },
    {
      test_config: '308 V8 HJ Monaro GTS 4-door TriMatic automatic',
      gear_speeds_km_h: [90, 147, 182],
      '0_100_km_h_s': 10.4,
      quarter_mile_s: 18.1,
    },
    {
      test_config: '308 V8 Statesman Caprice TriMatic automatic',
      gear_speeds_km_h: [77, 132, 182],
      '0_100_km_h_s': 13.4,
      quarter_mile_s: 17.9,
    },
    {
      test_config: '308 V8 Statesman Caprice TurboHydramatic automatic',
      gear_speeds_km_h: [90, 150, 180],
      '0_100_km_h_s': 11.2,
      quarter_mile_s: 17.6,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function patchSeries(series, specsDef) {
  const records = await api(
    `/vehicles?make=eq.Holden&series=eq.${series}&select=id,model,engine_code,trim_code,engine_kw,specs`
  );
  console.log(`\n${series}: ${records.length} records`);

  for (const rec of records) {
    const merged = { ...(rec.specs ?? {}), ...specsDef };

    if (DRY_RUN) {
      const keys = Object.keys(specsDef).join(', ');
      console.log(`  ${rec.id}  ${rec.model ?? ''} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW — adding: ${keys.substring(0, 100)}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  ${rec.model ?? ''} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN HR/HG/HJ FULL SPECS ===');
  await patchSeries('HR', HR);
  await patchSeries('HG', HG);
  await patchSeries('HJ', HJ);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
