#!/usr/bin/env node
// DBA Catalogue 2020 — AUDI (80/100/A1/A1S1/A2/A3 from catalogue image)
// Usage: node scripts/insert-dba-audi.js [--dry-run]

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
  { part_number: 'DBA240',    pos: 'Front', description: dim({ type:'Solid',  a:239,  b:35.2, c:12, d:10,   e:65, f:4 }) },
  { part_number: 'DBA440',    pos: 'Front', description: dim({ type:'Solid',  a:257,  b:40.5, c:13, d:11,   e:68, f:4 }) },
  { part_number: 'DBA800',    pos: 'Front', description: dim({ type:'Vented', a:256,  b:36.5, c:22, d:19,   e:65, f:5 }) },
  { part_number: 'DBA801',    pos: 'Front', description: dim({ type:'Vented', a:280,  b:36.7, c:22, d:19,   e:65, f:5 }) },
  { part_number: 'DBA802',    pos: 'Front', description: dim({ type:'Vented', a:288,  b:34,   c:25, d:22,   e:65, f:5 }) },
  { part_number: 'DBA803',    pos: 'Rear',  description: dim({ type:'Solid',  a:232,  b:39.5, c:9,  d:7,    e:65, f:5 }) },
  { part_number: 'DBA805',    pos: 'Front', description: dim({ type:'Solid',  a:288,  b:46.2, c:15, d:13,   e:68, f:5 }) },
  { part_number: 'DBA807',    pos: 'Front', description: dim({ type:'Vented', a:288,  b:46.2, c:25, d:23,   e:68, f:5 }) },
  { part_number: 'DBA810',    pos: 'Rear',  description: dim({ type:'Solid',  a:245,  b:63.9, c:10, d:8,    e:68, f:5 }) },
  { part_number: 'DBA2806E',  pos: 'Front', description: dim({ type:'Vented', a:312,  b:49.8, c:25, d:22,   e:65, f:5 }) },
  { part_number: 'DBA2807E',  pos: 'Rear',  description: dim({ type:'Solid',  a:285.6,b:48.4, c:11.7,d:10, e:65, f:5 }) },  // same as Alfa
  { part_number: 'DBA2809E',  pos: 'Rear',  description: dim({ type:'Solid',  a:310,  b:48.5, c:8,  d:6,    e:65, f:5 }) },
  { part_number: 'DBA2810',   pos: 'Front', description: dim({ type:'Vented', a:288,  b:49.7, c:25, d:22,   e:65, f:5 }) },
  { part_number: 'DBA2811E',  pos: 'Front', description: dim({ type:'Vented', a:253,  b:51.5, c:22, d:19,   e:65, f:5 }) },
  { part_number: 'DBA2812E',  pos: 'Front', description: dim({ type:'Vented', a:256,  b:36.5, c:22, d:19,   e:65, f:5 }) },  // same as 800 but E suffix
  { part_number: 'DBA2813E',  pos: 'Rear',  description: dim({ type:'Solid',  a:259.8,b:48.5, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2814E',  pos: 'Rear',  description: dim({ type:'Solid',  a:272,  b:48.2, c:9.7,d:8,    e:65, f:5 }) },
  { part_number: 'DBA2816E',  pos: 'Rear',  description: dim({ type:'Solid',  a:282,  b:47.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2837E',  pos: 'Rear',  description: dim({ type:'Solid',  a:300,  b:48.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA4838',   pos: 'Front', description: dim({ type:'Vented', a:312,  b:34.2, c:25, d:23,   e:65, f:5 }) },
  { part_number: 'DBA42808W', pos: 'Front', description: dim({ type:'Vented', a:345,  b:49.8, c:30, d:27,   e:65, f:5 }) },
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));

const VEHICLES = [
  // AUDI 80 Inc FOX
  { model:'80',   series:null,   year_from:1976, year_to:1979, notes:'1.5L, 1.6L FOX; 9/1976-1979', parts:['DBA240'] },
  // AUDI 100
  { model:'100',  series:null,   year_from:1974, year_to:1977, notes:'All Models',                   parts:['DBA440'] },
  { model:'100',  series:null,   year_from:1990, year_to:1994, notes:'2.0L 4Cyl 74kW; 12/1990-1994', parts:['DBA805'] },
  { model:'100',  series:null,   year_from:1992, year_to:1994, notes:'2.6E 16V',                     parts:['DBA807'] },
  { model:'100',  series:null,   year_from:1992, year_to:1994, notes:'2.6E V6; 05/1992-1994',        parts:['DBA807'] },
  { model:'100',  series:null,   year_from:1990, year_to:1994, notes:'All Models incl Avant & Quattro Rear; 1990-1994', parts:['DBA810'] },
  // A1 8X
  { model:'A1',   series:'8X',   year_from:2011, year_to:2016, notes:'8X Series 1ZG; 11/2011-2016',  parts:['DBA800'] },
  { model:'A1',   series:'8X',   year_from:2011, year_to:2016, notes:'1ZC',                          parts:['DBA802'] },
  { model:'A1',   series:'8X',   year_from:2011, year_to:2016, notes:'1ZM, 1ZN & 1ZS',               parts:['DBA4838'] },
  { model:'A1',   series:'8X',   year_from:2011, year_to:2016, notes:'1LJ',                          parts:['DBA2806E'] },
  { model:'A1',   series:'8X',   year_from:2011, year_to:2016, notes:'1KT – Rear',                   parts:['DBA803'] },
  // A1/S1 8X (09/2014-2016)
  { model:'S1',   series:'8X',   year_from:2014, year_to:2016, notes:'8X Series 1ZG; 09/2014-2016',  parts:['DBA800'] },
  { model:'S1',   series:'8X',   year_from:2014, year_to:2016, notes:'1ZC',                          parts:['DBA802'] },
  { model:'S1',   series:'8X',   year_from:2014, year_to:2016, notes:'1ZS',                          parts:['DBA4838'] },
  { model:'S1',   series:'8X',   year_from:2014, year_to:2016, notes:'1LJ',                          parts:['DBA2806E'] },
  { model:'S1',   series:'8X',   year_from:2014, year_to:2016, notes:'1KT – Rear',                   parts:['DBA803'] },
  // A2 8Z
  { model:'A2',   series:'8Z',   year_from:1999, year_to:2005, notes:'8Z Series – Front',            parts:['DBA800'] },
  { model:'A2',   series:'8Z',   year_from:1999, year_to:2005, notes:'8Z Series – Rear',             parts:['DBA803'] },
  // A3 8L (1997-4/2003)
  { model:'A3',   series:'8L',   year_from:1997, year_to:2003, notes:'1LQ',                          parts:['DBA800'] },
  { model:'A3',   series:'8L',   year_from:1997, year_to:2003, notes:'1LR, 1LS & 1ZP',               parts:['DBA801'] },
  { model:'A3',   series:'8L',   year_from:1997, year_to:2003, notes:'1LE, 1LN & 1ZD',               parts:['DBA802'] },
  { model:'A3',   series:'8L',   year_from:1997, year_to:2003, notes:'1KK & 1KV – Rear',             parts:['DBA803'] },
  // A3 8P (2004-2013)
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'8P Series 1ZF & 1ZM',          parts:['DBA2812E'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1ZE & 1ZP',                    parts:['DBA800'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1LJ, 1ZA & 1ZD',               parts:['DBA2806E'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1KL – WAVE Design DBA2808',    parts:['DBA42808W'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1KQ & 1KD – Rear',             parts:['DBA2811E'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1KE – Rear',                   parts:['DBA2813E'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1KS – Rear',                   parts:['DBA2814E'] },  // actually 2813 per image
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'1KZ – Rear',                   parts:['DBA2816E'] },
  { model:'A3',   series:'8P',   year_from:2004, year_to:2013, notes:'2807E – Rear',                 parts:['DBA2807E'] },
  // A3 8V (2013-2017)
  { model:'A3',   series:'8V',   year_from:2013, year_to:2017, notes:'8V Series 1ZE & 1ZP',          parts:['DBA2810'] },
  { model:'A3',   series:'8V',   year_from:2013, year_to:2017, notes:'1ZD & 1ZA',                    parts:['DBA2806E'] },
  { model:'A3',   series:'8V',   year_from:2013, year_to:2017, notes:'1KE – Rear',                   parts:['DBA2814E'] },
  { model:'A3',   series:'8V',   year_from:2013, year_to:2017, notes:'2ED – Rear',                   parts:['DBA2837E'] },
  { model:'A3',   series:'8V',   year_from:2013, year_to:2017, notes:'1KJ & 1KY – Rear',             parts:['DBA2809E'] },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA AUDI ===');

  // 1. Parts
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
  const existing = await api('/vehicles?make=eq.Audi&select=id,model,series,year_from,year_to,notes');
  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Audi', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    ...v,
  }));
  const existingKeys = new Set(existing.map(v =>
    `${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${(v.notes ?? '').substring(0, 30)}`
  ));
  const toInsert = vehicleRows.filter(v =>
    !existingKeys.has(`${v.model}|${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${(v.notes ?? '').substring(0, 30)}`)
  );
  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    // Batch in chunks of 20 (all have same keys now)
    const BATCH = 20;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const inserted = await api('/vehicles', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=representation' },
        body: JSON.stringify(chunk),
      });
      for (const v of inserted) console.log(`  ✓ ${v.id}  Audi ${v.model} ${v.series ?? ''} ${v.year_from}`);
      allVehicles.push(...inserted);
    }
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Audi ${v.model} ${v.series ?? ''} ${v.year_from} "${v.notes ?? ''}"`);
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Audi&select=id,model,series,year_from,year_to,notes');

  // 3. Fitments
  console.log('\n--- Fitments ---');
  const fitments = [];
  for (const vDef of VEHICLES) {
    const matches = allVehicles.filter(v =>
      v.model === vDef.model &&
      (vDef.series === null || v.series === vDef.series) &&
      v.year_from === vDef.year_from &&
      String(v.year_to ?? '') === String(vDef.year_to ?? '') &&
      (v.notes ?? '').substring(0, 30) === (vDef.notes ?? '').substring(0, 30)
    );
    for (const v of matches) {
      for (const pn of vDef.parts) {
        const pid = partIdMap[pn];
        if (!pid) { console.warn(`No id for ${pn}`); continue; }
        fitments.push({ vehicle_id: v.id, part_id: pid, position: PART_POSITION[pn], qty: 1 });
      }
    }
  }
  console.log(`Fitments: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    const partIds = [...new Set(fitments.map(f => f.part_id).filter(id => !String(id).startsWith('(')))];
    const existingFit = partIds.length
      ? await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`)
      : [];
    const existSet = new Set(existingFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFit = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`New: ${newFit.length}`);
    if (newFit.length > 0) {
      const BATCH = 200;
      for (let i = 0; i < newFit.length; i += BATCH) {
        await api('/vehicle_part_fitments', {
          method: 'POST',
          headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify(newFit.slice(i, i + BATCH)),
        });
      }
      console.log(`  ✓ Inserted ${newFit.length} fitments`);
    }
  }
  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
