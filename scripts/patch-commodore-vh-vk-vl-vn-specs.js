#!/usr/bin/env node
// Patch full technical specs into VH / VK / VL / VN Commodore vehicle records
// Usage: node scripts/patch-commodore-vh-vk-vl-vn-specs.js [--dry-run]
//
// Adds to specs JSONB (merging, not replacing):
//   body, dimensions, kerb_weight_kg, fuel_tank_litres, turning_circle_m,
//   suspension_front, suspension_rear, brakes_front, brakes_rear,
//   steering, ignition, exhaust, wheels, tyres,
//   transmissions, rear_axle_ratios, performance

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
// VH COMMODORE (1981–1984)
// ─────────────────────────────────────────────────────────────────────────────
const VH = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions: {
      length_mm: 4706, width_mm: 1722, height_mm: 1363,
      wheelbase_mm: 2668,
      front_track_mm: 1451, front_track_mm_sle: 1449,
      rear_track_mm: 1416,  rear_track_mm_sle: 1422,
    },
    kerb_weight_kg: {
      'SL L4 Sedan': 1152, 'SL/X L4 Sedan': 1196,
      'SL L6 Sedan': 1228, 'SL/X L6 Sedan': 1272,
      'SL/E L6 Sedan': 1326,
    },
    fuel_tank_litres: 63,
    turning_circle_m: 10.2, turning_circle_m_sle: 10.87,
    suspension_front: 'Independent MacPherson, specially rated coil springs, wet sleeve shocks, stabiliser bar',
    suspension_rear: 'Salisbury type rigid axle; 5 links with panhard rod; progressive rate coil springs; telescopic shocks; rear stabiliser bar on wagons',
    brakes_front: '268mm vented disc — single piston sliding head lightweight caliper',
    brakes_rear_sl_slx: '228mm self-adjusting leading trailing shoe drum',
    brakes_rear_sle_ss: '274mm solid disc — lightweight caliper',
    steering_std: 'Coaxial rack and pinion; ratio 19.9:1; direct linkage rear of front wheels',
    steering_pa: 'Power hydraulically assisted rack and pinion (standard on SL/E and V8; optional on SL/SL/X L6)',
    ignition: '12V negative ground; L4 conventional Bosch coil; L6/V8 high energy breakerless Bosch coil',
    exhaust_l4_l6: 'Single; two mufflers',
    exhaust_v8: 'Single with crossover pipe and two mufflers; optional dual pipes with three mufflers',
  },
  variants: {
    '1900 Starfire': {
      wheels: '5.0JJ x 13 ventilated pressed steel',
      tyres: 'BR78S13 6 P/R steel belted radials',
      transmissions: {
        'M4 MC6 4-speed':  { '1st': 3.75, '2nd': 2.16, '3rd': 1.38, '4th': 1.00, 'R': 3.82 },
        'M5 M76 5-speed':  { '1st': 3.65, '2nd': 2.14, '3rd': 1.37, '4th': 1.00, '5th': 0.86, 'R': 3.66 },
        'A3 TriMatic':     { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: { manual_4sp: '3.90:1', manual_5sp: '3.90:1', auto: '3.90:1' },
    },
    '161': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78S14 4P/R steel belted radials',
      transmissions: {
        'M5 M76 5-speed':  { '1st': 3.65, '2nd': 2.14, '3rd': 1.37, '4th': 1.00, '5th': 0.86, 'R': 3.66 },
        'A3 TriMatic':     { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratios: { manual_5sp: '3.36:1 (3.55:1 LSD optional)', auto: '3.08:1 (3.36:1 LSD optional)' },
    },
    '202': {
      wheels: '6.00JJ x 14 ventilated pressed steel',
      tyres: 'CR78S14 4P/R steel belted radials',
      wheels_sle: 'Styled cast alloy 6.00JJ x 15',
      tyres_sle: 'P205/60H15 6P/R steel belted radials',
      transmissions: {
        'M4 MC6 4-speed':  { '1st': 3.50, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.57 },
        'A3 TriMatic':     { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
      },
      rear_axle_ratios: {
        'manual_LC': '3.08:1 (3.36:1 LSD optional)',
        'auto_HC': '2.78:1 (3.08:1 LSD optional)',
      },
    },
    '253': {
      wheels: '6.00JJ x 14 ventilated pressed steel',  // SL/SL/X
      wheels_sle_ss: 'Honeycomb styled cast alloy 6.00JJ x 15',
      tyres: 'CR78S14 4P/R',
      tyres_sle: 'P205/60H15 6P/R steel belted radials',
      transmissions: {
        'M4 M20 4-speed V8': { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'A3 TriMatic V8':    { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
      },
      rear_axle_ratios: { manual: '3.08:1', auto: '2.78:1 (3.08:1 LSD optional)' },
      performance: [
        {
          test_config: 'SL 253 4.2 V8 4-speed manual',
          gear_speeds_km_h: [62, 86, 124, 178],
          '0_100_km_h_s': 10.7,
          quarter_mile_s: 17.4,
        },
        {
          test_config: 'SS 4.2 V8 4-speed manual (dual exhaust 115kW)',
          gear_speeds_km_h: [80, 108, 180, 200],
          '0_100_km_h_s': 8.4,
          quarter_mile_s: 16.6,
        },
      ],
    },
    '308': {
      wheels_sle: 'Styled cast alloy 6.00JJ x 15',
      tyres_sle: 'P205/60H15 6P/R steel belted radials',
      transmissions: {
        'M4 M20 4-speed V8': { '1st': 3.05, '2nd': 2.19, '3rd': 1.15, '4th': 1.00, 'R': 3.05 },
        'A3 TriMatic V8':    { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
      },
      rear_axle_ratios: { manual: '3.36:1', auto: '2.60:1 (3.08:1 LSD optional)' },
      performance: [
        {
          test_config: 'SL/E 5.0 V8 TriMatic',
          gear_speeds_km_h: [92, 154, 200],
          '0_100_km_h_s': 9.5,
          quarter_mile_s: 17.2,
        },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VK COMMODORE (1984–1986)
// ─────────────────────────────────────────────────────────────────────────────
const VK = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions: {
      length_mm: 4714, length_mm_calais: 4713.5,
      width_mm: 1722,
      height_mm: 1378, height_mm_calais: 1360,
      wheelbase_mm: 2668, front_track_mm: 1451, rear_track_mm: 1416,
    },
    kerb_weight_kg: { 'SL': 1220, 'Executive': 1231, 'Berlina': 1265, 'Calais': 1366 },
    fuel_tank_litres: 63,
    turning_circle_m: 10.2, turning_circle_m_pa: 10.70,
    suspension_front: 'Independent MacPherson strut, coil springs, wet sleeve shocks, stabiliser bar',
    suspension_rear: 'Salisbury type rigid axle; trailing arm with 5 links and panhard rod; progressive rate coil springs; telescopic shocks',
    brakes_front: '268mm vented disc — single piston sliding head lightweight caliper',
    brakes_rear_sl_exec_berlina: '230mm self-adjusting leading trailing shoe drum',
    brakes_rear_calais_ss_v8: '274mm solid disc — lightweight caliper',
    steering_sl: 'Rack and pinion; turning circle 10.2m',
    steering_pa: 'Power hydraulically assisted rack and pinion; turning circle 10.7m (standard on Executive, Berlina, Calais)',
    ignition: '12V negative ground; L6 80min/215amp battery; V8 75min/235amp battery',
    exhaust_est: 'Single piece cast iron split header in cylinder sequence 1,2,3 and 4,5,6; single flange, dual outlet',
    exhaust_efi: 'Fabricated tuned-length stainless steel tubular; three branches in pairs 1&6, 2&5, 3&4',
    exhaust_v8: 'Single piece cast iron left/right per bank, one outlet per bank',
    exhaust_v5h: 'Low restriction system with white heat-proof coated headers',
    rear_axle_ratio_std: '3.08:1 (standard across entire range)',
    rear_axle_options: {
      'G70': '2.60:1', 'GV4': '3.36:1', 'GU5': '3.23:1',
      'G80': 'LSD', 'GM5': '3.89:1 (NZ export only, not Calais)',
    },
  },
  variants: {
    '202': {
      wheels: '5.50JJ x 14 ventilated pressed steel (SL/Executive); 6.00JJ x 14 (Berlina)',
      tyres: 'BR78S14 4 P/R (SL/Executive); CR78S14 4P/R (Berlina)',
      transmissions: {
        'M4 MC6 4-speed SL': { '1st': 3.50, '2nd': 2.02, '3rd': 1.41, '4th': 1.00, 'R': 3.57 },
        'M5 M76 5-speed EST': { '1st': 3.24, '2nd': 1.96, '3rd': 1.26, '4th': 1.00, '5th': 0.79, 'R': 3.37 },
        'A3 TriMatic':        { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      performance: [
        {
          test_config: 'Berlina 3.3 EST 5-speed manual',
          gear_speeds_km_h: [63, 104, 161, 175, 175],
          '0_100_km_h_s': 12.1,
          quarter_mile_s: 17.8,
        },
      ],
    },
    '202 EFI': {
      wheels: 'Styled cast alloy 6.00JJ x 15 (Calais)',
      tyres: 'P205/60H15 6P/R steel belted radials',
      transmissions: {
        'M5 M76 5-speed EST': { '1st': 3.24, '2nd': 1.96, '3rd': 1.26, '4th': 1.00, '5th': 0.79, 'R': 3.37 },
        'A3 TriMatic':        { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      performance: [
        {
          test_config: 'Calais 3.3 EFI 3-speed automatic',
          gear_speeds_km_h: [86, 136, 183],
          '0_100_km_h_s': 11.0,
          quarter_mile_s: 17.8,
        },
      ],
    },
    '308': {
      wheels: 'Styled cast alloy 6.00JJ x 15 (Calais); Honeycomb styled cast alloy 6.00JJ x 15 (SS)',
      tyres: 'P205/60H15 6P/R steel belted radials',
      transmissions: {
        'M4 M21 4-speed V8': { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
        'A3 TriMatic':       { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      performance: [
        {
          test_config: 'Calais 5.0 V8 4-speed manual',
          gear_speeds_km_h: [80, 111, 147, 203],
          '0_100_km_h_s': 8.5,
          quarter_mile_s: 16.3,
        },
        {
          test_config: 'Calais 5.0 V8 3-speed TriMatic',
          gear_speeds_km_h: [79, 91, 190],
          '0_100_km_h_s': 9.8,
          quarter_mile_s: 16.7,
        },
      ],
    },
    // trim_code SS — V5H engine (handled by trim_code match below)
  },
  // Extra specs for the SS (trim_code: 'SS') record
  ss_variant: {
    transmissions: {
      'M4 M21 4-speed V8 manual only': { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    },
    performance: [
      {
        test_config: 'Commodore SS 5.0 V8 V5H 5-speed manual',
        gear_speeds_km_h: [75, 105, 139, 192, 217],
        '0_100_km_h_s': 7.6,
        quarter_mile_s: 15.5,
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VL COMMODORE (1986–1988)
// ─────────────────────────────────────────────────────────────────────────────
const VL = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions: {
      length_mm: 4766, width_mm: 1722,
      height_mm: 1367.5, height_mm_berlina: 1363,
      wheelbase_mm: 2668, front_track_mm: 1451, rear_track_mm: 1433,
    },
    kerb_weight_kg: { 'SL': 1250, 'Executive': 1280, 'Berlina': 1290, 'Calais': 1350 },
    fuel_tank_litres: 63,
    turning_circle_m: 10.2, turning_circle_m_pa: 10.70,
    suspension_front: 'Independent MacPherson strut, progressive rate coil springs, wet sleeve shocks, stabiliser bar; Sports (FE2): linear rate, revised spring/shock, increased stabiliser dia; Country Pack: revised rates, higher ground clearance, sump guard',
    suspension_rear: 'Live axle; hypoid diff (L6) or Salisbury (V8); 5-link panhard rod; progressive rate coil springs; telescopic shocks; stabiliser bar; Sports (FE2): revised spring/shock, gas pressure shocks, fuel tank guard; Country Pack: revised rates',
    brakes_front: '271mm vented disc — single piston sliding head lightweight caliper',
    brakes_rear_sl_exec: '230mm self-adjusting leading trailing shoe drum',
    brakes_rear_berlina_calais_ss_sv88: '277mm solid disc — lightweight caliper',
    steering_sl: 'Variable ratio rack and pinion',
    steering_pa: 'Power hydraulically assisted rack and pinion (Executive, Berlina, Calais)',
    ignition: '12V negative ground; L6 75min/235amp battery; V8 90min/450amp battery',
    exhaust_note: 'All models fitted with catalytic converter',
    wheels_std: '6.00JJ x 14 ventilated pressed steel (SL/Executive/Berlina L6 non-turbo)',
    wheels_turbo: '6.00JJ x 15 ventilated pressed steel (SL/Executive/Berlina Turbo)',
    wheels_calais: 'Styled cast alloy 6.00JJ x 15',
    tyres_std: 'P185/75 HR-14 steel belted radials',
    tyres_turbo_calais: 'P205/60H15 HR-15-SL low profile steel belted radials',
  },
  variants: {
    'RB30': {
      transmissions: {
        'M5 5-speed manual':      { '1st': 3.321, '2nd': 1.902, '3rd': 1.308, '4th': 1.000, '5th': 0.759, 'R': 3.382 },
        'A4 4-speed automatic':   { '1st': 2.45,  '2nd': 1.45,  '3rd': 1.00,  '4th': 0.68,  'R': 2.18 },
      },
      rear_axle_ratio: '3.45:1',
      performance: [
        {
          test_config: 'Executive 3.0L 4-speed automatic',
          gear_speeds_km_h: [81, 136, 171, 175],
          '0_100_km_h_s': 11.1,
          quarter_mile_s: 17.8,
        },
        {
          test_config: 'Berlina 3.0L 5-speed manual',
          gear_speeds_km_h: [62, 107, 157, 186, 187],
          '0_100_km_h_s': 9.2,
          quarter_mile_s: 16.7,
        },
      ],
    },
    'RB30ET': {
      transmissions: {
        'M5 HD 5-speed manual (Turbo)': { '1st': 3.580, '2nd': 2.077, '3rd': 1.360, '4th': 1.000, '5th': 0.760, 'R': 3.636 },
        'A4 HD 4-speed automatic (Turbo)': { '1st': 2.45, '2nd': 1.45, '3rd': 1.00, '4th': 0.68, 'R': 2.182 },
      },
      rear_axle_ratio: '3.45:1',
      performance: [
        {
          test_config: 'Berlina 3.0L Turbo 5-speed manual',
          gear_speeds_km_h: [53, 91, 139, 190, 223],
          '0_100_km_h_s': 7.6,
          quarter_mile_s: 15.6,
        },
        {
          test_config: 'Calais 3.0L Turbo 5-speed manual',
          gear_speeds_km_h: [54, 94, 143, 195, 218],
          '0_100_km_h_s': 7.8,
          quarter_mile_s: 15.5,
        },
      ],
    },
    '308': {
      transmissions: {
        'A3 TriMatic V8':           { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratio: '3.08:1',
      performance: [
        {
          test_config: 'Calais 5.0 V8 3-speed TriMatic automatic',
          gear_speeds_km_h: [92, 145, 196],
          '0_100_km_h_s': 9.5,
          quarter_mile_s: 16.9,
        },
      ],
    },
    // SV88 (trim_code: 'SV88') handled separately
    'SV88': {
      transmissions: {
        'M5 BT5G Borg Warner (1988 SS Group A)': { '1st': 2.953, '2nd': 1.938, '3rd': 1.337, '4th': 1.000, '5th': 0.728, 'R': 3.15 },
        'A3 M40 TriMatic':                        { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
      },
      rear_axle_ratio: '3.08:1',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VN COMMODORE (1988–1991)
// ─────────────────────────────────────────────────────────────────────────────
const VN = {
  common: {
    body: 'Unitary construction (Monocoque)',
    dimensions_commodore: {
      length_mm: 4850, width_mm: 1794, height_mm: 1403,
      wheelbase_mm: 2731,
      front_track_mm: 1451, front_track_mm_calais: 1453,
      rear_track_mm: 1478,  rear_track_mm_calais: 1480,
    },
    dimensions_vq_statesman: {
      length_mm: 4960, width_mm: 1812,
      height_mm: 1421, height_mm_caprice: 1416,
      wheelbase_mm: 2826, front_track_mm: 1485, rear_track_mm: 1487,
    },
    dimensions_vg_utility: {
      length_mm: 4866, width_mm: 1780, height_mm: 1512,
      wheelbase_mm: 2821, front_track_mm: 1451, rear_track_mm: 1478,
    },
    kerb_weight_kg: {
      'Commodore Executive': 1310, 'Commodore Berlina': 1367,
      'Holden Calais': 1391,
      'Commodore SS Manual': 1403, 'Commodore SS Auto': 1403,
      'VG Utility': 1336, 'VG Utility S': 1327,
      'VQ Statesman': 1536, 'VQ Caprice': 1589,
    },
    fuel_tank_litres_commodore: 63,
    fuel_tank_litres_utility: 68,
    fuel_tank_litres_statesman: 80,
    turning_circle_m: 10.4, turning_circle_m_statesman: 11.5,
    suspension_front_commodore: 'Independent MacPherson wet strut; linear rate coil springs; wet sleeve shocks; 26mm stabiliser bar; Sports (FE2): firmer spring, reduced stabiliser dia, reduced ride height',
    suspension_rear_commodore: 'Rigid axle Salisbury type; 5-link with parallel short upper and long lower trailing arms; panhard rod; 16mm decoupled stabiliser bar; 30.2mm dampers; Sports (FE2): firmer spring, increased stabiliser dia, fuel tank guards',
    suspension_front_statesman: 'Independent MacPherson wet strut; progressive rate springs; stabiliser bar; Caprice: Bilstein gas pressure dampers',
    suspension_rear_statesman: 'Hypoid differential; independent semi-trailing; progressive rate minibloc coil springs; double acting dampers; stabiliser bar; Caprice: Bilstein gas pressure dampers',
    brakes_front_v6: '271mm vented disc — single piston sliding head lightweight caliper',
    brakes_front_v8: '289mm heavy duty ventilated disc',
    brakes_rear: 'Solid discs across all models',
    steering: 'Power hydraulically assisted rack and pinion; variable ratio 17.2:1 (centre) to 11.8:1 (lock); direct linkage rear to front; 2.7 turns lock to lock; optional manual rack and pinion 19.7:1 to 23.3:1 (4.5 turns)',
    ignition: '12V negative ground; V6 75min/350amp (9 plate); V8 80min/400amp (11 plate)',
    exhaust_v6: 'Fabricated dual exhaust manifolds',
    exhaust_v8: 'Cast iron dual manifolds with single crossover; single exhaust two reverse-flow mufflers',
    wheels_exec_berlina_vg: '6.00JJ x 14 ventilated pressed steel with plastic wheel trims',
    wheels_ss: '6.00JJ x 15 alloy',
    wheels_calais_caprice: 'Styled cast alloy 6.00JJ x 15',
    wheels_s: '6.00JJ x 14 ventilated pressed steel',
    tyres_exec_berlina: 'P185/75 HR14 steel belted radials',
    tyres_vg: 'P195/75 R-14 95H steel belted radials',
    tyres_calais_s_ss: 'P205/65 R-15 92H steel belted radials',
    tyres_statesman: 'P205/65 R-15 92H steel belted radials',
  },
  variants: {
    '3800': {   // Pre-EV6 (1988–Sep 1989)
      transmissions: {
        'M5 M78 5-speed V6 manual': { '1st': 3.25, '2nd': 1.99, '3rd': 1.29, '4th': 1.000, '5th': 0.72, 'R': 3.15 },
        'A4 MD8 TH700 4-speed auto': { '1st': 3.06, '2nd': 1.62, '3rd': 1.00, '4th': 0.70, 'R': 2.30 },
      },
      rear_axle_ratio: '3.08:1',
      performance: [
        {
          test_config: 'Commodore Executive V6 125kW 4-speed automatic',
          gear_speeds_km_h: [65, 122, 198, 195],
          '0_100_km_h_s': 8.2,
          quarter_mile_s: 15.8,
        },
        {
          test_config: 'Holden Calais V6 125kW 4-speed automatic',
          gear_speeds_km_h: [68, 128, 208, 208],
          '0_100_km_h_s': 8.5,
          quarter_mile_s: 16.2,
        },
        {
          test_config: 'Commodore S V6 125kW 5-speed manual',
          gear_speeds_km_h: [64, 105, 162, 208, 212],
          '0_100_km_h_s': 7.7,
          quarter_mile_s: 15.7,
        },
      ],
    },
    '3800 EV6': {  // Series II (Sep 1989–1991)
      transmissions: {
        'M5 M78 5-speed V6 manual': { '1st': 3.25, '2nd': 1.99, '3rd': 1.29, '4th': 1.000, '5th': 0.72, 'R': 3.15 },
        'A4 MD8 TH700 4-speed auto': { '1st': 3.06, '2nd': 1.62, '3rd': 1.00, '4th': 0.70, 'R': 2.30 },
      },
      rear_axle_ratio: '3.08:1',
    },
    '308': {
      transmissions: {
        'M5 M78 5-speed V8 manual': { '1st': 2.95, '2nd': 1.94, '3rd': 1.34, '4th': 1.00, '5th': 0.73, 'R': 2.76 },
        'A4 MD8 TH700 4-speed auto': { '1st': 3.06, '2nd': 1.62, '3rd': 1.00, '4th': 0.70, 'R': 2.30 },
      },
      rear_axle_ratio_ss: '3.45:1',
      rear_axle_ratio_std: '3.08:1',
      performance: [
        {
          test_config: 'Commodore SS 5.0L V8 EFI 5-speed manual',
          gear_speeds_km_h: [72, 108, 157, 208, 228],
          '0_100_km_h_s': 7.3,
          quarter_mile_s: 15.2,
        },
        {
          test_config: 'VQ Statesman 5.0L V8 EFI 4-speed automatic',
          gear_speeds_km_h: [103, 130, 212, 225],
          '0_100_km_h_s': 8.8,
          quarter_mile_s: 16.3,
        },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function patchSeries(series, specsDef) {
  const records = await api(
    `/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.${series}&select=id,engine_code,trim_code,engine_kw,specs`
  );
  console.log(`\n${series}: ${records.length} records`);

  for (const rec of records) {
    const ec = rec.engine_code ?? '';
    const tc = rec.trim_code ?? '';

    // Build the additional specs for this record
    const patch = { ...specsDef.common };

    // Determine variant key
    let variantKey = ec;
    // For VL SV88: match by trim_code
    if (series === 'VL' && tc === 'SV88') variantKey = 'SV88';
    // For VK SS: use ss_variant
    if (series === 'VK' && tc === 'SS') {
      Object.assign(patch, specsDef.ss_variant || {});
    } else if (specsDef.variants?.[variantKey]) {
      Object.assign(patch, specsDef.variants[variantKey]);
    }

    // Merge into existing specs (preserve engine data already there)
    const merged = { ...(rec.specs ?? {}), ...patch };

    if (DRY_RUN) {
      const keys = Object.keys(patch).join(', ');
      console.log(`  ${rec.id}  ${series} ${ec}${tc ? ' ('+tc+')' : ''} ${rec.engine_kw}kW — adding: ${keys.substring(0, 80)}...`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  ${series} ${ec}${tc ? ' ('+tc+')' : ''} ${rec.engine_kw}kW`);
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH COMMODORE VH/VK/VL/VN FULL SPECS ===');
  await patchSeries('VH', VH);
  await patchSeries('VK', VK);
  await patchSeries('VL', VL);
  await patchSeries('VN', VN);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
