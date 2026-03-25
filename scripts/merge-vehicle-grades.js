#!/usr/bin/env node
// Merge vehicle records that are identical except for trim_code.
// The trim codes are consolidated into specs.grades on the primary record.
// Fitments are moved to the primary; duplicates are deleted.
//
// Usage:
//   node scripts/merge-vehicle-grades.js --make=Holden --model=Gemini [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const makeArg  = (process.argv.find(a => a.startsWith('--make='))  || '').split('=')[1];
const modelArg = (process.argv.find(a => a.startsWith('--model=')) || '').split('=')[1];

if (!makeArg || !modelArg) {
  console.error('Usage: node scripts/merge-vehicle-grades.js --make=Holden --model=Gemini [--dry-run]');
  process.exit(1);
}

// ─── Env ───────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const hdrs = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(urlPath, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : `=== MERGE GRADES: ${makeArg} ${modelArg} ===`);

  // 1. Load all vehicles for this make/model
  const vehicles = await api(
    `/vehicles?make=eq.${encodeURIComponent(makeArg)}&model=eq.${encodeURIComponent(modelArg)}&select=id,series,trim_code,year_from,year_to,engine_code,fuel_type,specs&order=series,trim_code`
  );
  console.log(`Loaded ${vehicles.length} vehicles`);

  // 2. Group by merge key (series|year_from|year_to|engine_code|fuel_type)
  const groups = new Map();
  for (const v of vehicles) {
    const key = [v.series ?? '', v.year_from, v.year_to ?? '', v.engine_code ?? '', v.fuel_type ?? ''].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  const toMerge = [...groups.values()].filter(g => g.length > 1);
  console.log(`Groups with duplicates: ${toMerge.length}`);

  if (toMerge.length === 0) {
    console.log('Nothing to merge.');
    return;
  }

  for (const group of toMerge) {
    // Sort: null-trim first (becomes primary, avoids unique constraint conflict), then alphabetically
    group.sort((a, b) => {
      if (!a.trim_code && b.trim_code) return -1;
      if (a.trim_code && !b.trim_code) return 1;
      return (a.trim_code ?? '').localeCompare(b.trim_code ?? '');
    });

    const primary    = group[0];
    const duplicates = group.slice(1);
    const grades     = group.map(v => v.trim_code).filter(Boolean).sort();

    console.log(`\n  Group: series=${primary.series} ${primary.year_from}-${primary.year_to ?? 'ON'} engine=${primary.engine_code} fuel=${primary.fuel_type}`);
    console.log(`    Primary:    ${primary.id} (trim: ${primary.trim_code})`);
    duplicates.forEach(d => console.log(`    Duplicate:  ${d.id} (trim: ${d.trim_code})`));
    console.log(`    grades → [${grades.join(', ')}]`);

    if (DRY_RUN) continue;

    const dupIds = duplicates.map(d => d.id);

    // 3a. Load fitments for all records in group
    const allIds = group.map(v => v.id);
    const fitments = await api(
      `/vehicle_part_fitments?vehicle_id=in.(${allIds.join(',')})&select=vehicle_id,part_id,position,qty,notes`
    );

    // 3b. Collect fitments from duplicates that aren't already on primary
    const primaryFitmentKeys = new Set(
      fitments
        .filter(f => f.vehicle_id === primary.id)
        .map(f => `${f.part_id}|${f.position ?? ''}`)
    );

    const newFitments = fitments
      .filter(f => dupIds.includes(f.vehicle_id))
      .filter(f => !primaryFitmentKeys.has(`${f.part_id}|${f.position ?? ''}`))
      .map(f => ({ vehicle_id: primary.id, part_id: f.part_id, position: f.position, qty: f.qty, notes: f.notes }));

    if (newFitments.length > 0) {
      console.log(`    Moving ${newFitments.length} fitment(s) to primary`);
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFitments),
      });
    }

    // 3c. Delete fitments for duplicates
    await api(`/vehicle_part_fitments?vehicle_id=in.(${dupIds.join(',')})`, { method: 'DELETE' });

    // 3d. Update primary: set specs.grades, clear trim_code
    const existingSpecs = primary.specs ?? {};
    const updatedSpecs  = { ...existingSpecs, grades: grades };
    await api(`/vehicles?id=eq.${primary.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ trim_code: null, specs: updatedSpecs }),
    });

    // 3e. Delete duplicates
    await api(`/vehicles?id=in.(${dupIds.join(',')})`, { method: 'DELETE' });
    console.log(`    Done — deleted ${dupIds.length} duplicate(s)`);
  }

  console.log('\nMerge complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
