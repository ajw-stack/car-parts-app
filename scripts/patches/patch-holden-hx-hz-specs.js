#!/usr/bin/env node
// Patch full technical specs into HX / HZ Holden vehicle records
// Usage: node scripts/patch-holden-hx-hz-specs.js [--dry-run]

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
// HX (1976–1977)
// ─────────────────────────────────────────────────────────────────────────────
const HX = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_belmont_kingswood_gts_sedan: 4834,
    length_mm_premier_monaro_le: 4851,
    length_mm_belmont_kingswood_wagon: 4884,
    length_mm_premier_wagon: 4897,
    length_mm_statesman_deville: 5159,
    length_mm_statesman_caprice: 5184,
    width_mm_belmont_gts_sedan: 1877,
    width_mm_kingswood_premier_sedan: 1887,
    width_mm_belmont_wagon: 1887,
    width_mm_statesman_deville: 1887,
    width_mm_statesman_caprice: 1877,
    height_mm_belmont_sedan: 1379,
    height_mm_kingswood_sedan: 1374,
    height_mm_premier_sedan: 1382,
    height_mm_monaro_gts_sedan: 1364,
    height_mm_belmont_kingswood_wagon: 1405,
    height_mm_premier_wagon: 1400,
    height_mm_statesman_deville: 1387,
    height_mm_statesman_caprice: 1392,
    wheelbase_mm_sedan_monaro: 2819,
    wheelbase_mm_wagon_statesman: 2896,
    front_track_mm_sedan_wagon: 1511,
    front_track_mm_monaro: 1518,
    rear_track_mm_sedan_wagon: 1529,
    rear_track_mm_monaro: 1537,
  },
  kerb_weight_kg: {
    'Belmont Sedan': 1330,
    'Kingswood Sedan': 1342,
    'Premier Sedan': 1389,
    'Monaro GTS Sedan': 1475,
    'Belmont Station Wagon': 1411,
    'Kingswood Station Wagon': 1426,
    'Premier Station Wagon': 1470,
    'Statesman DeVille': 1545,
    'Statesman Caprice': 1649,
  },
  fuel_tank_litres: 75.0,
  turning_circle_m_sedan: 12.1,
  turning_circle_m_wagon_statesman: 12.3,
  suspension_front: 'Independent SLA type; coil springs; stabiliser bar; direct acting tubular telescopic shocks',
  suspension_rear: 'Live axle; four link system with coil springs and direct acting shocks',
  steering: 'Energy absorbing column; recirculating ball 25:1 (20:1 standard on GTS and Monaro LE, optional on others); PA variable ratio 18:1 to 11.7:1 optional all models',
  steering_note: 'Std 2-spoke oval wheel; GTS 3-spoke circular; Caprice soft grip oval',
  brakes_front: '276mm (10.88 inch) power assisted ventilated disc — standard all models',
  brakes_rear: '254mm (10.0 inch) hydraulic drums',
  wheels_std: '5.00JJ x 14 short spoke steel disc',
  wheels_gts_caprice: '6.00JJ x 14',
  tyres: {
    'Belmont': '6.95 L14 4 P/R',
    'Kingswood': 'C78 L14 4 P/R',
    'Premier': 'E78 L14 4 P/R',
    'Monaro GTS': 'ER14 radial',
    'Station Wagons': 'E78 L14 4 P/R',
    'Statesman Caprice': 'FR78S14',
  },
  ignition: '12 volt; 35A alternator; pre-engaged drive starter motor; coil and distributor',
  exhaust_std: 'Single exhaust pipe',
  exhaust_v8: 'Single or optional dual exhaust on V8 models; manifold changed to comply with ADR 27A',
  engine_prefixes: {
    '202 LC 3300': 'XQM',
    '202 HC 3300': 'XQL',
    '253 HC 4200': 'QR',
    '308 5000': 'QT',
  },
  transmissions: {
    '3 spd 202/253 V8 manual':         { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 spd 202/253 V8 manual':         { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 spd wide ratio 202 6-cyl':      { '1st': 3.74, '2nd': 2.68, '3rd': 1.68, '4th': 1.00, 'R': 3.72 },
    '4 spd wide ratio 253 V8':         { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    'TriMatic 3 spd auto':             { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    'TurboHydramatic 400 auto':        { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
  },
  rear_axle_ratios: {
    '202 3.3L 6-cyl 3 spd manual':    '3.55:1',
    '202 3.3L 6-cyl 4 spd manual':    '3.55:1',
    '202 3.3L 6-cyl TriMatic std':    '3.36:1',
    '202 3.3L 6-cyl TriMatic econ':   '3.08:1',
    '202 3.3L 6-cyl TriMatic perf':   '3.55:1',
    '253 4.2L V8 3/4 spd manual std': '3.08:1',
    '253 4.2L V8 3/4 spd manual perf':'3.36:1',
    '253 V8 TriMatic std':            '3.08:1',
    '253 V8 TriMatic econ':           '2.60:1',
    '253 V8 TriMatic perf':           '3.55:1',
    '308 5.0L V8 HP 4 spd manual std':'3.36:1',
    '308 5.0L V8 HP 4 spd manual perf':'3.55:1',
    '308 5.0L V8 HP 4 spd manual econ':'3.08:1',
    '308 5.0L V8 TH400 (excl GTS) std':'2.78:1',
    '308 5.0L V8 TH400 (excl GTS) perf':'3.08:1',
    '308 5.0L V8 TH400 GTS std':      '3.08:1',
    '308 5.0L V8 TH400 GTS econ':     '2.78:1',
  },
  performance: [
    {
      test_config: '202 6-cyl HX Kingswood TriMatic automatic',
      gear_speeds_km_h: [65, 96, 145],
      '0_100_km_h_s': 16.4,
      quarter_mile_s: 19.9,
    },
    {
      test_config: '253 V8 HX Premier TriMatic automatic',
      gear_speeds_km_h: [75, 108, 148],
      '0_100_km_h_s': 12.0,
      quarter_mile_s: 19.4,
    },
    {
      test_config: '308 V8 HX Monaro GTS TriMatic automatic',
      gear_speeds_km_h: [91, 136, 165],
      '0_100_km_h_s': 10.4,
      quarter_mile_s: 18.6,
    },
    {
      test_config: '308 V8 HX Statesman Caprice TriMatic automatic',
      gear_speeds_km_h: [77, 132, 179],
      '0_100_km_h_s': 13.4,
      quarter_mile_s: 17.9,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HZ (1977–1980)
// ─────────────────────────────────────────────────────────────────────────────
const HZ = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm_kingswood_gts: 4844,
    length_mm_premier_sedan: 4877,
    length_mm_kingswood_wagon: 4897,
    length_mm_premier_wagon: 4912,
    length_mm_sandman: 4938,
    width_mm_kingswood_premier: 1892,
    width_mm_monaro_gts_sandman: 1877,
    height_mm_kingswood_sedan: 1399,
    height_mm_premier_gts: 1397,
    height_mm_kingswood_wagon: 1415,
    height_mm_premier_wagon: 1410,
    height_mm_sandman_van: 1608,
    height_mm_sandman_ute: 1399,
    wheelbase_mm_sedan_gts: 2819,
    wheelbase_mm_wagon_sandman: 2896,
    front_track_mm_kingswood_premier: 1526,
    front_track_mm_gts_sandman: 1532,
    rear_track_mm_kingswood_premier: 1537,
    rear_track_mm_gts_sandman: 1532,
  },
  kerb_weight_kg: {
    'Kingswood SL Sedan': 1342,
    'Premier Sedan': 1389,
    'Monaro GTS Sedan': 1475,
    'Kingswood SL Station Wagon': 1426,
    'Premier Station Wagon': 1470,
    'Sandman Panel Van': 1444,
    'Sandman Utility': 1384,
  },
  fuel_tank_litres: 75.0,
  turning_circle_m_sedan: 12.1,
  turning_circle_m_wagon_statesman: 12.3,
  suspension_note: 'Radial Tuned Suspension (RTS) introduced — modified spring rates and shock tuning; larger front stabiliser bar; new rear decoupled stabiliser bar; larger front compression bumper; revised bushes; new front control arm bracket and lower control arm location',
  suspension_front: 'Independent SLA type; coil springs; stabiliser bar; direct acting tubular telescopic shocks',
  suspension_rear: 'Live axle; four link system with coil springs and direct acting shocks; decoupled stabiliser bar',
  steering: 'Energy absorbing column; recirculating ball 25:1; PA variable ratio 18:1 to 11.7:1 optional all models',
  steering_note: 'Std 2-spoke soft grip oval wheel; GTS and Sandman 3-spoke circular sports wheel',
  brakes_front: '276mm (10.9 inch) power assisted ventilated disc — standard all models',
  brakes_rear_std: '254mm (10.0 inch) hydraulic drums',
  brakes_rear_gts: '292mm (11.5 inch) disc — standard on GTS; optional on Kingswood SL and Premier sedans',
  wheels: '6.00JJ x 14 all models (short spoke steel disc std; 5-spoke slotted rally on GTS and Sandman)',
  tyres: {
    'Kingswood SL and Premier': 'ER78S14 radial',
    'Monaro GTS': 'ER70H14 steel belted radial',
  },
  ignition: '12 volt; 40A alternator (55A with A/C); pre-engaged drive starter; heavy duty battery and cables for 5L V8; coil and distributor',
  exhaust_std: 'Single exhaust pipe',
  exhaust_v8: 'Single or optional dual exhaust on V8 models',
  engine_prefixes: {
    '202 HC 3300': 'XQL / ZL',
    '253 HC 4200': 'QR / ZR',
    '308 5000': 'QT / ZT',
  },
  engine_note_202: '202 engine power differs by transmission: manual 81kW at 3900rpm / automatic 88kW at 4000rpm; torque 251Nm at 1400rpm (manual) / 251Nm at 2100rpm (auto)',
  transmissions: {
    '3 spd 202/253 V8 manual':         { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 spd 202/253 V8 manual':         { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    '4 spd wide ratio 202 6-cyl':      { '1st': 3.74, '2nd': 2.68, '3rd': 1.68, '4th': 1.00, 'R': 3.72 },
    '4 spd wide ratio 253/308 V8':     { '1st': 2.54, '2nd': 1.83, '3rd': 1.38, '4th': 1.00, 'R': 2.54 },
    'TriMatic 3 spd auto':             { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
    'TurboHydramatic 400 auto':        { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
  },
  rear_axle_ratios: {
    '202 3.3L 6-cyl 3 spd manual':    '3.55:1',
    '202 3.3L 6-cyl 4 spd manual':    '3.55:1',
    '202 3.3L 6-cyl TriMatic std':    '3.36:1',
    '202 3.3L 6-cyl TriMatic econ':   '3.08:1',
    '202 3.3L 6-cyl TriMatic perf':   '3.55:1',
    '253 4.2L V8 3/4 spd manual std': '3.08:1',
    '253 4.2L V8 3/4 spd manual perf':'3.55:1',
    '253 4.2L V8 TriMatic std':       '3.08:1',
    '253 4.2L V8 TriMatic econ':      '2.60:1',
    '253 4.2L V8 TriMatic perf':      '3.55:1',
    '308 5.0L V8 HP 4 spd manual std':'3.36:1',
    '308 5.0L V8 HP 4 spd manual econ':'3.08:1',
    '308 5.0L V8 HP 4 spd manual perf':'3.55:1',
  },
  performance: [
    {
      test_config: '202 6-cyl HZ Kingswood TriMatic automatic',
      gear_speeds_km_h: [82, 119, 156],
      '0_100_km_h_s': 13.0,
      quarter_mile_s: 20.1,
    },
    {
      test_config: '253 V8 HZ Premier TriMatic automatic',
      gear_speeds_km_h: [71, 110, 162],
      '0_100_km_h_s': 12.9,
      quarter_mile_s: 19.8,
    },
    {
      test_config: '308 V8 HZ Sandman Panel Van TriMatic automatic',
      gear_speeds_km_h: [84, 142],
      '0_100_km_h_s': 9.6,
      quarter_mile_s: 18.0,
    },
    {
      test_config: '308 V8 HZ Statesman Caprice TriMatic automatic',
      gear_speeds_km_h: [78, 132, 165],
      '0_100_km_h_s': 10.9,
      quarter_mile_s: 18.6,
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
      console.log(`  ${rec.id}  ${rec.model ?? ''} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
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
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN HX/HZ FULL SPECS ===');
  await patchSeries('HX', HX);
  await patchSeries('HZ', HZ);
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
