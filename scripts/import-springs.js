#!/usr/bin/env node
// Import King Springs coil spring catalogue into Supabase
// Usage: node scripts/import-springs.js [--dry-run]

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Load env ────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbSelect(table, params = '', pageSize = 1000) {
  const all = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
    const from = offset;
    const to = offset + pageSize - 1;
    const res = await fetch(url, {
      headers: { ...headers, 'Range-Unit': 'items', Range: `${from}-${to}` },
    });
    if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function sbUpsert(table, rows, onConflict = '') {
  if (DRY_RUN || rows.length === 0) return rows;
  const qs = onConflict ? `?on_conflict=${onConflict}` : '';
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: `resolution=merge-duplicates,return=representation`,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPSERT ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`INSERT ${table}: ${res.status} ${text}`);
    }
  }
}

// ─── Make name mapping (CSV → DB) ────────────────────────────────────────────
const MAKE_MAP = {
  'ALFA ROMEO': 'Alfa Romeo',
  'AUDI': 'Audi',
  'BEDFORD': 'Bedford',
  'BMW': 'BMW',
  'CHEVROLET': 'Chevrolet',
  'CHRYSLER': 'Chrysler',
  'DAEWOO': 'Daewoo',
  'DAIHATSU': 'Daihatsu',
  'DODGE': 'Dodge',
  'EUNOS': 'Eunos',
  'FIAT': 'Fiat',
  'FORD': 'Ford',
  'HOLDEN': 'Holden',
  'HONDA': 'Honda',
  'HYUNDAI': 'Hyundai',
  'ISUZU': 'Isuzu',
  'JAGUAR': 'Jaguar',
  'JEEP': 'Jeep',
  'KIA': 'Kia',
  'LADA': 'Lada',
  'LEYLAND': 'Leyland',
  'LEXUS': 'Lexus',
  'MAZDA': 'Mazda',
  'MERCEDES': 'Mercedes-Benz',
  'MG': 'MG',
  'MINI': 'Mini',
  'MITSUBISHI': 'Mitsubishi',
  'NISSAN': 'Nissan',
  'PEUGEOT': 'Peugeot',
  'PROTON': 'Proton',
  'RENAULT': 'Renault',
  'ROVER': 'Rover',
  'SEAT': 'SEAT',
  'SSANG YONG': 'SsangYong',
  'SSANGYONG': 'SsangYong',
  'SUBARU': 'Subaru',
  'SUZUKI': 'Suzuki',
  'TOYOTA': 'Toyota',
  'TRIUMPH': 'Triumph',
  'VW': 'Volkswagen',
  'VOLVO': 'Volvo',
};

// ─── Year parsing ─────────────────────────────────────────────────────────────
function parseYear(raw) {
  if (!raw) return null;
  raw = raw.trim();
  // Remove month prefix like "9/" or "10/"
  const bare = raw.replace(/^\d{1,2}\//, '');
  const n = parseInt(bare, 10);
  if (isNaN(n)) return null;
  if (n >= 100) return n; // Already 4-digit
  return n <= 30 ? 2000 + n : 1900 + n;
}

function parseYearRange(yearStr) {
  if (!yearStr) return { from: null, to: null };
  yearStr = yearStr.trim();
  if (!yearStr || yearStr.toUpperCase() === 'IMPORT') return { from: null, to: null };

  // "2010 ON", "05 ON"
  if (/\bON\b/i.test(yearStr)) {
    const raw = yearStr.replace(/\bON\b/i, '').trim();
    return { from: parseYear(raw), to: null };
  }

  // "64-76", "9/98-6/04", "10/91-00", "04/04-11/11"
  if (yearStr.includes('-')) {
    const parts = yearStr.split('-');
    return { from: parseYear(parts[0]), to: parseYear(parts[parts.length - 1]) };
  }

  // Single year
  const y = parseYear(yearStr);
  return { from: y, to: y };
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const rows = [];
  let currentMake = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());

    // Skip header rows
    if (i < 2) continue;

    const col0 = cols[0] || '';
    const col1 = cols[1] || '';

    // Make header row: col[1] is empty
    if (!col1) {
      const mappedMake = MAKE_MAP[col0.toUpperCase()] || MAKE_MAP[col0] || null;
      if (mappedMake) currentMake = mappedMake;
      continue;
    }

    if (!currentMake) continue;

    const { from: yearFrom, to: yearTo } = parseYearRange(col0);

    // Part columns: [2]=FL, [3]=FS, [4]=FR, [5]=RL, [6]=RS, [7]=RR
    const PART_COLS = [
      { idx: 2, position: 'Front', height: 'Lowered' },
      { idx: 3, position: 'Front', height: 'Standard' },
      { idx: 4, position: 'Front', height: 'Raised' },
      { idx: 5, position: 'Rear',  height: 'Lowered' },
      { idx: 6, position: 'Rear',  height: 'Standard' },
      { idx: 7, position: 'Rear',  height: 'Raised' },
    ];

    for (const { idx, position, height } of PART_COLS) {
      const partNumber = (cols[idx] || '').trim();
      if (!partNumber) continue;

      rows.push({
        make: currentMake,
        modelDesc: col1,
        yearFrom,
        yearTo,
        partNumber,
        position,
        height,
        name: `${height} Coil Spring`,
      });
    }
  }

  return rows;
}

