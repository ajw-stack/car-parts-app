#!/usr/bin/env node
// DBA Catalogue 2020 — AUDI TT / R8
// Usage: node scripts/insert-dba-audi-tt-r8.js [--dry-run]

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
  // ─── TT 8N ───────────────────────────────────────────────────────────────────
  { part_number: 'DBA4838',   pos: 'Front', description: dim({ type:'Vented', a:312,   b:34.2, c:25, d:23,   e:65, f:5 }) },
  { part_number: 'DBA803',    pos: 'Rear',  description: dim({ type:'Solid',  a:232,   b:39.5, c:9,  d:7,    e:65, f:5 }) },
  { part_number: 'DBA52828',  pos: 'Front', description: dim({ type:'Vented', a:334,   b:35,   c:32, d:30,   e:65, f:5 }) },
  { part_number: 'DBA800',    pos: 'Rear',  description: dim({ type:'Solid',  a:256,   b:36.5, c:22, d:19,   e:65, f:5 }) },
  // ─── TT 8J / TT 8V ───────────────────────────────────────────────────────────
  { part_number: 'DBA2806E',  pos: 'Front', description: dim({ type:'Vented', a:312,   b:49.8, c:25, d:22,   e:65, f:5 }) },
  { part_number: 'DBA2830E',  pos: 'Front', description: dim({ type:'Vented', a:340,   b:49.7, c:30, d:27,   e:65, f:5 }) },
  { part_number: 'DBA52842',  pos: 'Front', description: dim({ type:'Vented', a:370,   b:49.7, c:32, d:30,   e:65, f:5 }) },
  { part_number: 'DBA2829E',  pos: 'Rear',  description: dim({ type:'Solid',  a:286,   b:58.6, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2831E',  pos: 'Rear',  description: dim({ type:'Solid',  a:310,   b:48.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2814E',  pos: 'Rear',  description: dim({ type:'Solid',  a:272,   b:48.4, c:10, d:8,    e:65, f:5 }) },
  { part_number: 'DBA2837E',  pos: 'Rear',  description: dim({ type:'Solid',  a:300,   b:48.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2809E',  pos: 'Rear',  description: dim({ type:'Vented', a:310,   b:48.5, c:22, d:20,   e:65, f:5 }) },
  // ─── R8 ──────────────────────────────────────────────────────────────────────
  { part_number: 'DBA52833',  pos: 'Front', description: dim({ type:'Vented', a:365,   b:52.4, c:30, d:28,   e:68, f:5 }) }, // *D estimated
  { part_number: 'DBA52834W', pos: 'Front', description: dim({ type:'Vented', a:365,   b:52.4, c:34, d:32.4, e:68, f:5 }) },
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));
// DBA52834 already in DB (A4-A8 script) — corrected and fetched below
PART_POSITION['DBA52834'] = 'Front';

const VEHICLES = [
  // ─── TT 8N ───────────────────────────────────────────────────────────────────
  { model:'TT', series:'8N', year_from:1999, year_to:2006, notes:'1LD, 1LT & 1LV – Front',      parts:['DBA4838'] },
  { model:'TT', series:'8N', year_from:1999, year_to:2006, notes:'1KK & 2EK – Rear',             parts:['DBA803'] },
  { model:'TT', series:'8N', year_from:2004, year_to:2006, notes:'3.2L V6 – Front',              parts:['DBA52828'] },
  { model:'TT', series:'8N', year_from:2004, year_to:2006, notes:'3.2L V6 – Rear',               parts:['DBA800'] },
  // ─── TT 8J ───────────────────────────────────────────────────────────────────
  { model:'TT', series:'8J', year_from:2006, year_to:2014, notes:'Front',                        parts:['DBA2806E'] },
  { model:'TT', series:'8J', year_from:2006, year_to:2014, notes:'1LM, 1LK & 1LN – Front',      parts:['DBA2830E'] },
  { model:'TT', series:'8J', year_from:2006, year_to:2014, notes:'RS PLUS – Front',              parts:['DBA52842'] },
  { model:'TT', series:'8J', year_from:2006, year_to:2014, notes:'1KZ, 1KJ, 2ED & 2EE – Rear',  parts:['DBA2829E'] },
  { model:'TT', series:'8J', year_from:2006, year_to:2014, notes:'2EA, 2EF & 2EG – Rear',       parts:['DBA2831E'] },
  // ─── TT / TTS 8V ─────────────────────────────────────────────────────────────
  { model:'TT', series:'8V', year_from:2015, year_to:2017, notes:'1LJ & 1ZD – Front',            parts:['DBA2806E'] },
  { model:'TT', series:'8V', year_from:2015, year_to:2017, notes:'1LK & 1LH – Front',            parts:['DBA2830E'] },
  { model:'TT', series:'8V', year_from:2015, year_to:2017, notes:'1KZ – Rear',                   parts:['DBA2814E'] },
  { model:'TT', series:'8V', year_from:2015, year_to:2017, notes:'2ED – Rear',                   parts:['DBA2837E'] },
  { model:'TT', series:'8V', year_from:2015, year_to:2017, notes:'2EG & 2EK – Rear',             parts:['DBA2809E'] },
  // ─── R8 Series 42 ────────────────────────────────────────────────────────────
  { model:'R8', series:'42', year_from:2008, year_to:2013, notes:'V8 & V10 1LA – Front',         parts:['DBA52834'] },
  { model:'R8', series:'42', year_from:2008, year_to:2013, notes:'2ED – Front',                  parts:['DBA52833'] },
  { model:'R8', series:'42', year_from:2014, year_to:2016, notes:'Wave Design – Front',          parts:['DBA52834W'] },
  // ─── R8 4S ───────────────────────────────────────────────────────────────────
  { model:'R8', series:'4S', year_from:2017, month_from:9, year_to:null, notes:'RWS 5.2L V10 Wave – Front', parts:['DBA52834W'] },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA AUDI TT / R8 ===');

  // 0. Correct DBA52834 description (catalogue: B=52.4, D=32.4)
  if (!DRY_RUN) {
    await api('/parts?brand=eq.DBA&part_number=eq.DBA52834', {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ description: dim({ type:'Vented', a:365, b:52.4, c:34, d:32.4, e:68, f:5 }) }),
    });
    console.log('✓ Corrected DBA52834: Ht 54→52.4mm, min 32→32.4mm');
  } else {
    console.log('[dry] Would correct DBA52834: Ht 54→52.4mm, min 32→32.4mm');
  }

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
    const [dba52834] = await api('/parts?brand=eq.DBA&part_number=eq.DBA52834&select=id,part_number');
    if (dba52834) upsertedParts.push(dba52834);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    upsertedParts = PARTS.map(p => ({ part_number: p.part_number, id: `(${p.part_number})` }));
    upsertedParts.push({ part_number: 'DBA52834', id: '(DBA52834)' });
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Vehicles
  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Audi&model=in.(TT,R8)&select=id,model,series,year_from,month_from,year_to,month_to,notes');

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Audi', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    month_from: null, month_to: null,
    ...v,
  }));

  const key = v => `${v.model}|${v.series ?? ''}|${v.year_from}|${v.month_from ?? ''}|${v.year_to ?? ''}|${v.month_to ?? ''}|${(v.notes ?? '').substring(0, 30)}`;
  const existingKeys = new Set(existing.map(key));
  const toInsert = vehicleRows.filter(v => !existingKeys.has(key(v)));
  console.log(`Existing: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    for (let i = 0; i < toInsert.length; i += 20) {
      const inserted = await api('/vehicles', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=representation' },
        body: JSON.stringify(toInsert.slice(i, i + 20)),
      });
      for (const v of inserted) console.log(`  ✓ ${v.id}  Audi ${v.model} ${v.series} ${v.year_from}`);
      allVehicles.push(...inserted);
    }
  } else if (DRY_RUN) {
    for (const v of toInsert) {
      const date = v.month_from ? `${v.month_from}/${v.year_from}` : String(v.year_from);
      console.log(`  Would insert: Audi ${v.model} ${v.series} ${date} "${v.notes}"`);
    }
  }

  if (!DRY_RUN) allVehicles = await api('/vehicles?make=eq.Audi&model=in.(TT,R8)&select=id,model,series,year_from,month_from,year_to,month_to,notes');

  // 3. Fitments
  console.log('\n--- Fitments ---');
  const fitments = [];
  for (const vDef of VEHICLES) {
    const matches = allVehicles.filter(v =>
      v.model    === vDef.model &&
      (vDef.series === null || v.series === vDef.series) &&
      v.year_from === vDef.year_from &&
      String(v.year_to ?? '') === String(vDef.year_to ?? '') &&
      (v.month_from ?? null) === (vDef.month_from ?? null) &&
      (v.notes ?? '').substring(0, 30) === (vDef.notes ?? '').substring(0, 30)
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
    for (let i = 0; i < newFit.length; i += 200) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFit.slice(i, i + 200)),
      });
    }
    for (const f of newFit) {
      const v = allVehicles.find(v => v.id === f.vehicle_id);
      console.log(`  ✓ Audi ${v?.model} ${v?.series} ${v?.year_from} ← ${f.part_id} (${f.position})`);
    }
  }

  console.log('\nDone.');
}
main().catch(err => { console.error(err); process.exit(1); });
