#!/usr/bin/env node
// One-off script: update Abarth 695 75th Anniversario with specs.
// Usage: node scripts/update-695-anniversario-specs.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

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

const DIRECT = {
  chassis:            'Hatch',
  engine_kw:          132,
  engine_litres:      1.4,
  fuel_type:          'Turbo Petrol',
  transmission:       'Manual',
  notes:              'Limited edition. 1,368 units produced globally symbolising the engine\'s 1,368cc capacity. 75 units in Australia.',
};

const SPECS = {
  body:                   'Hatch',
  max_power:              '132kW',
  max_torque:             '250Nm',
  torque_nm:              250,
  '0_100_kmh':            6.7,
  suspension_front:       'Adaptive — KONI Frequency Selective Damping',
  suspension_rear:        'Adaptive — KONI Frequency Selective Damping',
  front_brake_desc:       'Floating Disc',
  rear_brake_desc:        'Floating Disc',
  rim_alloy:              '17" Gold Finish Alloy with Black Hub Caps',
};

(async () => {
  // Search by make + model; trim names vary (75th Anniversario / 75 Anniversario etc)
  const url = `${SUPABASE_URL}/rest/v1/vehicles?make=eq.Abarth&model=eq.695&select=id,make,model,series,trim_code,year_from,year_to,specs,notes`;
  const res = await fetch(url, { headers: baseHeaders });
  if (!res.ok) { console.error('Lookup failed:', await res.text()); process.exit(1); }
  const vehicles = await res.json();

  if (!vehicles || vehicles.length === 0) {
    console.log('No Abarth 695 found in the database.');
    console.log('Add the vehicle to your spreadsheet and upload it first, then re-run this script.');
    process.exit(1);
  }

  console.log(`Found ${vehicles.length} Abarth 695 row(s):`);
  vehicles.forEach((v, i) => {
    console.log(`  [${i}] ${v.id}  trim="${v.trim_code ?? ''}"  years=${v.year_from ?? '?'}–${v.year_to ?? '?'}`);
  });

  // Must match on trim — never fall back to "only one row" to avoid updating the wrong vehicle
  const target = vehicles.find(v => (v.trim_code ?? '').toLowerCase().includes('anniversario'));

  if (!target) {
    console.log('\nNo Abarth 695 with trim_code containing "Anniversario" found.');
    console.log('Add the vehicle to your spreadsheet, set trim_code to e.g. "75th Anniversario", upload it, then re-run.');
    process.exit(1);
  }

  console.log(`\nTargeting: ${target.id}  (${target.make} ${target.model} ${target.trim_code ?? ''})`);

  const existing = (target.specs && typeof target.specs === 'object') ? target.specs : {};
  const mergedSpecs = { ...existing, ...SPECS };
  const payload = { ...DIRECT, specs: mergedSpecs };

  if (DRY_RUN) {
    console.log('\nDRY RUN — payload:');
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

  console.log('\nDone — Abarth 695 75th Anniversario specs updated successfully.');
})();
