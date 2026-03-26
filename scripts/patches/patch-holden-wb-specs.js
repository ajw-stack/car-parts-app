#!/usr/bin/env node
// Patch full technical specs into WB Holden vehicle records
// Usage: node scripts/patch-holden-wb-specs.js [--dry-run]

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
// WB COMMERCIALS (1980–1985)  — Kingswood Utility/Van, One-Tonner
// ─────────────────────────────────────────────────────────────────────────────
const WB_commercial = {
  body: 'Unitary construction (Monocoque) — Commercials use full chassis',
  dimensions: {
    length_mm_utility: 4938,
    length_mm_panel_van: 4945,
    length_mm_one_tonner: 4897,
    width_mm: 1877,
    height_mm_utility: 1395,
    height_mm_panel_van: 1603,
    height_mm_one_tonner: 1420,
    wheelbase_mm: 2895,
    front_track_mm: 1520,
    rear_track_mm: 1530,
  },
  kerb_weight_kg: {
    'Utility base': 1360,
    'Kingswood Utility 6-cyl': 1370,
    'Kingswood Utility 8-cyl': 1404,
    'Panel Van 6-cyl': 1432,
    'Panel Van 8-cyl': 1476,
    'One-Tonner 6-cyl': 1292,
    'One-Tonner 8-cyl': 1336,
  },
  fuel_tank_litres: 70.4,
  turning_circle_m: 12.3,
  suspension_front: 'Independent with coil springs',
  suspension_rear: 'Independent with coil springs',
  steering: 'Front-mounted recirculating ball; standard ratio 25:1; optional PA integral variable ratio 18:1 to 11.7:1',
  brakes_front: 'Power assisted discs standard',
  brakes_rear: 'Drums (duo-servo)',
  wheels: '6.00JJ x 14 steel',
  tyres: {
    'Utility and Panel Van': 'FR78S14 steel belted radials',
    'One-Tonner': '195R14LT steel belted radials',
  },
  ignition: '12V; 40A alternator (55A with A/C); pre-engaged drive starter; high energy breakerless ignition; 8mm silicone insulated fibreglass leads',
  exhaust_l6: '6-cyl: manifold separating first 3 from last 3 cylinders; twin outlet flange; dual pipes into single pipe; muffler and tail pipe',
  exhaust_v8: '8-cyl: separate front pipes from each side; cross-over to single rear pipe; muffler; single rear tail pipe',
  transmissions: {
    '3 spd M15 manual (202/253)':  { '1st': 3.07, '2nd': 1.68, '3rd': 1.00, 'R': 3.59 },
    '4 spd M20 manual (202/253)':  { '1st': 3.05, '2nd': 2.19, '3rd': 1.51, '4th': 1.00, 'R': 3.05 },
    'TriMatic M40 auto':           { '1st': 2.31, '2nd': 1.46, '3rd': 1.00, 'R': 1.85 },
  },
  transmission_note: 'Turbo boxes (TH350) deleted approx August 1982 on 308; replaced with TriMatic',
  rear_axle_ratios: {
    'Utility and Panel Van': '3.55:1',
    'One-Tonner std': '4.44:1',
    'One-Tonner optional': '3.36:1',
  },
  performance: [
    {
      test_config: 'Kingswood 253 4.2L V8 Utility 4 speed manual',
      gear_speeds_km_h: [65, 90, 130, 170],
      '0_100_km_h_s': 12.2,
      quarter_mile_s: 17.8,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WB STATESMAN (1980–1985)  — DeVille, Caprice, Series II, HDT Magnum
// ─────────────────────────────────────────────────────────────────────────────
const WB_statesman = {
  body: 'Unitary construction (Monocoque)',
  dimensions: {
    length_mm: 5157,
    width_mm: 1899,
    height_mm_deville: 1370,
    height_mm_caprice: 1390,
    wheelbase_mm: 2895,
    front_track_mm_caprice: 1531,
    front_track_mm_deville: 1523,
    rear_track_mm_caprice: 1540,
    rear_track_mm_deville: 1536,
  },
  kerb_weight_kg: {
    'Statesman Caprice': 1719,
    'Statesman DeVille': 1681,
  },
  fuel_tank_litres: 91,
  fuel_tank_litres_optional: 126,
  turning_circle_m: 12.3,
  suspension_front: 'Independent with short and long arms; coil springs; decoupled stabiliser bar',
  suspension_rear: 'Four-link system with coil springs; decoupled stabiliser bar',
  steering: 'Integral variable power steering; ratio 18.1:1',
  brakes_front: '276mm power assisted ventilated discs',
  brakes_rear: '293mm power assisted solid discs',
  wheels_deville: '6.00JJ x 14 steel with full wheel cover',
  wheels_caprice: 'Styled cast alloy 7.00JJ x 15',
  wheels_hdt: 'Momo alloy 7.00JJ x 15',
  tyres_deville: 'FR78 H15',
  tyres_caprice: 'ER60 H15',
  tyres_hdt: 'Pirelli P6 235/30 VR15',
  ignition: '12V; 55A alternator; 62Ah battery; pre-engaged drive starter; high energy breakerless ignition; 8mm silicone insulated fibreglass leads',
  exhaust_std: 'Separate pipe and resonator from each side; dual mufflers; intermediate pipe to single muffler at rear LH',
  exhaust_hdt: 'HDT exhaust manifold with high performance exhaust system',
  transmissions: {
    'TurboHydramatic 400 M40 auto': { '1st': 2.48, '2nd': 1.48, '3rd': 1.00, 'R': 2.08 },
  },
  rear_axle_ratios: {
    'Statesman std': '3.08:1',
    'Statesman towing/perf option': '3.36:1',
    'Statesman Series II': '2.60:1',
  },
  performance: [
    {
      test_config: 'Statesman DeVille 308 126kW TH400 auto',
      gear_speeds_km_h: [70, 140, 175],
      '0_100_km_h_s': 9.7,
      quarter_mile_s: 17.0,
    },
    {
      test_config: 'Statesman Caprice 308 126kW TH400 auto',
      gear_speeds_km_h: [72, 122, 180],
      '0_100_km_h_s': 11.8,
      quarter_mile_s: 18.0,
    },
    {
      test_config: 'Statesman DeVille 308 126kW (alternative test)',
      gear_speeds_km_h: [78, 132, 165],
      '0_100_km_h_s': 10.9,
      quarter_mile_s: 18.6,
    },
    {
      test_config: 'HDT Statesman Magnum 308 188kW',
      gear_speeds_km_h: [111, 175, 200],
      '0_100_km_h_s': 9.43,
      quarter_mile_s: 16.76,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Patch logic
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN WB FULL SPECS ===');

  const records = await api(
    '/vehicles?make=eq.Holden&series=eq.WB&select=id,model,engine_code,trim_code,engine_kw,specs'
  );
  console.log(`WB: ${records.length} records`);

  for (const rec of records) {
    const isStatesman = rec.model === 'Statesman';
    const specsDef = isStatesman ? WB_statesman : WB_commercial;
    const merged = { ...(rec.specs ?? {}), ...specsDef };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  WB ${rec.model} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW — ${isStatesman ? 'statesman' : 'commercial'}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged }),
    });
    console.log(`  ✓ ${rec.id}  WB ${rec.model} ${rec.engine_code ?? ''} ${rec.engine_kw ?? ''}kW`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
