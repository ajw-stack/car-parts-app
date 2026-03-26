#!/usr/bin/env node
// DBA Catalogue 2020 — AUSTIN HEALEY
// Usage: node scripts/insert-dba-austin-healey.js [--dry-run]

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

function dim({ type, a, b, c, d, e, f }) {
  const minPart = d ? ` (min ${d}mm)` : '';
  return `Ø${a}mm ${type} | Ht ${b}mm | ${c}mm thick${minPart} | CHD ${e}mm | ${f}-bolt`;
}

// A=Diameter B=Original Height C=Original Thickness D=Min Thickness E=CHD F=Bolts
const PARTS = [
  { part_number: 'DBA060',   pos: 'Front', description: dim({ type:'Solid', a:209.8, b:39.5, c:7.5,  d:7,    e:63.5, f:4 }) },
  { part_number: 'DBA061',   pos: 'Front', description: dim({ type:'Solid', a:209.8, b:60,   c:7.7,  d:7,    e:63,   f:4 }) },
  { part_number: 'DBA094B',  pos: 'Front', description: dim({ type:'Solid', a:281,   b:38,   c:12.7, d:11.4, e:82.6, f:5 }) },
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));

const VEHICLES = [
  // SPRITE MK II-III 1100cc
  { model:'Sprite MK II-III', series:null, year_from:1962, year_to:1971, notes:'1100cc', parts:['DBA060'] },
  // SPRITE MK IV 1275cc
  { model:'Sprite MK IV',     series:null, year_from:1962, year_to:1971, notes:'1275cc', parts:['DBA061'] },
  // 3000 MK II-III 3 Litre
  { model:'3000 MK II-III',   series:null, year_from:1960, year_to:1968, notes:'3 Litre', parts:['DBA094B'] },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA AUSTIN HEALEY ===');

  // 1. Upsert parts
  console.log('\n--- Parts ---');
  const partRows = PARTS.map(p => ({
    brand: 'DBA', part_number: p.part_number,
    name: `Street Series Rotor ${p.pos}`,
    description: p.description,
    category: 'Brake Rotor', category_id: 31,
  }));

  let upsertedParts;
  if (!DRY_RUN) {
    upsertedParts = await api('/parts?on_conflict=brand,part_number', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(partRows),
    });
    for (const p of upsertedParts) console.log(`  ✓ ${p.part_number}`);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    upsertedParts = PARTS.map(p => ({ part_number: p.part_number, id: `(${p.part_number})` }));
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Vehicles
  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Austin+Healey&select=id,model,series,year_from,year_to,notes');

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Austin Healey', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    month_from: null, month_to: null,
    ...v,
  }));

  const key = v => `${v.model}|${v.year_from}|${v.year_to ?? ''}`;
  const existingKeys = new Set(existing.map(key));
  const toInsert = vehicleRows.filter(v => !existingKeys.has(key(v)));
  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    const inserted = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(toInsert),
    });
    for (const v of inserted) console.log(`  ✓ ${v.id}  Austin Healey ${v.model} ${v.year_from}`);
    allVehicles.push(...inserted);
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Austin Healey ${v.model} ${v.year_from}`);
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Austin+Healey&select=id,model,series,year_from,year_to,notes');

  // 3. Fitments
  console.log('\n--- Fitments ---');
  const fitments = [];
  for (const vDef of VEHICLES) {
    const matches = allVehicles.filter(v =>
      v.model === vDef.model &&
      v.year_from === vDef.year_from &&
      String(v.year_to ?? '') === String(vDef.year_to ?? '')
    );
    for (const v of matches) {
      for (const pn of vDef.parts) {
        const pid = partIdMap[pn];
        if (!pid) { console.warn(`  No id for ${pn}`); continue; }
        fitments.push({ vehicle_id: v.id, part_id: pid, position: PART_POSITION[pn], qty: 1, notes: null });
      }
    }
  }
  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id).filter(id => !String(id).startsWith('(')))];
    const existingFit = partIds.length
      ? await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`)
      : [];
    const existSet = new Set(existingFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFit = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`New: ${newFit.length}`);
    if (newFit.length > 0) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFit),
      });
      for (const f of newFit) {
        const v = allVehicles.find(v => v.id === f.vehicle_id);
        console.log(`  ✓ Austin Healey ${v?.model} ${v?.year_from} ← ${f.part_id} (${f.position})`);
      }
    }
  }

  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
