#!/usr/bin/env node
// One-off script: update Aston Martin DBX707 with engine specs from manufacturer sheet.
// Usage: node scripts/update-dbx707-specs.js [--dry-run]
//
// The vehicle must already exist in the database (add it via your CSV first).
// Existing specs fields are preserved — this script only adds/overwrites the fields below.

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const baseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ─── Direct column values ─────────────────────────────────────────────────────
const DIRECT = {
  engine_config:          'V8',
  engine_litres:          4.0,
  engine_valves:          32,
  engine_kw:              520,
  camshaft_setup:         'DOHC',
  fuel_delivery:          'GDI',
  fuel_type:              'Turbo Petrol',
  transmission:           'Automatic',
  transmission_speed:     9,
  drive_train:            'AWD',
  doors:                  5,
  seats:                  5,
  chassis:                'SUV',
  country_of_manufacture: 'Wales',
};

// ─── Specs JSON values ────────────────────────────────────────────────────────
const SPECS = {
  // Engine
  displacement_cc:      3982,
  bore_mm:              83,
  stroke_mm:            92,
  bore_in:              '3.27"',
  stroke_in:            '3.62"',
  compression_ratio:    '8.6:1',
  cylinders:            8,
  engine_description:   'All alloy quad overhead cam, 4.0 litre twin-turbo V8. Twin hot-V mounted turbochargers. Front mid-mounted engine with double firewall / bulkhead to cabin.',
  induction:            'Twin hot-V mounted turbochargers (hot-V configuration)',
  exhaust:              'Fully catalysed straight stainless steel exhaust with GPF filtration and active valve controlled rear twin outlet muffler. Electronically controlled exhaust with independent exhaust control switch. Dual acoustic engine start (quiet start or sport start).',
  engine_block:         '90 degree V8 closed deck aluminium alloy block with Zirconium alloy 32v heads',
  engine_notes:         'Lightweight aluminium forged pistons and connecting rods in Nanoslide® arc-sprayed spectacle-honed bores. Head mounted twin charge air water coolers. Closed coupled catalytic converters, underfloor GPF, cylinder deactivation, ECO stop/start and automatic alternator regenerative charge cycle management.',
  // Performance
  max_power:            '520kW / 707PS / 697bhp @ 6,000rpm',
  max_torque:           '900Nm / 663lb-ft @ 2,750–4,500rpm',
  torque_nm:            900,
  '0_100_kmh':          3.3,
  top_speed_kmh:        310,
  // Fuel economy
  consumption_l100km:           '13.5 (Combined)',
  fuel_consumption_urban:       '18.5 L/100km',
  fuel_consumption_extra_urban: '10.7 L/100km',
  co2_g_km:                     309,
  // Transmission & drivetrain
  transmission_description: '9-speed lightweight cast magnesium bodied automatic gearbox with multi-plate wet clutch and oil cooling. Close coupled engine mounted. Electronic shift-by-wire control.',
  awd_description:          'Electronically controlled active all-wheel drive. Electronic active centre transfer case with front axle pre-load capability (drive mode dependent). Thru-sump mounted front differential with equal length front drive shafts. Lightweight one-piece carbon fibre rear propeller shaft.',
  final_drive:              'Electronic rear limited-slip differential',
  drive_modes:              '5 adaptive drive modes (4 on-road, 1 off-road)',
  // Steering
  steering_type:        'Electric Power Assisted Rack & Pinion (EPAS)',
  steering_ratio:       '14.4:1',
  steering_turns:       '2.6 turns lock-to-lock',
  turning_circle_m:     12.4,
  // Suspension
  suspension_front:     'Independent forged / hollow cast double wishbone split link with hydrobushing and integrated hub bearings',
  suspension_rear:      'Extruded and hollow form cast multi-link',
  suspension_notes:     'Adaptive triple chamber air suspension with quad spring rates. Variable ride height (raised up to 45mm / lowered 50mm). Variable rate Damptronic® Sky adaptive damping. 1,400Nm 48v electronic active anti-roll control (eARC).',
  // Wheels & tyres
  front_rim_desc:       '22" x 10J ET56 Flow forged aluminium',
  rear_rim_desc:        '22" x 11.5J ET56 Flow forged aluminium',
  front_tyre_desc:      '285/40 YR22 Pirelli P-Zero',
  rear_tyre_desc:       '325/35 YR22 Pirelli P-Zero',
  // Brakes
  front_brake_desc:           'Carbon ceramic vented and grooved 2-piece semi-floating disc, Aluminium 6-piston monoblock caliper',
  front_brake_diameter_mm:    '420 x 40',
  rear_brake_desc:            'Carbon ceramic vented and grooved 2-piece semi-floating disc, sliding single piston caliper with integrated park brake',
  rear_brake_diameter_mm:     '390 x 32',
  // Dimensions
  length_mm:            5039,
  width_mm:             1998,
  height_mm:            1680,
  wheelbase_mm:         3060,
  track_front_mm:       1698,
  track_rear_mm:        1664,
  ground_clearance_mm:  190,
  kerb_mass_kg:         2245,
  gvm_kg:               3020,
  boot_space_litres:    638,
  towing_capacity_kg:   2700,
  // Safety & ADAS
  airbags:              'Driver, front passenger, knee, front thorax, side curtains, rear thorax',
  adas:                 'ACC, AEB, Auto park assist, Blind spot warning, Door exit warning, FCW, Lane departure warning, Lane keep assist, Rear cross traffic detection, Speed limiter, Traffic sign recognition',
  // Country
  country_of_origin:    'Wales, Great Britain',
  assembly_plant:       'St Athan, Wales',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const url = `${SUPABASE_URL}/rest/v1/vehicles?make=eq.Aston Martin&model=eq.DBX707&select=id,make,model,series,trim_code,year_from,year_to,specs`;
  const res = await fetch(url, { headers: baseHeaders });
  if (!res.ok) { console.error('Lookup failed:', await res.text()); process.exit(1); }
  const vehicles = await res.json();

  if (!vehicles || vehicles.length === 0) {
    console.log('No Aston Martin DBX707 found in the database.');
    console.log('Add the vehicle to your spreadsheet and upload it first, then re-run this script.');
    process.exit(1);
  }

  console.log(`Found ${vehicles.length} DBX707 row(s):`);
  vehicles.forEach((v, i) => {
    console.log(`  [${i}] ${v.id}  series="${v.series ?? ''}"  trim="${v.trim_code ?? ''}"  years=${v.year_from ?? '?'}–${v.year_to ?? '?'}`);
  });

  if (vehicles.length > 1) {
    console.log('\nMultiple DBX707 rows found — cannot determine which to update.');
    console.log('Run with a more specific query or update the script to target by trim/series.');
    process.exit(1);
  }

  const target = vehicles[0];
  console.log(`\nTargeting: ${target.id}  (${target.make} ${target.model})`);

  const existing = (target.specs && typeof target.specs === 'object') ? target.specs : {};
  const mergedSpecs = { ...existing, ...SPECS };
  const payload = { ...DIRECT, specs: mergedSpecs };

  if (DRY_RUN) {
    console.log('\nDRY RUN — payload that would be written:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${target.id}`, {
    method:  'PATCH',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
    body:    JSON.stringify(payload),
  });

  if (!patchRes.ok) {
    console.error('PATCH failed:', await patchRes.text());
    process.exit(1);
  }

  console.log('\nDone — Aston Martin DBX707 specs updated successfully.');
})();
