#!/usr/bin/env node
// Import Gates Australia catalogue from extracted CSV
// Source: gates_au_catalogue.csv
//
// Usage:
//   node scripts/importers/import-gates.js [--dry-run] [--make <name>]

const fs   = require('fs');
const path = require('path');

const DRY_RUN  = process.argv.includes('--dry-run');
const makeIdx  = process.argv.indexOf('--make');
const MAKE_ARG = makeIdx >= 0 ? process.argv[makeIdx + 1] : null;

const CSV_PATH = path.join(__dirname, '..', '..', 'gates_au_catalogue.csv');

// ─── Env ──────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: HDRS, ...opts });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function apiGetAll(urlPath) {
  const all = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const res = await fetch(`${BASE}/rest/v1${urlPath}`, {
      headers: { ...HDRS, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
function splitCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const hdrs = splitCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = splitCSVLine(l);
    const row = {};
    hdrs.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ─── Make normalisation ───────────────────────────────────────────────────────
const MAKE_MAP = {
  'ABARTH':           'Abarth',
  'ALFA ROMEO':       'Alfa Romeo',
  'ALPINA':           'Alpina',
  'ASIA MOTORS':      'Asia Motors',
  'ASTON MARTIN':     'Aston Martin',
  'AUDI':             'Audi',
  'AUSTIN':           'Austin',
  'AUSTIN-HEALEY':    'Austin-Healey',
  'BEDFORD':          'Bedford',
  'BENTLEY':          'Bentley',
  'BMW':              'BMW',
  'BOLWELL':          'Bolwell',
  'CADILLAC':         'Cadillac',
  'CHERY':            'Chery',
  'CHEVROLET':        'Chevrolet',
  'CHRYSLER':         'Chrysler',
  'CITROËN':          'Citroen',
  'CITROEN':          'Citroen',
  'CUPRA':            'Cupra',
  'DAEWOO':           'Daewoo',
  'DAIHATSU':         'Daihatsu',
  'DAIMLER':          'Daimler',
  'DODGE':            'Dodge',
  'DS':               'DS',
  'EUNOS':            'Eunos',
  'FERRARI':          'Ferrari',
  'FIAT':             'Fiat',
  'FORD':             'Ford',
  'FOTON':            'Foton',
  'FPV':              'FPV',
  'GMC':              'GMC',
  'GREAT WALL':       'Great Wall',
  'HAVAL':            'Haval',
  'HDT':              'HDT',
  'HILLMAN':          'Hillman',
  'HOLDEN':           'Holden',
  'HONDA':            'Honda',
  'HSV':              'HSV',
  'HUMMER':           'Hummer',
  'HYUNDAI':          'Hyundai',
  'INFINITI':         'Infiniti',
  'ISUZU':            'Isuzu',
  'IVECO':            'Iveco',
  'JAGUAR':           'Jaguar',
  'JEEP':             'Jeep',
  'KIA':              'Kia',
  'LADA':             'Lada',
  'LAMBORGHINI':      'Lamborghini',
  'LANCIA':           'Lancia',
  'LAND ROVER':       'Land Rover',
  'LDV':              'LDV',
  'LEXUS':            'Lexus',
  'LEYLAND-INNOCENTI':'Leyland-Innocenti',
  'LINCOLN':          'Lincoln',
  'LOTUS':            'Lotus',
  'MASERATI':         'Maserati',
  'MAZDA':            'Mazda',
  'MERCEDES-BENZ':    'Mercedes-Benz',
  'MG':               'MG',
  'MINI':             'Mini',
  'MITSUBISHI':       'Mitsubishi',
  'MORGAN':           'Morgan',
  'MORRIS':           'Morris',
  'NISSAN':           'Nissan',
  'OPEL':             'Opel',
  'PEUGEOT':          'Peugeot',
  'PONTIAC':          'Pontiac',
  'PORSCHE':          'Porsche',
  'PROTON':           'Proton',
  'RAM':              'Ram',
  'RENAULT':          'Renault',
  'ROLLS-ROYCE':      'Rolls-Royce',
  'ROVER':            'Rover',
  'SAAB':             'Saab',
  'SEAT':             'SEAT',
  'SKODA':            'Skoda',
  'SMART':            'Smart',
  'SSANGYONG':        'SsangYong',
  'SUBARU':           'Subaru',
  'SUZUKI':           'Suzuki',
  'TESLA':            'Tesla',
  'TOYOTA':           'Toyota',
  'TRIUMPH':          'Triumph',
  'VOLKSWAGEN':       'Volkswagen',
  'VOLVO':            'Volvo',
};

// ─── Category mapping ─────────────────────────────────────────────────────────
// Gates Part_Type → part_categories id
const PART_TYPE_CATEGORY = {
  // Timing / synchronous
  'Timing Belt':                              10, // Timing Belt Kit
  'Timing Belt Kit':                          10,
  'Timing Belt Set':                          10,
  'Tensioner Pulley, timing belt':            10,
  'Tensioner, timing belt':                   10,
  'Deflection/Guide Pulley, timing belt':     10,
  'Idler Pulley, timing belt':                10,
  // Drive belts / accessory
  'V-ribbed Belt':                            15, // Drive Belts
  'V-Belt':                                   15,
  'Micro-V® Belt':                            15,
  'Belt Tensioner, V-ribbed belt':            15,
  'Tensioner Pulley, V-ribbed belt':          15,
  'Deflection/Guide Pulley, V-ribbed belt':   15,
  'Tensioner Pulley, V-belt':                 15,
  'Deflection/Guide Pulley, V-belt':          15,
  'Alternator Freewheel Clutch':              15,
  'Belt Pulley, crankshaft':                  15,
  // Water pump / cooling
  'Water Pump':                               12, // Water Pump
  'Water Pump Kit':                           12,
  'Thermostat, coolant':                      13, // Thermostat
  'Thermostat Housing':                       13,
  'Radiator Hose':                            14, // Radiator Hoses
  'Radiator Hose Set':                        14,
  'Heater Hose':                              14,
  'Coolant Pipe':                             14,
  'Cap, coolant tank':                        14,
  'Cap, radiator':                            14,
  // Heater control valves (separate from hoses and water pumps)
  'Heater Control Valve':                     52, // Heater Control Valve (category_id=52)
  'Coolant Control Valve':                    52,
  // Fuel
  'Fuel Hose':                                41, // Fuel
  'Cap, fuel tank':                           41,
  // Steering
  'Hydraulic Hose, steering':                 27, // Suspension (closest)
  // Air supply
  'Hose, air supply':                         2,  // Air Filter (closest)
  'Charge Air Hose':                          2,
  'Hose, crankcase ventilation':              39, // Engine
};

function getCategoryId(partType, productCategory) {
  if (PART_TYPE_CATEGORY[partType]) return PART_TYPE_CATEGORY[partType];
  // Fallback by product category
  if (productCategory === 'Synchronous Drive System') return 10;
  if (productCategory === 'Accessory Drive System')   return 15;
  if (productCategory === 'Cooling System')           return 12;
  if (productCategory === 'Fuel System')              return 41;
  if (productCategory === 'Steering System')          return 27;
  if (productCategory === 'Engine Air Supply')        return 2;
  return 39; // Engine (generic fallback)
}

// ─── Year parsing ─────────────────────────────────────────────────────────────
// Years field is "2019, 2018, 2017, 2016" — get min and max
function parseYearRange(yearsStr) {
  if (!yearsStr) return null;
  const years = yearsStr.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
  if (years.length === 0) return null;
  return { yearFrom: Math.min(...years), yearTo: Math.max(...years) };
}

function yearOverlap(v, yearFrom, yearTo) {
  const dFrom = yearFrom ?? 0;
  const dTo   = yearTo   ?? 9999;
  return (v.year_from ?? 0) <= dTo && (v.year_to ?? 9999) >= dFrom;
}

// ─── Model matching ───────────────────────────────────────────────────────────
function normModel(s) {
  return s.toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function modelMatch(csvModel, dbModel) {
  const c = normModel(csvModel);
  const d = normModel(dbModel);
  if (c === d) return true;
  if (d.includes(c)) return true;
  if (c.includes(d)) return true;
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT GATES AUSTRALIA ===');
  if (MAKE_ARG) console.log(`Make filter: "${MAKE_ARG}"`);

  // ── 1. Parse CSV ───────────────────────────────────────────────────────────
  const rawContent = fs.readFileSync(CSV_PATH, 'utf8').replace(/\uFFFD/g, '');
  const allRows = parseCSV(rawContent);

  let rows = allRows.filter(r => r['Part_Number']?.trim() && r['Make']?.trim() && r['Model']?.trim());

  if (MAKE_ARG) {
    rows = rows.filter(r => r['Make'].toUpperCase().includes(MAKE_ARG.toUpperCase()));
  }

  console.log(`\nTotal rows: ${allRows.length}`);
  console.log(`Valid rows: ${rows.length}`);

  // ── 2. Build unique parts ──────────────────────────────────────────────────
  const partMap = new Map(); // part_number → part object
  for (const row of rows) {
    const pn = row['Part_Number'].trim();
    if (partMap.has(pn)) continue;
    const partType = row['Part_Type']?.trim() || '';
    const prodCat  = row['Product_Category']?.trim() || '';
    partMap.set(pn, {
      brand:       'Gates',
      part_number: pn,
      name:        row['Part_Description']?.trim() || pn,
      category:    partType || prodCat || 'Gates',
      category_id: getCategoryId(partType, prodCat),
    });
  }

  console.log(`Unique parts: ${partMap.size}`);

  // ── 3. Upsert parts ────────────────────────────────────────────────────────
  const partRows  = [...partMap.values()];
  const partIdMap = {};

  if (!DRY_RUN) {
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < partRows.length; i += BATCH) {
      const chunk = partRows.slice(i, i + BATCH);
      const upserted = await api('/parts?on_conflict=brand,part_number', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=merge-duplicates,return=representation' },
        body:    JSON.stringify(chunk),
      });
      for (const p of upserted) partIdMap[p.part_number] = p.id;
      done += upserted.length;
      process.stdout.write(`\r  Parts upserted: ${done}/${partRows.length}`);
    }
    console.log();
  } else {
    console.log('  (dry-run) sample parts:');
    partRows.slice(0, 6).forEach(p => console.log(`    ${p.part_number}  →  ${p.name}  [cat ${p.category_id}]`));
    if (partRows.length > 6) console.log(`    ... +${partRows.length - 6} more`);
    partRows.forEach(p => { partIdMap[p.part_number] = `dry_${p.part_number}`; });
  }

  // ── 4. Load vehicles per make ──────────────────────────────────────────────
  const allDbMakes = [...new Set(rows.map(r => MAKE_MAP[r['Make']?.trim()] ?? null).filter(Boolean))];
  const makeVehicles = new Map();

  console.log('\nLoading vehicles from DB...');
  for (const make of allDbMakes) {
    const vs = await apiGetAll(`/vehicles?make=eq.${encodeURIComponent(make)}&select=id,model,series,year_from,year_to`);
    makeVehicles.set(make, vs);
    console.log(`  ${make}: ${vs.length} vehicles`);
  }

  // ── 5. Match rows to vehicles ──────────────────────────────────────────────
  const fitments   = [];
  const fitmentSet = new Set();
  const unmatched  = new Map();

  for (const row of rows) {
    const makeRaw = row['Make']?.trim();
    const dbMake  = MAKE_MAP[makeRaw];
    if (!dbMake) continue;

    const model   = row['Model']?.trim();
    const pn      = row['Part_Number']?.trim();
    const partId  = partIdMap[pn];
    if (!partId) continue;

    const yr = parseYearRange(row['Years']);
    if (!yr) continue;

    const vehicles = makeVehicles.get(dbMake) ?? [];
    const matched  = vehicles.filter(v =>
      modelMatch(model, v.model) && yearOverlap(v, yr.yearFrom, yr.yearTo)
    );

    if (matched.length === 0) {
      const key = `${dbMake} | ${model} | ${yr.yearFrom}–${yr.yearTo}`;
      unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
      continue;
    }

    for (const v of matched) {
      const key = `${v.id}|${partId}`;
      if (fitmentSet.has(key)) continue;
      fitmentSet.add(key);
      fitments.push({ vehicle_id: v.id, part_id: partId });
    }
  }

  console.log(`\nNew fitments to insert: ${fitments.length}`);
  console.log(`Unmatched row groups:   ${unmatched.size}`);

  // ── 6. Insert fitments ─────────────────────────────────────────────────────
  if (!DRY_RUN && fitments.length > 0) {
    const BATCH = 500;
    let done = 0;
    for (let i = 0; i < fitments.length; i += BATCH) {
      await api('/vehicle_part_fitments', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body:    JSON.stringify(fitments.slice(i, i + BATCH)),
      });
      done += Math.min(BATCH, fitments.length - i);
      process.stdout.write(`\r  Fitments: ${done}/${fitments.length}`);
    }
    console.log('\nDone!');
  } else if (DRY_RUN) {
    console.log('  (dry-run) sample fitments:');
    fitments.slice(0, 5).forEach(f => console.log(`    vehicle ${f.vehicle_id} → part ${f.part_id}`));
    if (fitments.length > 5) console.log(`    ... +${fitments.length - 5} more`);
  }

  // ── 7. Top unmatched ───────────────────────────────────────────────────────
  if (unmatched.size > 0) {
    console.log(`\n--- Top unmatched (${unmatched.size} groups) ---`);
    [...unmatched.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([k, n]) => console.log(`  ${n}x  ${k}`));
    if (unmatched.size > 20) console.log(`  ... +${unmatched.size - 20} more`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
