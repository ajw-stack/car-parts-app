#!/usr/bin/env node
// Restores specs data from a backup file after re-uploading your vehicles CSV.
// Matches vehicles by their original ID (preserved when using --fresh flag on upsert).
//
// Usage: node scripts/restore-specs.js backups/specs-backup-YYYY-MM-DD.json [--dry-run]

const fs   = require('fs');
const path = require('path');

const backupArg = process.argv.find(a => a.endsWith('.json'));
const DRY_RUN   = process.argv.includes('--dry-run');

if (!backupArg) {
  console.error('Usage: node scripts/restore-specs.js backups/specs-backup-YYYY-MM-DD.json [--dry-run]');
  process.exit(1);
}

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

(async () => {
  const backup = JSON.parse(fs.readFileSync(backupArg, 'utf8'));
  console.log(`Loaded ${backup.length} entries from ${backupArg}`);
  if (DRY_RUN) console.log('DRY RUN — no changes will be written\n');

  let restored = 0;
  let notFound = 0;

  for (const entry of backup) {
    // Check if the vehicle ID still exists in the DB
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${entry.id}&select=id`,
      { headers: baseHeaders }
    );
    const found = await checkRes.json();

    if (found.length === 0) {
      console.log(`  NOT FOUND: ${entry.make} ${entry.model} ${entry.trim_code ?? ''} (${entry.id})`);
      notFound++;
      continue;
    }

    if (!DRY_RUN) {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${entry.id}`, {
        method:  'PATCH',
        headers: { ...baseHeaders, Prefer: 'return=minimal' },
        body:    JSON.stringify({ specs: entry.specs }),
      });
      if (!patchRes.ok) {
        console.error(`  FAILED: ${entry.make} ${entry.model} — ${await patchRes.text()}`);
        continue;
      }
    }

    console.log(`  ${DRY_RUN ? '[dry] ' : ''}Restored: ${entry.make} ${entry.model} ${entry.trim_code ?? ''} (${entry.year_from ?? '?'})`);
    restored++;
  }

  console.log(`\nDone.`);
  console.log(`  Restored : ${restored}`);
  console.log(`  Not found: ${notFound}${notFound > 0 ? ' — these vehicles were not re-uploaded yet, or their IDs changed' : ''}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
})();