// ─── Year overlap check ───────────────────────────────────────────────────────
function yearsOverlap(dbFrom, dbTo, csvFrom, csvTo) {
  // If either side has no years at all, treat as unknown — allow match
  if (csvFrom === null && csvTo === null) return true;
  if (dbFrom === null && dbTo === null) return true;

  const lo1 = dbFrom ?? 1900;
  const hi1 = dbTo ?? 2100;
  const lo2 = csvFrom ?? 1900;
  const hi2 = csvTo ?? 2100;
  return lo1 <= hi2 && lo2 <= hi1;
}

// ─── Vehicle matching ─────────────────────────────────────────────────────────
function modelMatches(dbVehicle, csvDesc) {
  const desc = csvDesc.toUpperCase();
  const model = (dbVehicle.model || '').toUpperCase();
  const series = (dbVehicle.series || '').toUpperCase();

  // Model must be in description
  if (!model || model.length < 2) return false;
  if (!desc.includes(model)) return false;

  // If vehicle has a series, the series should also appear in description
  // (to avoid e.g. "318" matching E30 and E34 and E36 indiscriminately)
  if (series && series !== 'ALL' && series.length >= 2) {
    if (!desc.includes(series)) return false;
  }

  return true;
}

function findMatchingVehicles(row, vehiclesByMake) {
  const dbVehicles = vehiclesByMake[row.make] || [];
  return dbVehicles.filter(v =>
    modelMatches(v, row.modelDesc) &&
    yearsOverlap(v.year_from, v.year_to, row.yearFrom, row.yearTo)
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT START ===');

  // 1. Parse CSV
  const csvPath = path.join(__dirname, 'kings-springs.csv');
  const csvRows = parseCSV(csvPath);
  console.log(`Parsed ${csvRows.length} part-fitment rows from CSV`);

  // 2. Ensure "Coil Spring" category exists
  let categories = await sbSelect('part_categories', 'select=id,name');
  let category = categories.find(c => c.name === 'Coil Spring');
  if (!category) {
    console.log('Creating "Coil Spring" category...');
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sort_order || 0), 0);
    const result = await sbUpsert('part_categories', [{ name: 'Coil Spring', sort_order: maxSort + 1 }]);
    category = Array.isArray(result) ? result[0] : result;
  }
  if (!DRY_RUN && !category?.id) {
    // Re-fetch after insert
    categories = await sbSelect('part_categories', 'select=id,name');
    category = categories.find(c => c.name === 'Coil Spring');
  }
  console.log(`Category: "Coil Spring" id=${category?.id}`);

  // 3. Collect unique parts
  const partMap = new Map(); // partNumber → { brand, part_number, name, category_id }
  for (const row of csvRows) {
    if (!partMap.has(row.partNumber)) {
      partMap.set(row.partNumber, {
        brand: 'King Springs',
        part_number: row.partNumber,
        name: row.name,
        category: 'Coil Spring',
        category_id: category?.id,
      });
    }
  }
  console.log(`Unique parts: ${partMap.size}`);

  // 4. Upsert parts
  const partsToInsert = Array.from(partMap.values());
  console.log(`Upserting ${partsToInsert.length} parts...`);
  await sbUpsert('parts', partsToInsert, 'brand,part_number');

  // Re-fetch all King Springs parts to get their IDs
  const dbParts = await sbSelect(
    'parts',
    `select=id,part_number&brand=eq.King+Springs&limit=2000`
  );
  const partIdByNumber = new Map(dbParts.map(p => [p.part_number, p.id]));
  console.log(`Fetched ${partIdByNumber.size} King Springs parts from DB`);

  // 5. Load all vehicles
  const dbVehicles = await sbSelect(
    'vehicles',
    'select=id,make,model,series,year_from,year_to&limit=10000'
  );
  console.log(`Loaded ${dbVehicles.length} vehicles from DB`);

  // Group by make
  const vehiclesByMake = {};
  for (const v of dbVehicles) {
    if (!vehiclesByMake[v.make]) vehiclesByMake[v.make] = [];
    vehiclesByMake[v.make].push(v);
  }

  // 6. Load existing fitments for King Springs parts (for deduplication)
  const existingFitments = new Set();
  if (partIdByNumber.size > 0) {
    // Fetch in chunks to avoid URL length limits
    const partIds = Array.from(partIdByNumber.values());
    const CHUNK = 100;
    for (let i = 0; i < partIds.length; i += CHUNK) {
      const chunk = partIds.slice(i, i + CHUNK);
      const existing = await sbSelect(
        'vehicle_part_fitments',
        `select=vehicle_id,part_id,position&part_id=in.(${chunk.join(',')})`
      );
      for (const f of existing) {
        existingFitments.add(`${f.vehicle_id}:${f.part_id}:${f.position ?? ''}`);
      }
    }
  }
  console.log(`Existing King Springs fitments: ${existingFitments.size}`);

  // 7. Match and collect fitments to insert
  const fitmentsToInsert = [];
  const unmatchedRows = [];
  let matchCount = 0;
  let skipCount = 0;

  for (const row of csvRows) {
    const partId = partIdByNumber.get(row.partNumber);
    if (!partId) {
      if (!DRY_RUN) console.warn(`  No part ID found for ${row.partNumber}`);
      continue;
    }

    const matched = findMatchingVehicles(row, vehiclesByMake);

    if (matched.length === 0) {
      unmatchedRows.push(row);
      continue;
    }

    for (const v of matched) {
      const key = `${v.id}:${partId}:${row.position}`;
      if (existingFitments.has(key)) {
        skipCount++;
        continue;
      }
      existingFitments.add(key); // Prevent duplicates within this run
      fitmentsToInsert.push({
        vehicle_id: v.id,
        part_id: partId,
        position: row.position,
        qty: 1,
      });
      matchCount++;
    }
  }

  console.log(`\nMatches: ${matchCount} new fitments to insert`);
  console.log(`Skipped: ${skipCount} already exist`);

  // 8. Insert fitments
  if (fitmentsToInsert.length > 0) {
    console.log(`Inserting ${fitmentsToInsert.length} fitments...`);
    await sbInsert('vehicle_part_fitments', fitmentsToInsert);
    console.log('Done.');
  }

  // 9. Report unmatched
  if (unmatchedRows.length > 0) {
    const seen = new Set();
    const unique = unmatchedRows.filter(r => {
      const k = `${r.make}|${r.modelDesc}|${r.yearFrom}-${r.yearTo}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    console.log(`\nUnmatched vehicle descriptions (${unique.length} unique):`);
    for (const r of unique) {
      console.log(`  [${r.make}] ${r.yearFrom ?? '?'}-${r.yearTo ?? 'ON'} ${r.modelDesc}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
