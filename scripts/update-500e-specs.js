#!/usr/bin/env node
// One-off script: update Abarth 500e Scorpionissima with full specs from manufacturer sheet.
// Usage: node scripts/update-500e-specs.js [--dry-run]
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
  chassis:                'Hatch',
  doors:                  3,
  seats:                  4,
  country_of_manufacture: 'Italy',
  drive_train:            'FWD',
  transmission:           'Single Speed',
  transmission_speed:     1,
  engine_kw:              113,
  fuel_type:              'BEV',
};

// ─── Specs JSON values ────────────────────────────────────────────────────────
const SPECS = {
  // Body
  body:                       'Hatch',
  doors:                      3,
  seats:                      4,
  kerb_mass_kg:               1335,
  boot_space_litres:          185,
  // Dimensions
  length_mm:                  3673,
  width_mm:                   1682,
  height_mm:                  1518,
  wheelbase_mm:               2322,
  track_front_mm:             1475,
  track_rear_mm:              1465,
  // Performance
  '0_100_kmh':                7.0,
  top_speed_kmh:              150,
  // Powertrain
  max_power:                  '113kW',
  max_torque:                 '235Nm',
  torque_nm:                  235,
  // EV-specific
  battery_type:               'Lithium-Ion',
  battery_capacity_kwh:       42,
  driving_range_wltp_km:      253,
  consumption_wh_km:          181,
  charging_ac:                "4h15' (11kW AC, 0–100%)",
  charging_dc:                "35 min (85kW DC, 0–80%)",
  battery_warranty:           '8 Year / 160,000km',
  // Brakes
  front_brake_desc:           'Disc',
  front_brake_diameter_mm:    '281 x 26',
  rear_brake_desc:            'Disc',
  rear_brake_diameter_mm:     '278 x 12',
  // Tyres & wheels
  front_tyre_desc:            '205/40 R18',
  rear_tyre_desc:             '205/40 R18',
  rim_material:               'Alloy',
  // Steering & suspension
  steering_type:              'Electric Power Steering',
  turning_circle_m:           9.4,
  suspension_front:           'MacPherson Strut',
  suspension_rear:            'Twist Beam',
  // Warranty & service
  warranty:                   '3 Year / 150,000km',
  country_of_origin:          'Italy',
  assembly_plant:             'Stabilimento di Mirafiori, Turin, Italy',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  // 1. Find matching vehicles
  const url = `${SUPABASE_URL}/rest/v1/vehicles?make=eq.Abarth&model=eq.500e&select=id,make,model,series,trim_code,year_from,year_to,specs`;
  const res = await fetch(url, { headers: baseHeaders });
  if (!res.ok) { console.error('Lookup failed:', await res.text()); process.exit(1); }
  const vehicles = await res.json();

  if (!vehicles || vehicles.length === 0) {
    console.log('No Abarth 500e found in the database.');
    console.log('Add the vehicle to your spreadsheet and upload it first, then re-run this script.');
    process.exit(1);
  }

  console.log(`Found ${vehicles.length} Abarth 500e row(s):`);
  vehicles.forEach((v, i) => {
    console.log(`  [${i}] ${v.id}  series="${v.series ?? ''}"  trim="${v.trim_code ?? ''}"  years=${v.year_from ?? '?'}–${v.year_to ?? '?'}`);
  });

  // Prefer the Scorpionissima trim; fall back to the only row if there's just one.
  let target = vehicles.find(v => (v.trim_code ?? '').toLowerCase() === 'scorpionissima');
  if (!target && vehicles.length === 1) target = vehicles[0];

  if (!target) {
    console.log('\nMultiple 500e rows found — could not determine which to update.');
    console.log('Set trim_code=Scorpionissima on the correct row and re-run.');
    process.exit(1);
  }

  console.log(`\nTargeting: ${target.id}  (${target.make} ${target.model} ${target.trim_code ?? ''})`);

  // 2. Merge specs (preserve any existing fields not listed here)
  const existing = (target.specs && typeof target.specs === 'object') ? target.specs : {};
  const mergedSpecs = { ...existing, ...SPECS };

  const payload = { ...DIRECT, specs: mergedSpecs };

  if (DRY_RUN) {
    console.log('\nDRY RUN — payload that would be written:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // 3. Patch
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${target.id}`, {
    method:  'PATCH',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
    body:    JSON.stringify(payload),
  });

  if (!patchRes.ok) {
    console.error('PATCH failed:', await patchRes.text());
    process.exit(1);
  }

  console.log('\nDone — Abarth 500e specs updated successfully.');
})();
