#!/usr/bin/env node
// Insert Holden Gemini parts from holden_gemini_real_parts_dataset.csv
// Vehicle scope is free text so series mappings are hardcoded below.
// Usage: node scripts/insert-gemini-parts.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Env ───────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(urlPath, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${urlPath}`, { headers, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ─── Part definitions ──────────────────────────────────────────────────────────
// category_id: 1=Oil Filter, 2=Air Filter, 3=Fuel Filter, 5=Spark Plugs, 28=Brake Pad Set
// Engine Oil has no category yet — created below.

// Series to apply each part to (derived from vehicle_scope in the CSV)
const PARTS = [
  { brand: 'Bendix', partNumber: 'DB1026',        name: 'Front Brake Pad Set',        categoryName: 'Brake Pad Set', position: 'Front', series: ['TX','TC','TD','TE','TF','TG'] },
  { brand: 'Ryco',   partNumber: 'A52',           name: 'Air Filter',                 categoryName: 'Air Filter',    position: null,    series: ['TX','TE','TF','TG'] },
  { brand: 'Ryco',   partNumber: 'Z56B',          name: 'Oil Filter',                 categoryName: 'Oil Filter',    position: null,    series: ['TG'] },
  { brand: 'Ryco',   partNumber: 'Z92',           name: 'Fuel Filter',                categoryName: 'Fuel Filter',   position: null,    series: ['TE','TF','TG'] },
  { brand: 'NGK',    partNumber: 'BPR6ES',        name: 'Spark Plug',                 categoryName: 'Spark Plugs',   position: null,    series: ['TD','TE','TF','TG'] },
  { brand: 'Penrite',partNumber: 'HPR 30 20W-60', name: 'HPR 30 20W-60 Engine Oil',   categoryName: 'Engine Oil',    position: null,    series: ['TF','TG'] },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT GEMINI PARTS ===');

  // 1. Load all Holden Gemini vehicles, index by series
  const vehicles = await api('/vehicles?make=eq.Holden&model=eq.Gemini&select=id,series,trim_code');
  console.log(`Loaded ${vehicles.length} Holden Gemini vehicles`);
  const bySeries = {};
  for (const v of vehicles) {
    const s = v.series;
    if (!bySeries[s]) bySeries[s] = [];
    bySeries[s].push(v.id);
  }
  console.log('Series in DB:', Object.keys(bySeries).sort().join(', '));

  // 2. Load categories, create Engine Oil if missing
  const cats = await api('/part_categories?select=id,name');
  const catMap = {};
  for (const c of cats) catMap[c.name] = c.id;

  if (!catMap['Engine Oil']) {
    console.log('Creating "Engine Oil" category...');
    if (!DRY_RUN) {
      const [newCat] = await api('/part_categories', {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name: 'Engine Oil' }),
      });
      catMap['Engine Oil'] = newCat.id;
      console.log(`  Engine Oil category id: ${newCat.id}`);
    } else {
      catMap['Engine Oil'] = '(new)';
    }
  }

  // 3. Upsert parts
  const partRows = PARTS.map(p => ({
    brand:       p.brand,
    part_number: p.partNumber,
    name:        p.name,
    category:    p.categoryName,
    category_id: catMap[p.categoryName],
  }));

  console.log('\nUpserting parts:');
  partRows.forEach((r, i) => console.log(`  ${r.brand} ${r.part_number} → cat ${r.category_id} (${PARTS[i].categoryName})`));

  let insertedParts = partRows;
  if (!DRY_RUN) {
    insertedParts = await api('/parts?on_conflict=brand,part_number', {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(partRows),
    });
  }

  // Build part_number → id map
  const partIdMap = {};
  if (!DRY_RUN) {
    for (const p of insertedParts) partIdMap[p.part_number] = p.id;
  } else {
    PARTS.forEach(p => partIdMap[p.partNumber] = `(id:${p.partNumber})`);
  }

  // 4. Build fitments
  const fitments = [];
  for (const p of PARTS) {
    const partId = partIdMap[p.partNumber];
    if (!partId) { console.warn(`No id for ${p.partNumber}`); continue; }
    for (const series of p.series) {
      const vehicleIds = bySeries[series] || [];
      if (vehicleIds.length === 0) console.warn(`  No vehicles found for series ${series}`);
      for (const vehicleId of vehicleIds) {
        fitments.push({
          vehicle_id: vehicleId,
          part_id:    partId,
          position:   p.position,
          qty:        1,
        });
      }
    }
  }

  console.log(`\nFitments to insert: ${fitments.length}`);

  // 5. Load existing fitments to skip duplicates
  const partIds = [...new Set(fitments.map(f => f.part_id))].filter(id => !String(id).startsWith('('));
  let existingKeys = new Set();
  if (!DRY_RUN && partIds.length > 0) {
    const existing = await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`);
    existingKeys = new Set(existing.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`Existing fitments for these parts: ${existing.length}`);
  }

  const newFitments = fitments.filter(f => !existingKeys.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
  console.log(`New fitments to insert: ${newFitments.length}`);

  if (DRY_RUN) {
    console.log('\nSample fitments:');
    newFitments.slice(0, 10).forEach(f =>
      console.log(`  vehicle=${f.vehicle_id} part=${f.part_id} pos=${f.position}`)
    );
    return;
  }

  if (newFitments.length > 0) {
    const BATCH = 200;
    for (let i = 0; i < newFitments.length; i += BATCH) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFitments.slice(i, i + BATCH)),
      });
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
