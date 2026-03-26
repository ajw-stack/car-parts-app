#!/usr/bin/env node
// Patch full technical specs into HK / HT / HQ Holden vehicle records
// Usage: node scripts/patch-holden-hk-ht-hq-specs.js [--dry-run]

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
// HK (1968–1969)
// ─────────────────────────────────────────────────────────────────────────────
const HK = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_sedan: 4694,
    width_mm: 1814,
    height_mm_sedan: 1412,
    height_mm_wagon: 1435,
    wheelbase_mm: 2819,
    front_track_mm: 1451,
    rear_track_mm: 1451,
  },
  fuel_tank_litres: 75.1,
  turning_circle_m: 11.1,
  suspension_front: 'Short and long arm independent type with coil springs; stabiliser bar; direct acting tubular telescopic shocks',
  suspension_rear: 'Semi-elliptic springs (5 leaves Sedan, 6 leaves Station Wagon); direct acting tubular telescopic shocks',
  suspension_options: 'Optional heavy duty front and rear springs; optional Superlift rear shocks (adjustable under load)',
  brakes_front: '254mm (10.0 inch) hydraulic drums; optional 271.8mm (10.7 inch) power assisted disc brakes',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  steering: 'Energy absorbing column; recirculating ball 20:1; optional fast ratio 16.7:1; power assistance mandatory on V8 with fast ratio',
  wheels: '14 x 5.00J short spoke disc type; double sided safety rims',
  tyres: 'Tubeless 6.95x14 four-ply low profile; optional whitewalls, redwalls, radial and nylon cord six-ply',
  ignition: '12 volt; coil and distributor with integral centrifugal and vacuum type advance',
  exhaust_std: 'Single combined muffler and resonator; heat shield on 186S and V8',
  exhaust_307: 'Reverse flow type using double skin shell aluminised muffler with resonant chamber and asbestos insulator',
  exhaust_327: 'Dual exhaust using dual reverse flow resonators; single muffler with dual inlets/outlets; twin tail pipes with dual branch chrome outlets',
  transmissions: {
    '3 speed Holden standard':    { '1st': 2.99, '2nd': 1.59, '3rd': 1.00, 'R': 2.99 },
    '3 speed M15 L-6':            { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '3 speed M15 V8':             { '1st': 2.48, '2nd': 1.36, '3rd': 1.00, 'R': 2.90 },
    '4 speed Opel':               { '1st': 3.43, '2nd': 2.16, '3rd': 1.37, '4th': 1.00, 'R': 3.32 },
    '4 speed Chev M21':           { '1st': 2.54, '2nd': 1.80, '3rd': 1.44, '4th': 1.00, 'R': 2.54 },
    '4 speed Chev M22':           { '1st': 2.85, '2nd': 2.02, '3rd': 1.35, '4th': 1.00, 'R': 2.85 },
    'Powerglide 2 speed':         { '1st': 1.82, '2nd': 1.00, 'R': 1.82 },
  },
  rear_axle_ratios: {
    'Manual transmission':                       '3.55:1',
    'Six cylinder automatic':                    '3.36:1',
    'V8 automatic':                              '2.78:1',
    'Monaro GTS 327 4 spd manual':               '3.36:1',
    'Monaro GTS 186S 4 spd manual':              '3.36:1',
    'Monaro GTS 186S 4 spd manual HP':           '3.55:1',
    'Monaro GTS 186S Powerglide':                '3.36:1',
    'Monaro GTS 5L 4 spd manual HP':             '3.36:1',
    'Monaro GTS 5L Powerglide':                  '3.36:1',
    'Monaro 161 3 spd manual':                   '3.55:1',
    'Monaro 161 4 spd manual':                   '3.36:1',
    'Monaro 186 3 spd manual':                   '3.55:1',
    'Monaro 186 4 spd manual':                   '3.36:1',
    'Monaro 186 Powerglide':                     '3.36:1',
    'Monaro 186S 3 spd manual':                  '3.55:1',
    'Monaro 186S 4 spd manual':                  '3.36:1',
    'Monaro 186S Powerglide':                    '3.36:1',
    'Monaro 5.0L V8 4 spd HP manual':            '3.36:1',
    'Monaro 5.0L V8 Powerglide':                 '2.78:1',
  },
  performance: [
    {
      test_config: '307 HK Monaro GTS V8 Powerglide automatic',
      gear_speeds_km_h: [121, 174],
      '0_97_km_h_s': 9.5,
      quarter_mile_s: 18.3,
    },
    {
      test_config: '186 HK Premier Sedan Powerglide automatic',
      gear_speeds_km_h: [89, 138],
      '0_97_km_h_s': 15.9,
      quarter_mile_s: 20.3,
    },
    {
      test_config: '307 HK Brougham V8 Powerglide automatic',
      '0_97_km_h_s': 9.8,
      quarter_mile_s: 18.5,
    },
    {
      test_config: '327 HK Monaro GTS V8 4 speed manual',
      gear_speeds_km_h: [72, 109, 134, 185],
      '0_97_km_h_s': 7.6,
      quarter_mile_s: 16.4,
    },
    {
      test_config: '186S HK Monaro GTS 4 speed manual',
      gear_speeds_km_h: [64, 89, 126, 159],
      '0_97_km_h_s': 8.2,
      quarter_mile_s: 19.1,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HT (1969–1970)
// ─────────────────────────────────────────────────────────────────────────────
const HT = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_sedan: 4694,
    width_mm: 1824,
    height_mm_sedan: 1412,
    height_mm_wagon: 1435,
    wheelbase_mm: 2819,
    front_track_mm: 1476,
    rear_track_mm: 1476,
  },
  fuel_tank_litres: 75.1,
  turning_circle_m: 11.1,
  suspension_front: 'Short and long arm independent type with rubber bushed inner pivots, coil springs, stabiliser bar, direct acting tubular telescopic shocks',
  suspension_rear: 'Semi-elliptic springs (3 leaves Sedan, 6 leaves Station Wagon); direct acting tubular telescopic shocks',
  suspension_options: 'Optional heavy duty front and rear springs; optional Superlift rear shocks (adjustable under load)',
  brakes_front: '254mm (10.0 inch) hydraulic drums; optional 271.8mm (10.7 inch) power assisted disc brakes',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  steering: 'Energy absorbing column; recirculating ball 20:1 on Sedans, 16.7:1 on Station Wagons; optional power assisted 16.7:1 for all models',
  wheels: '14 x 5.00JJ short spoke disc type; optional 6.00JJ rally wheels with radial or D70 tyres; double sided safety rims',
  tyres: 'Tubeless 6.95x14 four-ply (6-cyl sedans/wagons and V8 sedans); 7.35 L 14 4 P/R (V8 Station Wagons); optional whitewalls, red band, radial and premium',
  ignition: '12 volt; coil and distributor',
  exhaust_std: 'Single combined muffler and resonator; heat shield on 186S and V8',
  exhaust_307: 'Reverse flow type double skin shell aluminised muffler with resonant chamber and asbestos insulator',
  exhaust_350: 'Twin exhaust and two dual branch tail pipes',
  transmissions: {
    '3 speed V8':       { '1st': 2.48, '2nd': 1.36, '3rd': 1.00 },
    '4 speed Opel':     { '1st': 3.43, '2nd': 2.16, '3rd': 1.37, '4th': 1.00, 'R': 3.32 },
    '4 speed M21':      { '1st': 2.54, '2nd': 1.80, '3rd': 1.44, '4th': 1.00, 'R': 2.54 },
    '4 speed M22':      { '1st': 2.85, '2nd': 2.02, '3rd': 1.35, '4th': 1.00, 'R': 2.85 },
    'Powerglide 6-cyl': { '1st': 1.76, '2nd': 1.00, 'R': 1.76 },
    'Powerglide V8':    { '1st': 1.82, '2nd': 1.00, 'R': 1.82 },
  },
  rear_axle_ratios: {
    '6-cyl 3 spd manual':              '3.55:1',
    '253 V8 3 spd manual':             '3.08:1',
    '6-cyl 4 spd manual':              '3.36:1',
    '253 V8 4 spd manual':             '3.08:1',
    '6-cyl Powerglide':                '3.36:1',
    '253 V8 / 307 V8 Powerglide':      '2.78:1',
    'Monaro GTS 350 manual std':        '3.36:1',
    'Monaro GTS 350 manual economy':    '3.08:1',
    'Monaro GTS 350 auto std':          '3.08:1',
    'Monaro GTS 350 auto optional':     '3.36:1',
  },
  performance: [
    {
      test_config: '253 HT Monaro GTS V8 4 speed manual',
      gear_speeds_km_h: [84, 116, 146, 180],
      '0_97_km_h_s': 9.8,
      quarter_mile_s: 17.8,
    },
    {
      test_config: '308 HT Brougham V8 Powerglide automatic',
      gear_speeds_km_h: [129, 166],
      '0_97_km_h_s': 10.8,
      quarter_mile_s: 18.0,
    },
    {
      test_config: '253 HT Kingswood 3 speed manual',
      gear_speeds_km_h: [84, 120, 174],
      '0_97_km_h_s': 10.0,
      quarter_mile_s: 17.3,
    },
    {
      test_config: '350 HT Monaro GTS V8 4 speed manual',
      gear_speeds_km_h: [77, 116, 148, 201],
      '0_97_km_h_s': 8.1,
      quarter_mile_s: 15.8,
    },
    {
      test_config: '186S HT Monaro GTS Powerglide automatic',
      gear_speeds_km_h: [105, 161],
      '0_97_km_h_s': 9.5,
      quarter_mile_s: 19.2,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HQ (1971–1974)
// ─────────────────────────────────────────────────────────────────────────────
const HQ = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_sedan: 4762,
    length_mm_wagon: 4826,
    length_mm_monaro: 4763,
    length_mm_statesman_deville: 5029,
    width_mm_sedan: 1880,
    width_mm_wagon: 1877,
    height_mm_sedan: 1371,
    height_mm_wagon: 1392,
    height_mm_monaro: 1349,
    height_mm_statesman_deville: 1379,
    wheelbase_mm_sedan_monaro: 2819,
    wheelbase_mm_wagon_statesman: 2896,
    front_track_mm: 1529,
    rear_track_mm: 1529,
  },
  kerb_weight_kg: {
    'Belmont': 1338,
    'Kingswood': 1338,
    'Monaro Coupe': 1338,
    'Monaro LS Coupe': 1338,
    'Premier Sedan': 1360,
    'Monaro GTS': 1429,
    'Station Wagon add': 59,
    'V8 option add': 41,
  },
  fuel_tank_litres: 75.1,
  turning_circle_m: 11.9,
  suspension_front: 'Short and long arm independent type with rubber bushed inner pivots, coil springs, stabiliser bar, direct acting tubular telescopic shocks',
  suspension_rear: 'Four link system with coil springs and direct acting shocks; Salisbury type rear axle for V8 models; modified Banjo type for 6-cylinder',
  brakes_front: '254mm (10.0 inch) hydraulic drums; optional 280mm (11.0 inch) power assisted ventilated disc (standard on all V8 and 6-cyl Statesman)',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  steering: 'Energy absorbing column; recirculating ball 20:1 on Sedans; optional power assisted variable ratio',
  wheels_std: '5.00JJ x 14; optional 6.0JJ x 14',
  wheels_monaro_gts: '6.00JK x 14',
  wheel_note: 'HQ redesigned PCD from 108mm (4.25 inch) to 121mm (4.75 inch); offset reduced from 30mm to 16.5mm',
  tyres_sedan: 'Tubeless 6.95 x 14 four-ply low profile',
  tyres_wagon: 'Tubeless 7.35 L 14 4 P/R',
  tyres_monaro_gts: 'D70 H 14 four ply',
  ignition: '12 volt; coil and distributor',
  exhaust_std: 'Single exhaust pipe',
  exhaust_dual_option: 'Dual exhaust standard on GTS 350 V8; optional on Belmont/Kingswood/Premier Sedans, Monaro, GTS, Monaro LS, Statesman/De Ville V8',
  transmissions: {
    '3 speed 6-cyl / 253 V8':          { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 speed 6-cyl / 253 V8':          { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 speed 308 V8 (optional 253 V8)':{ '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    '4 speed 350 V8':                   { '1st': 2.52, '2nd': 1.88, '3rd': 1.46, '4th': 1.00, 'R': 2.59 },
    'TriMatic 3 speed 6-cyl/253/308 V8':{ '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    'TurboHydramatic 400 350 V8':       { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
  },
  rear_axle_ratios: {
    '173 6-cyl 3 spd manual std':    '3.55:1',
    '173 6-cyl 3 spd manual perf':   '3.90:1',
    '173 6-cyl 3 spd manual econ':   '3.36:1',
    '173 6-cyl TriMatic std':        '3.36:1',
    '173 6-cyl TriMatic perf':       '3.55:1',
    '202 6-cyl 3/4 spd manual std':  '3.55:1',
    '202 6-cyl 3/4 spd manual econ': '3.36:1',
    '202 6-cyl TriMatic std':        '3.36:1',
    '202 6-cyl TriMatic perf':       '3.55:1',
    '253 V8 3/4 spd manual std':     '3.08:1',
    '253 V8 3/4 spd manual perf':    '3.36:1',
    '253 V8 HP 4 spd manual std':    '3.36:1',
    '253 V8 HP 4 spd manual perf':   '3.55:1',
    '253 V8 TriMatic std':           '2.78:1',
    '253 V8 TriMatic perf':          '3.08:1',
    '308 V8 HP 4 spd manual std':    '3.36:1',
    '308 V8 HP 4 spd manual perf':   '3.55:1',
    '308 V8 HP 4 spd manual econ':   '3.08:1',
    '308 V8 TriMatic std':           '2.78:1',
    '308 V8 TriMatic perf':          '3.36:1',
    '308 V8 TriMatic econ':          '3.08:1',
    '350 V8 HP 4 spd manual std':    '3.08:1',
    '350 V8 HP 4 spd manual perf':   '3.55:1',
    '350 V8 TurboHydramatic std':    '3.08:1',
    '350 V8 TurboHydramatic econ':   '2.78:1',
  },
  performance: [
    {
      test_config: '202 HQ Kingswood 3 speed manual',
      gear_speeds_km_h: [56, 105, 157],
      '0_97_km_h_s': 13.1,
      quarter_mile_s: 19.6,
    },
    {
      test_config: '202 HQ Premier Silver Anniversary TriMatic',
      gear_speeds_km_h: [65, 103, 146],
      '0_97_km_h_s': 13.8,
      quarter_mile_s: 19.3,
    },
    {
      test_config: '308 HQ Statesman TriMatic automatic',
      gear_speeds_km_h: [95, 146, 177],
      '0_97_km_h_s': 11.2,
      quarter_mile_s: 18.1,
    },
    {
      test_config: '253 V8 HQ SS 4 door 4 speed manual sedan',
      gear_speeds_km_h: [64, 90, 130, 183],
      '0_97_km_h_s': 11.1,
      quarter_mile_s: 18.0,
    },
    {
      test_config: '308 V8 SS HQ 4 door 4 speed manual sedan',
      gear_speeds_km_h: [67, 94, 133, 173],
      '0_97_km_h_s': 9.3,
      quarter_mile_s: 16.9,
    },
    {
      test_config: '308 V8 HQ Monaro GTS 4 speed manual',
      gear_speeds_km_h: [77, 106, 143, 192],
      '0_97_km_h_s': 8.1,
      quarter_mile_s: 16.4,
    },
    {
      test_config: '308 V8 HQ Statesman De Ville TriMatic',
      gear_speeds_km_h: [77, 128, 177],
      '0_97_km_h_s': 10.5,
      quarter_mile_s: 17.5,
    },
    {
      test_config: '350 V8 HQ Monaro GTS 4 door 4 speed manual',
      gear_speeds_km_h: [88, 119, 148, 201],
      '0_97_km_h_s': 8.1,
      quarter_mile_s: 16.4,
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
      console.log(`  ${rec.id}  ${rec.model} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW — adding: ${keys.substring(0, 100)}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  ${rec.model} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN HK/HT/HQ FULL SPECS ===');
  await patchSeries('HK', HK);
  await patchSeries('HT', HT);
  await patchSeries('HQ', HQ);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
