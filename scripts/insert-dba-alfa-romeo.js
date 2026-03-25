#!/usr/bin/env node
// DBA Catalogue 2020 — ALFA ROMEO
// Usage: node scripts/insert-dba-alfa-romeo.js [--dry-run]

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
  { part_number: 'DBA356',   pos: 'Front', description: dim({ type:'Vented', a:284,   b:44,   c:22,  d:20.2, e:59, f:5 }) },
  { part_number: 'DBA359E',  pos: 'Rear',  description: dim({ type:'Solid',  a:251,   b:50.5, c:10,  d:9,    e:59, f:5 }) },
  { part_number: 'DBA769',   pos: 'Front', description: dim({ type:'Vented', a:305,   b:45,   c:28,  d:26,   e:59, f:5 }) },
  { part_number: 'DBA2297',  pos: 'Rear',  description: dim({ type:'Solid',  a:278,   b:43,   c:12,  d:10,   e:70, f:5 }) },
  { part_number: 'DBA2298',  pos: 'Front', description: dim({ type:'Vented', a:330,   b:40,   c:28,  d:26,   e:70, f:5 }) },
  { part_number: 'DBA2299',  pos: 'Rear',  description: dim({ type:'Solid',  a:292,   b:43,   c:22,  d:20,   e:70, f:5 }) },
  { part_number: 'DBA2294E', pos: 'Front', description: dim({ type:'Vented', a:281,   b:39.5, c:26,  d:24.2, e:70, f:5 }) },
  { part_number: 'DBA2296',  pos: 'Rear',  description: dim({ type:'Solid',  a:264,   b:40.5, c:10,  d:8,    e:59, f:5 }) },
  { part_number: 'DBA2360',  pos: 'Front', description: dim({ type:'Vented', a:272,   b:58,   c:22,  d:20,   e:82.1, f:4 }) },
  { part_number: 'DBA2404',  pos: 'Front', description: dim({ type:'Vented', a:257,   b:40.5, c:22,  d:20.2, e:59, f:4 }) },
  { part_number: 'DBA2807E', pos: 'Rear',  description: dim({ type:'Solid',  a:285.6, b:48.4, c:11.7,d:10,  e:65, f:5 }) },
  { part_number: 'DBA3260E', pos: 'Front', description: dim({ type:'Vented', a:305,   b:39.7, c:28,  d:26,   e:70, f:5 }) },
  // DBA665 already exists from Abarth — also fits Alfa 155
];

// Vehicles + fitments mapping
const VEHICLES = [
  // ALFA 147
  { model:'147', series:'937', year_from:2001, year_to:2011, notes:'1.9L; All',               parts:['DBA356','DBA359E'] },
  // ALFA 147 GTA
  { model:'147 GTA', series:'937', year_from:2003, year_to:2003, notes:'V6 DOHC 2DR Hatch; 07/2003-09/2003', parts:['DBA769'] },
  // ALFA 155
  { model:'155', series:'167', year_from:1992, year_to:1997, notes:'2.0L Turbo 16V Q4 / 2.5L V6 / 2.5L Turbo Diesel', parts:['DBA665'] },
  // ALFA 156
  { model:'156', series:'932', year_from:1999, year_to:2006, notes:'2.0L & 2.5L V6; All', parts:['DBA356','DBA359E'] },
  { model:'156 GTA', series:'932', year_from:2003, year_to:2003, notes:'3.2L GTA; 07/2003-09/2003', parts:['DBA769'] },
  // ALFA 159
  { model:'159', series:null,  year_from:2006, year_to:2012, notes:'1.9L & 2.2L', parts:['DBA3260E','DBA2297'] },
  { model:'159', series:null,  year_from:2006, year_to:2012, notes:'2.4L & 3.0L', parts:['DBA2298','DBA2299'] },
  // ALFA 164
  { model:'164', series:null,  year_from:1988, year_to:1998, notes:'3.0L', parts:['DBA356','DBA359E'] },
  // BRERA
  { model:'Brera', series:'939', year_from:2006, year_to:2012, notes:'1.8L, 2.2L; 939', parts:['DBA3260E','DBA2297'] },
  { model:'Brera', series:'939', year_from:2006, year_to:2012, notes:'3.2L V6; 939',    parts:['DBA2298','DBA2299'] },
  // GIULIETTA 940
  { model:'Giulietta', series:'940', year_from:2011, year_to:2017, notes:'1.4L Turbo Non Sports; 01/2011-2017', parts:['DBA2294E','DBA2296'] },
  { model:'Giulietta', series:'940', year_from:2011, year_to:2017, trim_code:'Sport Pack', notes:'Sport Pack', parts:['DBA2298','DBA2297'] },
  // GT
  { model:'GT', series:'937', year_from:2004, year_to:2010, notes:'2.0L; 2004-07/2010', parts:['DBA356'] },
  { model:'GT', series:'937', year_from:2004, year_to:2012, notes:'3.2L; 2004-07/2012', parts:['DBA356'] },
  // MITO
  { model:'Mito', series:null, year_from:2009, year_to:2016, notes:'0.875L 875cc 77kW Petrol Turbo; 2013-2016', parts:['DBA2404'] },
  // MONTREAL
  { model:'Montreal', series:null, year_from:1970, year_to:1977, notes:'2.6L V8 DOHC', parts:['DBA2360'] },
  // SPIDER
  { model:'Spider', series:'939', year_from:2006, year_to:2011, notes:'939 2.2L JTS', parts:['DBA2296','DBA3260E','DBA2297'] },
  { model:'Spider', series:'939', year_from:2006, year_to:2012, notes:'939 3.2L JTS V6', parts:['DBA2298','DBA2299'] },
  { model:'Spider', series:'939', year_from:2011, year_to:2012, notes:'939 1.8L Turbo; 2011-02/2012', parts:['DBA2298','DBA2299'] },
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));
// DBA665 exists already with Front position
PART_POSITION['DBA665'] = 'Front';

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA ALFA ROMEO ===');

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
    // Also fetch DBA665 id
    const [dba665] = await api('/parts?brand=eq.DBA&part_number=eq.DBA665&select=id,part_number');
    if (dba665) upsertedParts.push(dba665);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    upsertedParts = PARTS.map(p => ({ part_number: p.part_number, id: `(${p.part_number})` }));
    upsertedParts.push({ part_number: 'DBA665', id: '(DBA665)' });
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Upsert vehicles
  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Alfa+Romeo&select=id,model,series,year_from,year_to,trim_code,notes');

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Alfa Romeo', fuel_type: 'ULP',
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
      for (const v of inserted) console.log(`  ✓ ${v.id}  Alfa Romeo ${v.model} ${v.year_from}`);
      allVehicles.push(...inserted);
    }
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Alfa Romeo ${v.model} ${v.year_from} ${v.trim_code ?? ''}`);
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Alfa+Romeo&select=id,model,series,year_from,year_to,trim_code,notes');

  // 3. Fitments
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
        const pid = partIdMap[pn];
        if (!pid) { console.warn(`No id for ${pn}`); continue; }
        fitments.push({ vehicle_id: v.id, part_id: pid, position: PART_POSITION[pn], qty: 1 });
      }
    }
  }

  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id).filter(id => !String(id).startsWith('(')))];
    const existingFit = partIds.length ? await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`) : [];
    const existSet = new Set(existingFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFit = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`New: ${newFit.length}`);
    if (newFit.length > 0) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFit),
      });
    }
  }

  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
