#!/usr/bin/env node
// DBA Catalogue 2020 — ASTON MARTIN
// Usage: node scripts/insert-dba-aston-martin.js [--dry-run]

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

const PARTS = [
  { part_number: 'DBA42767', pos: 'Front', description: dim({ type:'Vented', a:355, b:52.5, c:32, d:30, e:71, f:5 }) },
];

const VEHICLES = [
  { model:'DB9',       series:null, year_from:2005, year_to:null, notes:'DB9 Models – Check All Specs',      parts:['DBA42767'] },
  { model:'V8 Vantage',series:null, year_from:2010, year_to:null, notes:'V8 Vantage – Check All Specs; 08/2010-on', parts:['DBA42767'] },
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA ASTON MARTIN ===');

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

  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Aston+Martin&select=id,model,series,year_from,year_to,trim_code');
  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Aston Martin', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    ...v,
  }));
  const existingKeys = new Set(existing.map(v => `${v.model}|${v.year_from}|${v.year_to ?? ''}`));
  const toInsert = vehicleRows.filter(v => !existingKeys.has(`${v.model}|${v.year_from}|${v.year_to ?? ''}`));
  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    const inserted = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(toInsert),
    });
    for (const v of inserted) console.log(`  ✓ ${v.id}  Aston Martin ${v.model} ${v.year_from}`);
    allVehicles.push(...inserted);
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Aston Martin ${v.model} ${v.year_from}`);
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Aston+Martin&select=id,model,year_from,year_to');

  console.log('\n--- Fitments ---');
  const fitments = [];
  for (const vDef of VEHICLES) {
    const matches = allVehicles.filter(v =>
      v.model === vDef.model && v.year_from === vDef.year_from
    );
    for (const v of matches) {
      for (const pn of vDef.parts) {
        fitments.push({ vehicle_id: v.id, part_id: partIdMap[pn], position: PART_POSITION[pn], qty: 1 });
      }
    }
  }
  console.log(`Fitments: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id))];
    const existingFit = await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`);
    const existSet = new Set(existingFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFit = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    if (newFit.length > 0) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFit),
      });
      for (const f of newFit) {
        const v = allVehicles.find(v => v.id === f.vehicle_id);
        console.log(`  ✓ Aston Martin ${v?.model} ← ${f.part_id} (${f.position})`);
      }
    }
  }
  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
