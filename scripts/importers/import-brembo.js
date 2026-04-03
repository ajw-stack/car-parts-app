#!/usr/bin/env node
// Import Brembo brake parts from extracted CSV files
// Source: brembo_data/brembo_*.csv
//
// Usage:
//   node scripts/importers/import-brembo.js [--dry-run] [--make <name>]
//
// Vehicle matching: make + year range overlap + optional kW match (±10kW)
// Vehicles are master data — this script NEVER creates vehicles.

const fs   = require('fs');
const path = require('path');

const DRY_RUN  = process.argv.includes('--dry-run');
const makeIdx  = process.argv.indexOf('--make');
const MAKE_ARG = makeIdx >= 0 ? process.argv[makeIdx + 1] : null;

const DATA_DIR = path.join(__dirname, '..', '..', 'brembo_data');

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
function splitLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
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
  const hdrs = splitLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = splitLine(l);
    const row = {};
    hdrs.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ─── Make normalisation (file key → DB make name) ────────────────────────────
const MAKE_MAP = {
  TOYOTA:         'Toyota',
  FORD:           'Ford',
  FORD_AUSTRALIA: 'Ford',
  FORD_USA:       'Ford',
  HOLDEN:         'Holden',
  HSV:            'HSV',
  FPV:            'FPV',
  HONDA:          'Honda',
  MAZDA:          'Mazda',
  NISSAN:         'Nissan',
  MITSUBISHI:     'Mitsubishi',
  SUBARU:         'Subaru',
  HYUNDAI:        'Hyundai',
  KIA:            'Kia',
  'MERCEDES-BENZ':'Mercedes-Benz',
  BMW:            'BMW',
  AUDI:           'Audi',
  VOLKSWAGEN:     'Volkswagen',
  VOLVO:          'Volvo',
  PEUGEOT:        'Peugeot',
  RENAULT:        'Renault',
  CITROËN:        'Citroen',
  CITROEN:        'Citroen',
  ALFA_ROMEO:     'Alfa Romeo',
  FIAT:           'Fiat',
  JEEP:           'Jeep',
  CHRYSLER:       'Chrysler',
  DODGE:          'Dodge',
  CHEVROLET:      'Chevrolet',
  LEXUS:          'Lexus',
  LAND_ROVER:     'Land Rover',
  JAGUAR:         'Jaguar',
  PORSCHE:        'Porsche',
  MINI:           'Mini',
  SUZUKI:         'Suzuki',
  DAIHATSU:       'Daihatsu',
  ISUZU:          'Isuzu',
  SKODA:          'Skoda',
  SEAT:           'SEAT',
  SSANGYONG:      'SsangYong',
  GREAT_WALL:     'Great Wall',
  HAVAL:          'Haval',
  LDV:            'LDV',
  TESLA:          'Tesla',
  GENESIS:        'Genesis',
  INFINITI:       'Infiniti',
  MASERATI:       'Maserati',
  FERRARI:        'Ferrari',
  LAMBORGHINI:    'Lamborghini',
  ASTON_MARTIN:   'Aston Martin',
  BENTLEY:        'Bentley',
  'ROLLS-ROYCE':  'Rolls-Royce',
  SAAB:           'Saab',
  OPEL:           'Opel',
  DAEWOO:         'Daewoo',
  SMART:          'Smart',
  MG:             'MG',
  PROTON:         'Proton',
  DS:             'DS',
  CUPRA:          'Cupra',
  POLESTAR:       'Polestar',
  BYD:            'BYD',
  CHERY:          'Chery',
  GEELY:          'Geely',
  MAHINDRA:       'Mahindra',
  TATA:           'Tata',
  MORRIS:         'Morris',
  ROVER:          'Rover',
  LOTUS:          'Lotus',
  MORGAN:         'Morgan',
  TRIUMPH:        'Triumph',
  ABARTH:         'Abarth',
  ALPINE:         'Alpine',
  ALPINA:         'Alpina',
  MCLAREN:        'McLaren',
  PONTIAC:        'Pontiac',
  BUICK:          'Buick',
  CADILLAC:       'Cadillac',
  GMC:            'GMC',
  LINCOLN:        'Lincoln',
  HUMMER:         'Hummer',
  RAM:            'Ram',
  DAIMLER:        'Daimler',
  AUSTIN:         'Austin',
  'AUSTIN-HEALEY':'Austin-Healey',
  LANCIA:         'Lancia',
  AC:             'AC',
  CATERHAM:       'Caterham',
  DE_TOMASO:      'De Tomaso',
  EUNOS:          'Eunos',
  KG_MOBILITY:    'KG Mobility',
  JMC:            'JMC',
  NSU:            'NSU',
  AUTO_UNION:     'Auto Union',
  NOBLE:          'Noble',
  TVR:            'TVR',
  RELIANT:        'Reliant',
  RILEY:          'Riley',
  ENGLON:         'Englon',
  CARBODIES:      'Carbodies',
  IVECO:          'Iveco',
  MAYBACH:        'Maybach',
  WOLSELEY:       'Wolseley',
};

