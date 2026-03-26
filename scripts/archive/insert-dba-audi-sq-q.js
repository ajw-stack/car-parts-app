#!/usr/bin/env node
// DBA Catalogue 2020 — AUDI SQ5 / SQ7 / Q2 / Q3 / RS Q3 / Q5 / Q7  (+ A8 D2)
// Usage: node scripts/insert-dba-audi-sq-q.js [--dry-run]

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
  // ─── SQ5 8R ──────────────────────────────────────────────────────────────────
  { part_number: 'DBA3008E',  pos: 'Front', description: dim({ type:'Vented', a:320,   b:52.4, c:30, d:28,   e:68, f:5 }) },
  { part_number: 'DBA52774',  pos: 'Front', description: dim({ type:'Vented', a:345,   b:52,   c:30, d:28,   e:68, f:5 }) }, // *B,C,D estimated
  // ─── SQ7 / Q7 ────────────────────────────────────────────────────────────────
  { part_number: 'DBA3007E',  pos: 'Front', description: dim({ type:'Vented', a:350,   b:36.4, c:28, d:26,   e:68, f:5 }) },
  // ─── Q3 / RS Q3 / Q2 / TT shared ────────────────────────────────────────────
  { part_number: 'DBA2806E',  pos: 'Front', description: dim({ type:'Vented', a:312,   b:49.8, c:25, d:22,   e:65, f:5 }) },
  { part_number: 'DBA2814E',  pos: 'Rear',  description: dim({ type:'Solid',  a:272,   b:48.4, c:10, d:8,    e:65, f:5 }) },
  { part_number: 'DBA2816E',  pos: 'Rear',  description: dim({ type:'Solid',  a:282,   b:47.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2837E',  pos: 'Rear',  description: dim({ type:'Solid',  a:300,   b:48.3, c:12, d:10,   e:65, f:5 }) },
  { part_number: 'DBA2809E',  pos: 'Rear',  description: dim({ type:'Vented', a:310,   b:48.5, c:22, d:20,   e:65, f:5 }) },
  { part_number: 'DBA52836',  pos: 'Front', description: dim({ type:'Vented', a:365,   b:49.7, c:34, d:32.4, e:65.5, f:5 }) },
  // ─── Q7 4L / 4M ──────────────────────────────────────────────────────────────
  { part_number: 'DBA2246E',  pos: 'Front', description: dim({ type:'Vented', a:350,   b:69,   c:34, d:32,   e:85, f:5 }) },
  { part_number: 'DBA2245E',  pos: 'Rear',  description: dim({ type:'Vented', a:330,   b:74,   c:28, d:26,   e:85, f:5 }) },
  { part_number: 'DBA2249',   pos: 'Rear',  description: dim({ type:'Vented', a:358,   b:73.5, c:28, d:26,   e:85, f:5 }) },
  { part_number: 'DBA3014',   pos: 'Front', description: dim({ type:'Vented', a:375,   b:69,   c:36, d:34,   e:85, f:5 }) }, // *B,C,D estimated
];

const PART_POSITION = Object.fromEntries(PARTS.map(p => [p.part_number, p.pos]));

// Parts already in DB (from A4-A8 script) — fetch IDs below
// DBA2822E (correct B 52.5→52), DBA2832E (correct B 51→52), DBA52832W (correct B 51→52),
// DBA2823, DBA2847E, DBA2826E, DBA806
PART_POSITION['DBA2822E']  = 'Front';
PART_POSITION['DBA2832E']  = 'Front';
PART_POSITION['DBA52832W'] = 'Front';
PART_POSITION['DBA2823']   = 'Rear';
PART_POSITION['DBA2847E']  = 'Rear';
PART_POSITION['DBA2826E']  = 'Front';
PART_POSITION['DBA806']    = 'Front'; // Front on A4; overridden to Rear for A8 D2 below

// Position overrides: model|series|part_number → position
const POSITION_OVERRIDES = {
  'Q7|4L|DBA3007E':  'Rear',
  'Q7|4M|DBA3007E':  'Rear',
  'A8|D2|DBA806':    'Rear',
};

const VEHICLES = [
  // ─── SQ5 8R Twin Turbo 2013–2017 ─────────────────────────────────────────────
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1LB & 1LC – Front',              parts:['DBA3008E'] },
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1LJ – Front',                    parts:['DBA2832E'] },
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1LJ, 1LE & 1LP Wave – Front',    parts:['DBA52832W'] },
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1LV & 1ZK – Front',              parts:['DBA52774'] },
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1KW & 2EK – Rear',               parts:['DBA2823'] },
  { model:'SQ5',   series:'8R', year_from:2013, year_to:2017, notes:'1KE, 1KF, 2EL & 2EJ – Rear',    parts:['DBA2847E'] },
  // ─── SQ7 4M 12/2016–on ───────────────────────────────────────────────────────
  { model:'SQ7',   series:'4M', year_from:2016, month_from:12, year_to:null, notes:'1KQ, 1KU, 1KW, 1KD & 2EA – Front', parts:['DBA3007E'] },
  // ─── A8 D2 1998–1999 (front DBA2826E, rear DBA806) ───────────────────────────
  { model:'A8',    series:'D2', year_from:1998, year_to:1999, notes:'1LG – Front',                    parts:['DBA2826E'] },
  { model:'A8',    series:'D2', year_from:1998, year_to:1999, notes:'Rear',                           parts:['DBA806'] },
  // ─── Q2 GA 06/2016–on ────────────────────────────────────────────────────────
  { model:'Q2',    series:'GA', year_from:2016, month_from:6, year_to:null, notes:'1ZA & 1ZD – Front', parts:['DBA2806E'] },
  { model:'Q2',    series:'GA', year_from:2016, month_from:6, year_to:null, notes:'1KE – Rear',        parts:['DBA2814E'] },
  // ─── Q3 8U 2012–2017 ─────────────────────────────────────────────────────────
  { model:'Q3',    series:'8U', year_from:2012, year_to:2017, notes:'1LJ & 1ZD – Front',              parts:['DBA2806E'] },
  { model:'Q3',    series:'8U', year_from:2012, year_to:2014, notes:'1KU – Rear',                     parts:['DBA2816E'] },
  { model:'Q3',    series:'8U', year_from:2015, year_to:2017, notes:'1KU – Rear',                     parts:['DBA2837E'] },
  // ─── RS Q3 8U 02/2014–on ─────────────────────────────────────────────────────
  { model:'RS Q3', series:'8U', year_from:2014, month_from:2, year_to:null, notes:'2.5L Turbo 1LA & 1ZT – Front', parts:['DBA52836'] },
  { model:'RS Q3', series:'8U', year_from:2014, month_from:2, year_to:null, notes:'2EA & 2EJ – Rear',             parts:['DBA2809E'] },
  // ─── Q5 8R Gen 1  03/2009–2015 ───────────────────────────────────────────────
  { model:'Q5',    series:'8R', year_from:2009, month_from:3, year_to:2015, notes:'1LA & 1ZB – Front',             parts:['DBA2822E'] },
  { model:'Q5',    series:'8R', year_from:2009, month_from:3, year_to:2015, notes:'1LE, 1LJ, 1LP & 1ZT – Front',  parts:['DBA2832E'] },
  { model:'Q5',    series:'8R', year_from:2009, month_from:3, year_to:2015, notes:'1LE, 1LJ, 1LP & 1ZT Wave – Front', parts:['DBA52832W'] },
  { model:'Q5',    series:'8R', year_from:2009, month_from:3, year_to:2010, month_to:10, notes:'1KW & 2EK – Rear', parts:['DBA2823'] },
  { model:'Q5',    series:'8R', year_from:2010, month_from:11, year_to:2015, notes:'1KE & 2EL – Rear',             parts:['DBA2847E'] },
  // ─── Q5 8R Gen 2  04/2016–on ─────────────────────────────────────────────────
  { model:'Q5',    series:'8R', year_from:2016, month_from:4, year_to:null, notes:'1LB & 1LC – Front',             parts:['DBA3008E'] },
  { model:'Q5',    series:'8R', year_from:2016, month_from:4, year_to:null, notes:'1LJ, 1LE & 1LP – Front',        parts:['DBA2832E'] },
  { model:'Q5',    series:'8R', year_from:2016, month_from:4, year_to:null, notes:'1LJ, 1LE & 1LP Wave – Front',   parts:['DBA52832W'] },
  { model:'Q5',    series:'8R', year_from:2016, month_from:4, year_to:null, notes:'1KW & 2EK – Rear',              parts:['DBA2823'] },
  { model:'Q5',    series:'8R', year_from:2016, month_from:4, year_to:null, notes:'1KE & 2EL – Rear',              parts:['DBA2847E'] },
  // ─── Q7 4L  03/2006–2015 ─────────────────────────────────────────────────────
  { model:'Q7',    series:'4L', year_from:2006, month_from:3, year_to:2015, notes:'1LF – Front',                   parts:['DBA2246E'] },
  { model:'Q7',    series:'4L', year_from:2006, month_from:3, year_to:2015, notes:'Rear',                          parts:['DBA2245E'] },
  { model:'Q7',    series:'4L', year_from:2006, month_from:3, year_to:2015, notes:'1KD & 2EA – Rear',              parts:['DBA2249'] },
  // ─── Q7 4M  08/2015–on ───────────────────────────────────────────────────────
  { model:'Q7',    series:'4M', year_from:2015, month_from:8, year_to:null, notes:'1LF, 1ZA & 1ZK – Front',        parts:['DBA2246E'] },
  { model:'Q7',    series:'4M', year_from:2015, month_from:8, year_to:null, notes:'1LN, 1LP & 1ZT – Front',        parts:['DBA3014'] },
  { model:'Q7',    series:'4M', year_from:2015, month_from:8, year_to:null, notes:'2ED & 2EE – Rear',              parts:['DBA2847E'] },
  { model:'Q7',    series:'4M', year_from:2015, month_from:8, year_to:null, notes:'1KQ, 1KU, 1KW, 1KD & 2EA – Rear', parts:['DBA3007E'] },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA AUDI SQ/Q ===');

  // 1. Upsert new parts (also corrects DBA2822E B=52.5→52, DBA2832E/DBA52832W B=51→52
  //    via the existing-parts upsert below)
  console.log('\n--- Parts ---');
  const partRows = PARTS.map(p => ({
    brand: 'DBA', part_number: p.part_number,
    name: `Street Series Rotor ${p.pos}`,
    description: p.description,
    category: 'Brake Rotor', category_id: 31,
  }));

  // Also correct the existing parts already in DB
  const existingPartCorrections = [
    { part_number: 'DBA2822E',  pos: 'Front', description: dim({ type:'Vented', a:320, b:52,   c:30, d:28, e:68, f:5 }) },
    { part_number: 'DBA2832E',  pos: 'Front', description: dim({ type:'Vented', a:345, b:52,   c:30, d:28, e:68, f:5 }) },
    { part_number: 'DBA52832W', pos: 'Front', description: dim({ type:'Vented', a:345, b:52,   c:30, d:28, e:68, f:5 }) },
    { part_number: 'DBA2823',   pos: 'Rear',  description: dim({ type:'Solid',  a:300, b:36,   c:12, d:10, e:68, f:5 }) },
    { part_number: 'DBA2847E',  pos: 'Rear',  description: dim({ type:'Solid',  a:330, b:36,   c:22, d:20, e:68, f:5 }) },
    { part_number: 'DBA2826E',  pos: 'Front', description: dim({ type:'Vented', a:321, b:59.6, c:30, d:28, e:68, f:5 }) }, // correct B 59.4→59.6
  ];

  const allPartRows = [...partRows, ...existingPartCorrections.map(p => ({
    brand: 'DBA', part_number: p.part_number,
    name: `Street Series Rotor ${p.pos}`,
    description: p.description,
    category: 'Brake Rotor', category_id: 31,
  }))];

  let upsertedParts;
  if (!DRY_RUN) {
    upsertedParts = await api('/parts?on_conflict=brand,part_number', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(allPartRows),
    });
    for (const p of upsertedParts) console.log(`  ✓ ${p.part_number}`);
    // Also fetch DBA806 id (already in DB, not in upsert batch)
    const [dba806] = await api('/parts?brand=eq.DBA&part_number=eq.DBA806&select=id,part_number');
    if (dba806) upsertedParts.push(dba806);
  } else {
    for (const p of partRows) console.log(`  ${p.part_number}: ${p.description}`);
    for (const p of existingPartCorrections) console.log(`  [correct] ${p.part_number}: ${p.description}`);
    upsertedParts = allPartRows.map(p => ({ part_number: p.part_number, id: `(${p.part_number})` }));
    upsertedParts.push({ part_number: 'DBA806', id: '(DBA806)' });
  }

  const partIdMap = Object.fromEntries(upsertedParts.map(p => [p.part_number, p.id]));

  // 2. Vehicles
  console.log('\n--- Vehicles ---');
  const models = ['SQ5', 'SQ7', 'A8', 'Q2', 'Q3', 'RS Q3', 'Q5', 'Q7'];
  const modelParam = models.map(m => encodeURIComponent(m)).join(',');
  const existing = await api(`/vehicles?make=eq.Audi&model=in.(${modelParam})&select=id,model,series,year_from,month_from,year_to,month_to,notes`);

  const vehicleRows = VEHICLES.map(({ parts: _, ...v }) => ({
    make: 'Audi', fuel_type: 'ULP',
    series: null, trim_code: null, notes: null,
    engine_litres: null, engine_config: null, engine_kw: null,
    month_from: null, month_to: null,
    ...v,
  }));

  const key = v => `${v.model}|${v.series ?? ''}|${v.year_from}|${v.month_from ?? ''}|${v.year_to ?? ''}|${v.month_to ?? ''}|${(v.notes ?? '').substring(0, 35)}`;
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

  if (!DRY_RUN) {
    const allVehicles2 = await api(`/vehicles?make=eq.Audi&model=in.(${modelParam})&select=id,model,series,year_from,month_from,year_to,month_to,notes`);
    allVehicles = allVehicles2;
  }

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
      (v.month_to   ?? null) === (vDef.month_to   ?? null) &&
      (v.notes ?? '').substring(0, 35) === (vDef.notes ?? '').substring(0, 35)
    );
    for (const v of matches) {
      for (const pn of vDef.parts) {
        const pid = partIdMap[pn];
        if (!pid) { console.warn(`  No id for ${pn}`); continue; }
        const overrideKey = `${v.model}|${v.series}|${pn}`;
        const position = POSITION_OVERRIDES[overrideKey] ?? PART_POSITION[pn];
        fitments.push({ vehicle_id: v.id, part_id: pid, position, qty: 1, notes: null });
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
