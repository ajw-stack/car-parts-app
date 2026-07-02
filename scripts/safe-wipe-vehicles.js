#!/usr/bin/env node
// ⚠️  SAFE WIPE — run this instead of deleting the vehicles table manually.
//
// This script:
//   1. Backs up all specs data to backups/specs-backup-YYYY-MM-DD.json
//   2. Asks you to confirm before deleting anything
//   3. Deletes all rows from the vehicles table (fitments cascade automatically)
//
// AFTER running this script, follow these steps:
//   1. Upload your CSV:    node scripts/upsert-vehicles.js <your-file.csv> --fresh
//   2. Restore specs:      node scripts/restore-specs.js backups/specs-backup-YYYY-MM-DD.json
//   3. Re-run any one-off specs scripts (e.g. update-500e-specs.js, update-695-anniversario-specs.js)
//
// Usage: node scripts/safe-wipe-vehicles.js

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

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

async function backupSpecs() {
  console.log('Step 1 — Backing up specs data...');

  const url = `${SUPABASE_URL}/rest/v1/vehicles?specs=not.is.null&select=id,make,model,series,trim_code,year_from,year_to,transmission,specs&order=make.asc,model.asc`;
  const res = await fetch(url, { headers: baseHeaders });
  if (!res.ok) { console.error('Backup fetch failed:', await res.text()); process.exit(1); }
  const vehicles = await res.json();

  if (vehicles.length === 0) {
    console.log('  No specs data found — nothing to back up.');
    return null;
  }

  const backupsDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const outFile = path.join(backupsDir, `specs-backup-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify(vehicles, null, 2), 'utf8');

  console.log(`  ✓ Backed up specs for ${vehicles.length} vehicle(s) to:`);
  console.log(`    ${outFile}`);
  return outFile;
}

async function countVehicles() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=id`, {
    headers: { ...baseHeaders, Prefer: 'count=exact', Range: '0-0' },
  });
  const count = res.headers.get('content-range')?.split('/')[1];
  return count ? parseInt(count) : '?';
}

(async () => {
  console.log('========================================');
  console.log('  SAFE WIPE — Elroco Vehicles Table');
  console.log('========================================\n');

  // 1. Backup
  const backupFile = await backupSpecs();

  // 2. Count rows
  const total = await countVehicles();
  console.log(`\nStep 2 — ${total} vehicle rows will be deleted (fitments cascade automatically).`);

  if (backupFile) {
    console.log('\n  ⚠️  AFTER WIPING, you must run these commands in order:');
    console.log(`  1.  node scripts/upsert-vehicles.js <your-file.csv> --fresh`);
    console.log(`  2.  node scripts/restore-specs.js ${path.relative(process.cwd(), backupFile)}`);
    console.log(`  3.  node scripts/update-500e-specs.js`);
    console.log(`  4.  node scripts/update-695-anniversario-specs.js  (once vehicle is added)`);
  }

  // 3. Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('\nType WIPE to confirm deletion, or anything else to abort: ', ans => {
    rl.close();
    if (ans.trim() !== 'WIPE') {
      console.log('\nAborted — nothing was deleted.');
      process.exit(0);
    }
    resolve();
  }));

  // 4. Wipe
  console.log('\nDeleting all vehicles...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=not.is.null`, {
    method:  'DELETE',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
  });

  if (!delRes.ok) {
    console.error('Delete failed:', await delRes.text());
    process.exit(1);
  }

  console.log('  ✓ All vehicles deleted.\n');
  console.log('========================================');
  console.log('  NEXT STEPS — do these in order:');
  console.log('========================================');
  console.log('  1.  node scripts/upsert-vehicles.js <your-file.csv> --fresh');
  if (backupFile) {
    console.log(`  2.  node scripts/restore-specs.js ${path.relative(process.cwd(), backupFile)}`);
    console.log('  3.  node scripts/update-500e-specs.js');
    console.log('  4.  node scripts/update-695-anniversario-specs.js  (once vehicle is added)');
  }
  console.log('========================================\n');
})();
