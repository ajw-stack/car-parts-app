#!/usr/bin/env node
// Move body type values from v.notes into specs.body for all vehicles
// where notes contains only a recognised body type string.
// Usage: node scripts/patch-body-type-from-notes.js [--dry-run]

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

// Recognised body type values (case-insensitive match against notes)
const BODY_TYPES = new Set([
  'sedan', 'saloon', 'hatchback', 'wagon', 'estate', 'van', 'ute', 'utility',
  'coupe', 'coupé', 'convertible', 'cabriolet', 'roadster', 'panel van',
  'station wagon', 'station-wagon', 'stationwagon', 'suv', 'crossover',
  'pickup', 'pick-up', 'truck', 'cab chassis', 'fastback', 'hardtop',
  'sport sedan', 'sports sedan', 'liftback', 'targa',
]);

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH BODY TYPE FROM NOTES ===');

  // Fetch all vehicles that have a non-null notes field
  const records = await api('/vehicles?notes=not.is.null&select=id,make,model,series,year_from,notes,specs');
  console.log(`Fetched ${records.length} records with notes`);

  const toFix = records.filter(r => {
    if (!r.notes) return false;
    return BODY_TYPES.has(r.notes.trim().toLowerCase());
  });

  console.log(`Records where notes is purely a body type: ${toFix.length}`);

  for (const rec of toFix) {
    const bodyType = rec.notes.trim();
    const merged = { ...(rec.specs ?? {}), body: bodyType };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  ${rec.make} ${rec.model} ${rec.series ?? ''} ${rec.year_from} — notes="${rec.notes}" → specs.body`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: merged, notes: null }),
    });
    console.log(`  ✓ ${rec.id}  ${rec.make} ${rec.model} ${rec.series ?? ''} ${rec.year_from} — moved "${bodyType}" to specs.body, cleared notes`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