// ─── Year parsing (Brembo uses MM/YY 2-digit format) ─────────────────────────
function expand2(yy) {
  const n = +yy;
  return n <= 30 ? 2000 + n : 1900 + n;
}

function parseMonthYear(s) {
  if (!s) return null;
  s = s.trim();
  // MM/YY (2-digit year)
  let m = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (m) return { month: +m[1], year: expand2(m[2]) };
  // MM/YYYY (4-digit year)
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return { month: +m[1], year: +m[2] };
  // YYYY
  m = s.match(/^(\d{4})$/);
  if (m) return { month: null, year: +m[1] };
  return null;
}

function yearOverlap(v, fromYear, toYear) {
  const dFrom = fromYear ?? 0;
  const dTo   = toYear   ?? 9999;
  return (v.year_from ?? 0) <= dTo && (v.year_to ?? 9999) >= dFrom;
}

// ─── Part helpers ─────────────────────────────────────────────────────────────
function buildPartName(row) {
  const pos = row.position?.trim();
  const posStr = pos ? ` ${pos}` : '';
  return `${row.category} - ${row.product_line}${posStr}`.trim();
}

function buildDescription(row) {
  const parts = [];
  if (row.brake_disc_type?.trim())  parts.push(row.brake_disc_type.trim());
  if (row.diameter?.trim())         parts.push(`Ø${row.diameter.trim()}`);
  if (row.thickness?.trim())        parts.push(`${row.thickness.trim()} thick`);
  if (row.min_thickness?.trim())    parts.push(`min ${row.min_thickness.trim()}`);
  if (row.number_of_holes?.trim())  parts.push(`${row.number_of_holes.trim()}-hole`);
  if (row.braking_system?.trim())   parts.push(`System: ${row.braking_system.trim()}`);
  if (row.wear_indicator?.trim() && row.wear_indicator.trim().toLowerCase() !== 'without')
    parts.push(`Wear indicator: ${row.wear_indicator.trim()}`);
  if (row.accessories?.trim())      parts.push(row.accessories.trim());
  return parts.join(' | ') || null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT BREMBO ===');
  if (MAKE_ARG) console.log(`Make filter: "${MAKE_ARG}"`);

  // ── Gather CSV files ───────────────────────────────────────────────────────
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('brembo_') && f.endsWith('.csv'))
    .sort();

  const filteredFiles = MAKE_ARG
    ? files.filter(f => f.toLowerCase().includes(MAKE_ARG.toLowerCase()))
    : files;

  console.log(`\nProcessing ${filteredFiles.length} file(s)...`);

  // ── 1. Parse all rows + build part map ────────────────────────────────────
  const allRows = [];  // { ...csvRow, _dbMake }
  const partMap = new Map(); // part_number → part object

  for (const file of filteredFiles) {
    const fileKey = file.replace('brembo_', '').replace('.csv', '');
    const dbMake  = MAKE_MAP[fileKey];

    if (dbMake === undefined) {
      console.warn(`  No make mapping for "${fileKey}" — skipping ${file}`);
      continue;
    }

    const rows = parseCSV(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    let count = 0;

    for (const row of rows) {
      const pn = row.part_number?.trim();
      if (!pn) continue;

      row._dbMake  = dbMake;
      row._fileKey = fileKey;
      allRows.push(row);
      count++;

      if (!partMap.has(pn)) {
        partMap.set(pn, {
          brand:       'Brembo',
          part_number: pn,
          name:        buildPartName(row),
          category:    row.category?.trim() || 'Brake',
          description: buildDescription(row),
        });
      }
    }

    console.log(`  ${file}: ${count} rows`);
  }

  console.log(`\nTotal rows:    ${allRows.length}`);
  console.log(`Unique parts:  ${partMap.size}`);

  // ── 2. Upsert parts ───────────────────────────────────────────────────────
  const partRows  = [...partMap.values()];
  const partIdMap = {}; // part_number → DB id

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
    partRows.slice(0, 6).forEach(p => console.log(`    ${p.part_number}  →  ${p.name}`));
    if (partRows.length > 6) console.log(`    ... +${partRows.length - 6} more`);
    partRows.forEach(p => { partIdMap[p.part_number] = `dry_${p.part_number}`; });
  }

  // ── 3. Load vehicles from DB per make ─────────────────────────────────────
  const makeExisting = new Map(); // dbMake → vehicle[]
  const allDbMakes = [...new Set(allRows.map(r => r._dbMake))];

  console.log('\nLoading vehicles from DB...');
  for (const make of allDbMakes) {
    const enc = encodeURIComponent(make);
    const vs  = await apiGetAll(`/vehicles?make=eq.${enc}&select=id,model,series,year_from,year_to,engine_kw`);
    makeExisting.set(make, vs);
    console.log(`  ${make}: ${vs.length} vehicles`);
  }

  // ── 4. Load existing Brembo fitments to avoid duplicates ──────────────────
  console.log('\nLoading existing Brembo fitments...');
  const bremboPartIds = Object.values(partIdMap).filter(id => typeof id === 'number');
  const existingFitments = new Set();

  if (!DRY_RUN && bremboPartIds.length > 0) {
    // Fetch in chunks to avoid URL length limits
    const chunkSize = 200;
    for (let i = 0; i < bremboPartIds.length; i += chunkSize) {
      const chunk = bremboPartIds.slice(i, i + chunkSize);
      const existing = await apiGetAll(
        `/vehicle_part_fitments?select=vehicle_id,part_id&part_id=in.(${chunk.join(',')})`
      );
      for (const f of existing) existingFitments.add(`${f.vehicle_id}|${f.part_id}`);
    }
    console.log(`  ${existingFitments.size} existing fitments found`);
  }

  // ── 5. Match rows to vehicles + collect fitments ──────────────────────────
  const fitments  = [];
  const fitmentSet = new Set();
  const unmatched = new Map(); // key → count

  for (const row of allRows) {
    const pn     = row.part_number?.trim();
    const partId = partIdMap[pn];
    if (!partId) continue;

    const make     = row._dbMake;
    const existing = makeExisting.get(make) ?? [];

    // Use type-specific dates (more precise); fall back to model dates
    const dateFrom = row.type_date_start?.trim() || row.model_date_start?.trim();
    const dateTo   = row.type_date_end?.trim()   || row.model_date_end?.trim();

    const from     = parseMonthYear(dateFrom);
    const to       = parseMonthYear(dateTo);
    const yearFrom = from?.year ?? null;
    const yearTo   = to?.year   ?? null;
    const kw       = row.kw?.trim() ? +row.kw.trim() : null;

    // Match by year overlap, refine with kW if available
    const matched = existing.filter(v => {
      if (!yearOverlap(v, yearFrom, yearTo)) return false;
      if (kw && v.engine_kw) return Math.abs(v.engine_kw - kw) <= 10;
      return true;
    });

    if (matched.length === 0) {
      const key = `${make} | ${row.model} | ${dateFrom}–${dateTo}${kw ? ` | ${kw}kW` : ''}`;
      unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
      continue;
    }

    for (const v of matched) {
      const key = `${v.id}|${partId}`;
      if (fitmentSet.has(key)) continue;
      if (existingFitments.has(key)) continue;
      fitmentSet.add(key);
      fitments.push({ vehicle_id: v.id, part_id: partId });
    }
  }

  console.log(`\nNew fitments to insert: ${fitments.length}`);
  console.log(`Unmatched row groups:   ${unmatched.size}`);

  // ── 6. Insert fitments ────────────────────────────────────────────────────
  if (!DRY_RUN && fitments.length > 0) {
    const BATCH = 500;
    let done = 0;
    for (let i = 0; i < fitments.length; i += BATCH) {
      const chunk = fitments.slice(i, i + BATCH);
      await api('/vehicle_part_fitments?on_conflict=vehicle_id,part_id', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body:    JSON.stringify(chunk),
      });
      done += chunk.length;
      process.stdout.write(`\r  Fitments: ${done}/${fitments.length}`);
    }
    console.log();
    console.log('\nDone!');
  } else if (DRY_RUN) {
    console.log('  (dry-run) sample fitments:');
    fitments.slice(0, 5).forEach(f =>
      console.log(`    vehicle ${f.vehicle_id} → part ${f.part_id}`)
    );
    if (fitments.length > 5) console.log(`    ... +${fitments.length - 5} more`);
  }

  // ── 7. Report top unmatched ───────────────────────────────────────────────
  if (unmatched.size > 0) {
    console.log(`\n--- Top unmatched (${unmatched.size} groups, no DB vehicle found) ---`);
    [...unmatched.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([k, n]) => console.log(`  ${n}x  ${k}`));
    if (unmatched.size > 20) console.log(`  ... +${unmatched.size - 20} more`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
