#!/usr/bin/env node
/**
 * wipe-vehicles.js — Delete ALL fitments then ALL vehicles.
 *
 * Order: vehicle_part_fitments first (removes FK references), then vehicles.
 * Parts table and everything else is left completely untouched.
 *
 * Usage:
 *   node scripts/utils/wipe-vehicles.js --dry-run   (shows counts, deletes nothing)
 *   node scripts/utils/wipe-vehicles.js              (executes the delete)
 */
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync('C:\\Users\\ajwin\\car-parts-app\\.env.local', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1';
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function count(table) {
  const res = await fetch(`${BASE}/${table}?select=id&limit=1`, {
    headers: { ...hdrs, 'Range-Unit': 'items', Range: '0-0', Prefer: 'count=exact' },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`count(${table}): ${res.status} ${t}`); }
  const cr = res.headers.get('content-range');
  return cr ? parseInt(cr.split('/')[1], 10) : -1;
}

async function main() {
  console.log('=== wipe-vehicles.js ===');
  console.log(DRY_RUN ? 'DRY RUN — no changes will be made.\n' : '⚠️  LIVE RUN — will delete all vehicles.\n');

  const vehiclesBefore  = await count('vehicles');
  const fitmentsBefore  = await count('vehicle_part_fitments');
  console.log(`Before: vehicles=${vehiclesBefore.toLocaleString()}  fitments=${fitmentsBefore.toLocaleString()}`);

  if (DRY_RUN) {
    const partsCount = await count('parts');
    console.log(`Parts (untouched): ${partsCount.toLocaleString()}`);
    console.log('\nDry run complete. Run without --dry-run to execute.');
    return;
  }

  // Step 1: wipe fitments (removes FK references so vehicles can be deleted)
  console.log('\nStep 1: Deleting all vehicle_part_fitments...');
  const r1 = await fetch(`${BASE}/vehicle_part_fitments?id=not.is.null`, {
    method: 'DELETE',
    headers: { ...hdrs, Prefer: 'count=exact' },
  });
  if (!r1.ok) {
    const body = await r1.text();
    console.error(`DELETE fitments failed: ${r1.status} ${body.slice(0, 300)}`);
    process.exit(1);
  }
  const fitmentsDeleted = (r1.headers.get('content-range') || '').split('/')[1] || '?';
  console.log(`  Fitments deleted: ${fitmentsDeleted}`);

  // Step 2: wipe vehicles
  console.log('\nStep 2: Deleting all vehicles...');
  const r2 = await fetch(`${BASE}/vehicles?id=not.is.null`, {
    method: 'DELETE',
    headers: { ...hdrs, Prefer: 'count=exact' },
  });
  if (!r2.ok) {
    const body = await r2.text();
    console.error(`DELETE vehicles failed: ${r2.status} ${body.slice(0, 300)}`);
    process.exit(1);
  }
  const vehiclesDeleted = (r2.headers.get('content-range') || '').split('/')[1] || '?';
  console.log(`  Vehicles deleted: ${vehiclesDeleted}`);

  // Verify
  const vehiclesAfter = await count('vehicles');
  const fitmentsAfter = await count('vehicle_part_fitments');
  const partsAfter    = await count('parts');
  console.log(`\nAfter:  vehicles=${vehiclesAfter}  fitments=${fitmentsAfter}  parts=${partsAfter.toLocaleString()} (unchanged)`);
  console.log('\nDone. Ready to import new vehicles CSV.');
}

main().catch(e => { console.error(e); process.exit(1); });
