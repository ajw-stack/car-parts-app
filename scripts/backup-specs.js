#!/usr/bin/env node
// Backs up the specs JSON column for all vehicles that have specs data.
// Run this BEFORE wiping the vehicles table.
// Output: backups/specs-backup-YYYY-MM-DD.json
//
// Usage: node scripts/backup-specs.js

const fs   = require('fs');
const path = require('path');

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

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

(async () => {
  console.log('Fetching vehicles with specs...');

  const url = `${SUPABASE_URL}/rest/v1/vehicles?specs=not.is.null&select=id,make,model,series,trim_code,year_from,year_to,transmission,specs&order=make.asc,model.asc`;
  const res = await fetch(url, { headers });
  if (!res.ok) { console.error('Fetch failed:', await res.text()); process.exit(1); }
  const vehicles = await res.json();

  if (vehicles.length === 0) {
    console.log('No vehicles with specs data found — nothing to back up.');
    process.exit(0);
  }

  const backupsDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const outFile = path.join(backupsDir, `specs-backup-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify(vehicles, null, 2), 'utf8');

  console.log(`\nBacked up specs for ${vehicles.length} vehicle(s) to:`);
  console.log(`  ${outFile}`);
  console.log('\nKeep this file safe — you will need it after re-uploading your CSV.');
})();
