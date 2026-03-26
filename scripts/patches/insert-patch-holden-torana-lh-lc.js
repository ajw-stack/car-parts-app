#!/usr/bin/env node
// Insert + patch Holden LC Torana (1969-1972) and LH Torana (1974-1976)
// Usage: node scripts/insert-patch-holden-torana-lh-lc.js [--dry-run]
//
// LC: 74,627 built (1,633 XU-1s)
// LH: 71,408 built; includes L34 homologation special (260kW)

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
// LC TORANA VEHICLES
// ─────────────────────────────────────────────────────────────────────────────
const LC_vehicles = [
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1200', engine_litres: 1.159, engine_config: 'I4',
    engine_kw: 42, fuel_type: 'ULP',
    notes: 'Base 71ci 4-cyl; Torana, S and SL 2/4 door',
    specs: {
      engine_description: '71ci 1159cc OHV I4 (8.5:1)',
      torque_nm: 89.8,
      compression: '8.5:1',
      bore_stroke_mm: '77.7 x 61.0',
      power_rpm: 5400,
      fuel_system: 'Zenith single downdraft carburettor',
      num_built: 74627,
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1200 S70', engine_litres: 1.159, engine_config: 'I4',
    engine_kw: 51, fuel_type: 'ULP',
    notes: 'Series 70 upgraded 4-cyl; from June 1971',
    specs: {
      engine_description: '71ci 1159cc OHV I4 Series 70 (9.0:1)',
      torque_nm: 92.7,
      compression: '9.0:1',
      bore_stroke_mm: '77.7 x 60.9',
      power_rpm: 5800,
      fuel_system: 'Zenith single downdraft carburettor',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1600', engine_litres: 1.599, engine_config: 'I4',
    engine_kw: 60, fuel_type: 'ULP',
    notes: 'SL 1600 DeLuxe; from June 1971',
    specs: {
      engine_description: '97.5ci 1599cc OHV I4 (9.0:1)',
      torque_nm: 129.6,
      compression: '9.0:1',
      bore_stroke_mm: '85.7 x 66.8',
      power_rpm: 5500,
      fuel_system: 'Zenith single downdraft carburettor',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '138', engine_litres: 2.263, engine_config: 'I6',
    engine_kw: 71, fuel_type: 'ULP',
    notes: 'S and SL 6-cyl',
    specs: {
      engine_description: '138ci 2250cc OHV I6 (9.2:1)',
      torque_nm: 162,
      compression: '9.2:1',
      bore_stroke_mm: '79.4 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'S and SL 6-cyl',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.2:1)',
      torque_nm: 211.9,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '161S', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 93, fuel_type: 'ULP',
    notes: 'GTR 2 door; twin-carb 161',
    specs: {
      engine_description: '161ci 2640cc OHV I6 twin-carb GTR (9.2:1)',
      torque_nm: 202.5,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4800,
      fuel_system: 'Two-barrel Bendix-Stromberg downdraft carburettor',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '186', engine_litres: 3.048, engine_config: 'I6',
    engine_kw: 119, fuel_type: 'ULP',
    trim_code: 'GTR XU-1',
    notes: 'GTR XU-1; triple Stromberg sidedraught; 1,633 built',
    specs: {
      engine_description: '186ci 3050cc OHV I6 triple Stromberg (10.05:1)',
      torque_nm: 256.5,
      compression: '10.05:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 5200,
      fuel_system: 'Triple 1.5 inch 150 CDS Stromberg sidedraught carburettors',
      head: 'High performance camshaft; 161 head with larger inlet/exhaust valves; V8 valve springs',
      exhaust: 'Twin manifolds, 2 inch system and sports muffler',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LH TORANA VEHICLES
// ─────────────────────────────────────────────────────────────────────────────
const LH_vehicles = [
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '1900', engine_litres: 1.897, engine_config: 'I4',
    engine_kw: 76, fuel_type: 'ULP',
    notes: 'Opel-sourced; S and SL Sedan',
    specs: {
      engine_description: '1897cc OHV I4 (9.0:1)',
      torque_nm: 156,
      compression: '9.0:1',
      bore_stroke_mm: '93.0 x 69.8',
      power_rpm: 5400,
      fuel_system: 'Solex two-barrel downdraft carburettor',
      num_built: 71408,
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'S and SL Sedan',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'HE (LC) / HD (HC)',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'SL/R 3300 and SL Sedan',
    specs: {
      engine_description: '202ci 3050cc OHV I6 (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'HM (export LC) / HL (HC)',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'SL/R V8 Sedan',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg twin-barrel carburettor',
      engine_prefix: 'HR',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'SL/R 5000 Sedan; dual exhaust',
    specs: {
      engine_description: '308ci 5047cc OHV V8 Stromberg 4-barrel (9.0:1)',
      torque_nm: 427,
      compression: '9.0:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      fuel_system: '4-barrel Stromberg downdraft carburettor',
      exhaust: 'Dual exhaust pipes',
      engine_prefix: 'HT',
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 260, fuel_type: 'ULP',
    trim_code: 'L34',
    notes: 'L34 homologation special; Holley 4-barrel; from July 1974; engine prefix HZ',
    specs: {
      engine_description: '308ci 5047cc OHV V8 L34 Holley (9.8:1)',
      torque_nm: 390,
      compression: '9.8:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 6000,
      fuel_system: 'Holley 4-barrel carburettor',
      exhaust: 'Dual exhaust pipes',
      engine_prefix: 'HZ',
      brakes_note: '254mm front and rear discs on L34',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LC SPECS (common to all LC records)
// ─────────────────────────────────────────────────────────────────────────────
const LC_specs = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_4cyl: 4120,
    length_mm_6cyl: 4387,
    width_mm: 1600,
    height_mm_4cyl: 1359,
    height_mm_6cyl: 1354,
    height_mm_gtr: 1346,
    wheelbase_mm_4cyl: 2433,
    wheelbase_mm_6cyl: 2540,
    front_track_mm_4cyl: 1295,
    front_track_mm_6cyl: 1316,
    front_track_mm_gtr: 1326,
    rear_track_mm_4cyl: 1295,
    rear_track_mm_6cyl: 1290,
    rear_track_mm_gtr: 1301,
  },
  kerb_weight_kg: {
    '4-cyl 2 door': 812,
    '4-cyl 2 door 1600': 854,
    '4-cyl 4 door': 838,
    '4-cyl 4 door 1600': 876,
    '6-cyl 2 door': 993,
    '6-cyl 4 door': 1014.7,
    'GTR': 1013.3,
  },
  fuel_tank_litres_4cyl: 36.4,
  fuel_tank_litres_6cyl: 45.5,
  fuel_tank_litres_xu1: 77.3,
  turning_circle_m_4cyl: 9.5,
  turning_circle_m_6cyl: 11.1,
  suspension_front_4cyl: 'Independent; coil springs; concentric shock absorbers; short/long ball-jointed control arms; box section crossmember extension arms and diagonal compression struts',
  suspension_front_6cyl: 'Independent; higher rate coil springs; concentric high-control shocks; short/long ball-jointed control arms; box section crossmember extension arms and diagonal compression struts',
  suspension_rear_4cyl: 'Four link; coil springs; rubber bushes; shocks behind Salisbury type live rear axle',
  suspension_rear_6cyl: 'Four link; coil springs; rubber bushes; shocks behind Holden Banjo type live rear axle',
  steering: 'Rack and pinion',
  brakes: {
    '71ci 4-cyl front': '203mm (8.0 inch) drums std; 213.4mm (8.4 inch) discs optional',
    '71ci 4-cyl rear': '203mm (8.0 inch) drums',
    'Series 70 4-cyl front': '254mm (10.0 inch) drums',
    'Series 70 4-cyl rear': '203mm (8.0 inch) drums',
    '1200 DeLuxe / 1600 4-cyl front': '213.4mm (8.4 inch) discs std',
    '1200 DeLuxe / 1600 4-cyl rear': '203mm (8.0 inch) drums',
    '6-cyl S/SL front': '229mm (9.0 inch) drums std; 254mm (10 inch) discs optional',
    '6-cyl S/SL rear': '229mm (9.0 inch) drums',
    'GTR / GTR XU-1 front': '254mm (10 inch) discs (dust shields removed on XU-1)',
    'GTR / GTR XU-1 rear': '229mm (9.0 inch) drums',
  },
  wheels: {
    '4-cyl': '4.00J x 12',
    '6-cyl S/SL': '4.50JJ x 12',
    'GTR / GTR XU-1': '5.50JJ x 13',
  },
  tyres: {
    '4-cyl 1200 S/SL': '5.50 x 12 blackwall crossplies (opt 6.20L12)',
    '4-cyl 1200 DeLuxe / 1600': '6.20L12 blackwall crossplies std',
    '6-cyl S/SL': 'A78L13 blackwall crossplies (opt A78L13 white band or B70H13 red band)',
    'GTR / GTR XU-1': 'B70H13 red band crossplies std',
  },
  ignition: '12V; 35A alternator; Bosch two-contact voltage regulator (Lucas electronic optional on 6-cyl); 38Ah battery (4-cyl); 44Ah battery (6-cyl); coil and distributor',
  exhaust_std: 'Cast iron manifold and single pipe',
  exhaust_xu1: 'Twin manifolds; 2 inch system; sports muffler',
  exhaust_xu1_bathurst: 'Modified exhaust pipes and muffler',
  transmissions: {
    '3 spd 6-cyl manual':       { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 spd std manual':         { '1st': 3.765, '2nd': 2.213, '3rd': 1.404, '4th': 1.00, 'R': 3.707 },
    '4 spd 1600 manual':        { '1st': 2.78, '2nd': 1.98, '3rd': 1.41, '4th': 1.00, 'R': 3.06 },
    '4 spd GTR/XU-1 manual':    { '1st': 3.43, '2nd': 2.16, '3rd': 1.37, '4th': 1.00, 'R': 3.32 },
    'M21 GTR XU-1 Bathurst':    { '1st': 2.54, '2nd': 1.83, '3rd': 1.255, '4th': 1.00, 'R': 2.54 },
    'TriMatic 3 spd auto':      { '1st': 2.40, '2nd': 1.48, '3rd': 1.00, 'R': 1.92 },
  },
  clutch: '4-cyl: 6.25 inch single dry plate; 6-cyl: 8.62 inch heavy plate Belleville diaphragm; strengthened for GTR XU-1 Bathurst',
  rear_axle_ratios: {
    '71ci engine': '3.89:1',
    'Series 70 and 1600': '4.125:1',
    'Manual S/SL/GTR': '3.08:1',
    'TriMatic S/SL': '2.78:1',
    'XU-1': '3.36:1 (3.08:1 optional)',
    'LSD': 'Standard on XU-1; optional on all other models',
  },
  performance: [
    {
      test_config: '138ci 2.25L 6-cyl 3 speed manual',
      gear_speeds_km_h: [55, 109, 143],
      '0_100_km_h_s': 17.6,
      quarter_mile_s: 19.8,
    },
    {
      test_config: '161ci 2.834L 6-cyl 4 speed manual',
      gear_speeds_km_h: [48, 80, 122, 148],
      '0_100_km_h_s': 15.3,
      quarter_mile_s: 19.0,
    },
    {
      test_config: '186ci GTR XU-1 4 speed manual',
      gear_speeds_km_h: [51.5, 83.7, 138.5, 180.3],
      '0_100_km_h_s': 9.2,
      quarter_mile_s: 16.2,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// LH SPECS (common to all LH records)
// ─────────────────────────────────────────────────────────────────────────────
const LH_specs = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm: 4493,
    width_mm: 1704,
    height_mm: 1328,
    wheelbase_mm: 2586,
    front_track_mm: 1400,
    rear_track_mm: 1372,
  },
  kerb_weight_kg: '1143 to 1183kg',
  turning_circle_m: 11.0,
  fuel_tank_litres: 55.0,
  suspension_front: 'Wishbone and swivel A-type; coil springs; direct acting shock absorbers; SL/R fitted with stabiliser bar',
  suspension_rear: 'Four link; rubber-bushed arms; coil springs; hydraulic double acting telescopic shocks; live rear axle; stabiliser bar on SL/R and V8 models',
  steering: 'Rack and pinion; ratio 16.5:1',
  brakes: {
    'S model front': 'Drums',
    'SL and SL/R front': '254mm discs',
    'L34 front': '254mm discs',
    'All models rear': '228mm drums',
    'L34 rear': '254mm drums',
  },
  wheels: {
    'S and SL': '4.50JJ x 13 full circle vented disc',
    'SL/R': '5.50JJ x 13 full circle vented disc',
  },
  tyres: {
    'S/SL 4-cyl': 'A78L13 4 P/R',
    'SL 6-cyl': 'B78L13 4 P/R',
    'SL/R': '175SR13 radials',
  },
  ignition: '4-cyl: 12V 33A alternator; 6-cyl/V8: 12V 35A alternator; coil and distributor',
  exhaust_std: 'Cast iron manifold and single exhaust',
  exhaust_l34: 'Dual exhaust pipes',
  transmissions: {
    '4 spd 1900 manual':          { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.90 },
    '3 spd 1900/2850/3300 auto':  { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    '3 spd 2850/3300 manual':     { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 spd 253 V8 manual':        { '1st': 2.54, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 spd 5000 manual':          { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    '3 spd 4.2/5.0 auto':         { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
  },
  rear_axle_ratios: {
    '1900 manual': '3.90:1',
    '1900 auto': '3.55:1',
    '2850 manual': '3.36:1',
    '2850 auto': '2.78:1',
    '3300 manual': '3.08:1',
    '3300 auto': '2.78:1',
    '4.2 and 5.0 manual': '2.78:1',
    '4.2 and 5.0 auto': '2.78:1',
    'Note': 'Other ratios available as options; L34 options include 3.08:1 and 3.36:1',
  },
  performance: [
    {
      test_config: '2.85L 6-cyl S 3 speed automatic',
      gear_speeds_km_h: [76, 117, 142],
      '0_100_km_h_s': 14.9,
      quarter_mile_s: 19.8,
    },
    {
      test_config: 'SL/R 5000 4 speed manual',
      gear_speeds_km_h: [77, 108, 142, 196],
      '0_100_km_h_s': 7.5,
      quarter_mile_s: 15.5,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Insert helper
// ─────────────────────────────────────────────────────────────────────────────
async function insertSeries(seriesLabel, vehicles) {
  console.log(`\n── INSERT ${seriesLabel} ──`);
  if (DRY_RUN) {
    for (const v of vehicles) console.log(`  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW${v.trim_code ? ' ('+v.trim_code+')' : ''}`);
    return;
  }

  const existing = await api(`/vehicles?make=eq.Holden&model=eq.Torana&series=eq.${vehicles[0].series}&select=series,year_from,year_to,engine_code,trim_code,fuel_type`);
  const existingKeys = new Set(
    existing.map(v => `${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  const withTrim    = toInsert.filter(v => v.trim_code);
  const withoutTrim = toInsert.filter(v => !v.trim_code);

  for (const batch of [withoutTrim, withTrim].filter(b => b.length > 0)) {
    const r = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(batch),
    });
    if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }
    for (const v of r) console.log(`  Inserted ${v.id}  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Patch helper
// ─────────────────────────────────────────────────────────────────────────────
async function patchSeries(series, specsDef) {
  console.log(`\n── PATCH ${series} ──`);
  const records = await api(
    `/vehicles?make=eq.Holden&model=eq.Torana&series=eq.${series}&select=id,engine_code,trim_code,engine_kw,specs`
  );
  console.log(`${series}: ${records.length} records`);

  for (const rec of records) {
    const merged = { ...(rec.specs ?? {}), ...specsDef };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  ${series} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
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
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT + PATCH HOLDEN TORANA LC / LH ===');
  await insertSeries('LC', LC_vehicles);
  await patchSeries('LC', LC_specs);
  await insertSeries('LH', LH_vehicles);
  await patchSeries('LH', LH_specs);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
