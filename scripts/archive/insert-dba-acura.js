#!/usr/bin/env node
// DBA Catalogue 2020 — ACURA
// Usage: node scripts/insert-dba-acura.js [--dry-run]

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

// ─── Parts ───────────────────────────────────────────────────────────────────
// A=Diameter B=Original Height C=Original Thickness D=Min Thickness E=CHD F=Bolts
const PARTS = [
  { part_number: 'DBA480',   pos: 'Front', description: dim({ type:'Vented', a:260,  b:47,   c:23, d:21,   e:64, f:4 }) },
  { part_number: 'DBA474',   pos: 'Front', description: dim({ type:'Vented', a:262,  b:45,   c:21, d:19,   e:64, f:4 }) },
  { part_number: 'DBA475',   pos: 'Rear',  description: dim({ type:'Solid',  a:239,  b:48,   c:8,  d:null, e:61, f:4 }) },
  { part_number: 'DBA478',   pos: 'Front', description: dim({ type:'Vented', a:282,  b:47,   c:23, d:21,   e:70, f:5 }) },
  { part_number: 'DBA476',   pos: 'Front', description: dim({ type:'Vented', a:300,  b:47.5, c:28, d:26,   e:70, f:5 }) },
  { part_number: 'DBA2500',  pos: 'Front', description: dim({ type:'Vented', a:300,  b:47.5, c:25, d:23,   e:64, f:5 }) },
  { part_number: 'DBA2508',  pos: 'Front', description: dim({ type:'Vented', a:300,  b:57.8, c:25, d:23,   e:64, f:5 }) },
  { part_number: 'DBA2510E', pos: 'Front', description: dim({ type:'Vented', a:300,  b:48,   c:28, d:26,   e:64, f:5 }) },
];

// ─── Vehicles ────────────────────────────────────────────────────────────────
const VEHICLES = [
  { model:'CL',      series:null,    year_from:1998, year_to:1999, engine_litres:2.3, engine_config:'I4',  notes:'2.3L',              parts:['DBA480'] },
  { model:'CL',      series:null,    year_from:2001, year_to:2003, engine_litres:3.2, engine_config:'V6',  notes:'3.2L Coupe V6',      parts:['DBA2510E'] },
  { model:'CX',      series:null,    year_from:2007, year_to:2007, engine_litres:null,engine_config:null,  trim_code:'Type S',         parts:['DBA2500'] },
  { model:'Integra', series:null,    year_from:1990, year_to:2001, engine_litres:null,engine_config:null,  notes:'All excl Type R',     parts:['DBA474','DBA475'] },
  { model:'Integra', series:null,    year_from:1997, year_to:2001, engine_litres:null,engine_config:null,  trim_code:'Type R',         notes:'5-Lug',              parts:['DBA478'] },
  { model:'Integra', series:'DC5',   year_from:2001, year_to:null, engine_litres:null,engine_config:null,  trim_code:'Type R',         notes:'DC5 JDM',            parts:['DBA2508'] },
  { model:'Legend',  series:null,    year_from:1991, year_to:1992, engine_litres:null,engine_config:null,  notes:'Coupe',              parts:['DBA478'] },
  { model:'Legend',  series:null,    year_from:1991, year_to:1995, engine_litres:null,engine_config:null,  notes:'Sedan – Except GS',  parts:['DBA478'] },
  { model:'NSX',     series:null,    year_from:1997, year_to:2005, engine_litres:null,engine_config:null,  notes:'All 6 Speed Transmission; 04/1997-on', parts:['DBA478'] },
  { model:'RL',      series:null,    year_from:1996, year_to:1998, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA478'] },
  { model:'RL',      series:null,    year_from:1999, year_to:2004, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA476'] },
  { model:'RSX',     series:null,    year_from:2002, year_to:2006, engine_litres:null,engine_config:null,  trim_code:'Type S',         parts:['DBA2500'] },
  { model:'TL',      series:null,    year_from:1995, year_to:2005, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA2510E'] },
  { model:'TL',      series:null,    year_from:1996, year_to:1998, engine_litres:3.2, engine_config:'V6',  notes:'3.2',               parts:['DBA478'] },
  { model:'TL',      series:null,    year_from:1999, year_to:2003, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA2510E'] },
  { model:'TL',      series:null,    year_from:2004, year_to:2008, engine_litres:null,engine_config:null,  notes:'All – Standard Front Calipers', parts:['DBA2510E'] },
  { model:'TSX',     series:null,    year_from:2004, year_to:2008, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA2510E'] },
  { model:'MDX',     series:null,    year_from:2002, year_to:2006, engine_litres:null,engine_config:null,  notes:'All',                parts:['DBA2510E'] },
];

// ─── Position map ─────────────────────────────────────────────────────────────
const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA ACURA ===');

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
    for (const p of upsertedParts) console.log(`  ✓ ${p.part_number}  id=${p.id}`);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    upsertedParts = partRows.map(p => ({ ...p, id: `(${p.part_number})` }));
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Upsert vehicles
  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Acura&select=id,model,series,year_from,year_to,trim_code,notes');

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Acura', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    ...v,
  }));
  const existingKeys = new Set(existing.map(v =>
    `${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.trim_code ?? ''}`
  ));
  const toInsert = vehicleRows.filter(v =>
    !existingKeys.has(`${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.trim_code ?? ''}`)
  );

  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  // Split by trim_code presence for PostgREST uniform keys
  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    const withTrim    = toInsert.filter(v => v.trim_code);
    const withoutTrim = toInsert.filter(v => !v.trim_code);
    for (const batch of [withTrim, withoutTrim].filter(b => b.length)) {
      const inserted = await api('/vehicles', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=representation' },
        body: JSON.stringify(batch),
      });
      for (const v of inserted) console.log(`  ✓ ${v.id}  Acura ${v.model} ${v.year_from}-${v.year_to ?? 'on'}`);
      allVehicles.push(...inserted);
    }
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Acura ${v.model} ${v.year_from}-${v.year_to ?? 'on'} ${v.trim_code ?? ''}`);
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Acura&select=id,model,series,year_from,year_to,trim_code,notes');

  // 3. Build fitments
  console.log('\n--- Fitments ---');
  const fitments = [];

  for (const vDef of VEHICLES) {
    const matchingVehicles = allVehicles.filter(v =>
      v.model === vDef.model &&
      (vDef.series === null || v.series === vDef.series) &&
      v.year_from === vDef.year_from &&
      String(v.year_to ?? '') === String(vDef.year_to ?? '') &&
      (v.trim_code ?? '') === (vDef.trim_code ?? '')
    );
    for (const v of matchingVehicles) {
      for (const pn of vDef.parts) {
        fitments.push({ vehicle_id: v.id, part_id: partIdMap[pn], position: PART_POSITION[pn], qty: 1 });
      }
    }
  }

  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id))];
    const existingFit = await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`);
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
        console.log(`  ✓ Acura ${v?.model} ${v?.year_from} ← ${f.part_id} (${f.position})`);
      }
    }
  } else if (DRY_RUN) {
    for (const f of fitments.slice(0, 20)) console.log(`  ${f.vehicle_id} ← ${f.part_id} (${f.position})`);
  }

  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
