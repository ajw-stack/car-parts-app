#!/usr/bin/env node
// Generic parts CSV importer
// CSV format: part_number,brand,category,position,make,model,series,year_from,year_to,body,notes
//
// Usage:
//   node scripts/import-parts-csv.js <file.csv> [--dry-run]
//
// Blank lines in the CSV are ignored (can be used as visual separators).

const fs   = require('fs');
const path = require('path');

const csvArg = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/import-parts-csv.js <file.csv> [--dry-run]');
  process.exit(1);
}

// ─── Load env ─────────────────────────────────────────────────────────────────
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

// ─── Supabase helpers ─────────────────────────────────────────────────────────
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
    const res = await fetch(url, {
      headers: { ...headers, 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}` },
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`UPSERT ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
  }
}

// ─── Make name normalisation ───────────────────────────────────────────────────
const MAKE_MAP = {
  'ALFA ROMEO': 'Alfa Romeo', 'AUDI': 'Audi', 'BEDFORD': 'Bedford',
  'BMW': 'BMW', 'CHEVROLET': 'Chevrolet', 'CHRYSLER': 'Chrysler',
  'DAEWOO': 'Daewoo', 'DAIHATSU': 'Daihatsu', 'DODGE': 'Dodge',
  'EUNOS': 'Eunos', 'FIAT': 'Fiat', 'FORD': 'Ford',
  'HOLDEN': 'Holden', 'HONDA': 'Honda', 'HYUNDAI': 'Hyundai',
  'ISUZU': 'Isuzu', 'JAGUAR': 'Jaguar', 'JEEP': 'Jeep',
  'KIA': 'Kia', 'LADA': 'Lada', 'LEYLAND': 'Leyland',
  'LEXUS': 'Lexus', 'MAZDA': 'Mazda', 'MERCEDES': 'Mercedes-Benz',
  'MERCEDES-BENZ': 'Mercedes-Benz', 'MG': 'MG', 'MINI': 'Mini',
  'MITSUBISHI': 'Mitsubishi', 'NISSAN': 'Nissan', 'PEUGEOT': 'Peugeot',
  'PROTON': 'Proton', 'RENAULT': 'Renault', 'ROVER': 'Rover',
  'SEAT': 'SEAT', 'SSANG YONG': 'SsangYong', 'SSANGYONG': 'SsangYong',
  'SUBARU': 'Subaru', 'SUZUKI': 'Suzuki', 'TOYOTA': 'Toyota',
  'TRIUMPH': 'Triumph', 'VW': 'Volkswagen', 'VOLKSWAGEN': 'Volkswagen',
  'VOLVO': 'Volvo',
};

function normMake(raw) {
  const u = raw.trim().toUpperCase();
  return MAKE_MAP[u] ?? raw.trim();
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const rows  = [];
  let headers = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());

    // First non-blank line = header
    if (!headers) {
      headers = cols.map(h => h.toLowerCase());
      continue;
    }

    const get = (name) => cols[headers.indexOf(name)] ?? '';

    const make       = normMake(get('make'));
    const model      = get('model').trim();
    const series     = get('series').trim();
    const partNumber = get('part_number').trim();
    const brand      = get('brand').trim();
    const category   = get('category').trim();
    const position   = get('position').trim() || null;
    const yearFrom   = parseInt(get('year_from'), 10) || null;
    const yearTo     = parseInt(get('year_to'),   10) || null;
    const engine     = get('engine').trim() || null;
    const notes      = get('notes').trim() || null;

    if (!partNumber || !make || !model) continue;

    rows.push({ partNumber, brand, category, position, make, model, series, engine, yearFrom, yearTo, notes });
  }

  return rows;
}

// ─── Vehicle matching ─────────────────────────────────────────────────────────
function yearsOverlap(dbFrom, dbTo, csvFrom, csvTo) {
  if (csvFrom === null && csvTo === null) return true;
  if (dbFrom  === null && dbTo  === null) return true;
  const lo1 = dbFrom ?? 1900, hi1 = dbTo ?? 2100;
  const lo2 = csvFrom ?? 1900, hi2 = csvTo ?? 2100;
  return lo1 <= hi2 && lo2 <= hi1;
}

function parseEngineLitres(engineStr) {
  if (!engineStr) return null;
  const m = engineStr.match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function findMatchingVehicles(row, vehiclesByMake) {
  const dbVehicles = vehiclesByMake[row.make] || [];
  const modelUp  = row.model.toUpperCase();
  const seriesUp = row.series.toUpperCase();
  const csvLitres = parseEngineLitres(row.engine);
  const isDiesel  = row.engine && /\bD$/i.test(row.engine.trim().split(' ')[0]);

  // Base filter: make + model + series + year
  const base = dbVehicles.filter(v => {
    if ((v.model ?? '').toUpperCase() !== modelUp) return false;
    if (seriesUp && (v.series ?? '').toUpperCase() !== seriesUp) return false;
    return yearsOverlap(v.year_from, v.year_to, row.yearFrom, row.yearTo);
  });

  if (base.length === 0 || csvLitres === null) return base;

  // Try to narrow by engine litres (±0.15L tolerance)
  const engineMatched = base.filter(v => {
    if (v.engine_litres == null) return false;
    if (Math.abs(v.engine_litres - csvLitres) > 0.15) return false;
    if (isDiesel && v.fuel_type && !/diesel/i.test(v.fuel_type)) return false;
    return true;
  });

  // If engine matched some vehicles, use those; otherwise fall back to all series matches
  return engineMatched.length > 0 ? engineMatched : base;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT START ===');

  // 1. Parse CSV
  const csvPath = path.resolve(csvArg);
  const csvRows = parseCSV(csvPath);
  console.log(`Parsed ${csvRows.length} rows from ${path.basename(csvPath)}`);

  // 2. Ensure all categories exist
  const uniqueCategories = [...new Set(csvRows.map(r => r.category).filter(Boolean))];
  let dbCategories = await sbSelect('part_categories', 'select=id,name');
  const categoryIdByName = new Map(dbCategories.map(c => [c.name, c.id]));

  for (const catName of uniqueCategories) {
    if (!categoryIdByName.has(catName)) {
      console.log(`Creating category "${catName}"...`);
      const maxSort = dbCategories.reduce((m, c) => Math.max(m, c.sort_order || 0), 0);
      const result = await sbUpsert('part_categories', [{ name: catName, sort_order: maxSort + 1 }]);
      if (!DRY_RUN) {
        dbCategories = await sbSelect('part_categories', 'select=id,name');
        dbCategories.forEach(c => categoryIdByName.set(c.name, c.id));
      }
    }
    console.log(`Category "${catName}" id=${categoryIdByName.get(catName) ?? '(dry run)'}`);
  }

  // 3. Collect unique parts
  const partMap = new Map();
  for (const row of csvRows) {
    if (!partMap.has(row.partNumber)) {
      partMap.set(row.partNumber, {
        brand:       row.brand,
        part_number: row.partNumber,
        name:        row.category,       // e.g. "Brake Pad Set"
        category:    row.category,
        category_id: categoryIdByName.get(row.category) ?? null,
      });
    }
  }
  console.log(`Unique parts: ${partMap.size}`);

  // 4. Upsert parts
  const partsToInsert = Array.from(partMap.values());
  console.log(`Upserting ${partsToInsert.length} parts...`);
  await sbUpsert('parts', partsToInsert, 'brand,part_number');

  // Re-fetch to get IDs
  const allBrands = [...new Set(csvRows.map(r => r.brand))];
  const partIdByNumber = new Map();
  for (const brand of allBrands) {
    const dbParts = await sbSelect(
      'parts',
      `select=id,part_number&brand=eq.${encodeURIComponent(brand)}`
    );
    dbParts.forEach(p => partIdByNumber.set(p.part_number, p.id));
  }
  console.log(`Fetched ${partIdByNumber.size} parts from DB`);

  // 5. Load vehicles
  const dbVehicles = await sbSelect(
    'vehicles',
    'select=id,make,model,series,year_from,year_to'
  );
  console.log(`Loaded ${dbVehicles.length} vehicles`);

  const vehiclesByMake = {};
  for (const v of dbVehicles) {
    if (!vehiclesByMake[v.make]) vehiclesByMake[v.make] = [];
    vehiclesByMake[v.make].push(v);
  }

  // 6. Load existing fitments for these parts (deduplication)
  const existingFitments = new Set();
  const partIds = Array.from(partIdByNumber.values());
  const CHUNK = 100;
  for (let i = 0; i < partIds.length; i += CHUNK) {
    const chunk = partIds.slice(i, i + CHUNK);
    const existing = await sbSelect(
      'vehicle_part_fitments',
      `select=vehicle_id,part_id,position&part_id=in.(${chunk.join(',')})`
    );
    existing.forEach(f => existingFitments.add(`${f.vehicle_id}:${f.part_id}:${f.position ?? ''}`));
  }
  console.log(`Existing fitments for these parts: ${existingFitments.size}`);

  // 7. Match vehicles and collect fitments
  const fitmentsToInsert = [];
  const unmatchedRows    = [];
  let matchCount = 0, skipCount = 0;

  for (const row of csvRows) {
    const partId = partIdByNumber.get(row.partNumber);
    if (!partId) {
      if (!DRY_RUN) console.warn(`  No part ID for ${row.partNumber}`);
      continue;
    }

    const matched = findMatchingVehicles(row, vehiclesByMake);

    if (matched.length === 0) {
      unmatchedRows.push(row);
      continue;
    }

    for (const v of matched) {
      const key = `${v.id}:${partId}:${row.position ?? ''}`;
      if (existingFitments.has(key)) { skipCount++; continue; }
      existingFitments.add(key);
      fitmentsToInsert.push({
        vehicle_id: v.id,
        part_id:    partId,
        position:   row.position ?? null,
        qty:        1,
        notes:      row.notes ?? null,
      });
      matchCount++;
    }
  }

  console.log(`\nMatches: ${matchCount} new fitments`);
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
      const k = `${r.make}|${r.model}|${r.series}|${r.yearFrom}-${r.yearTo}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    console.log(`\nUnmatched (${unique.length} unique):`);
    for (const r of unique) {
      console.log(`  [${r.make}] ${r.model} ${r.series} ${r.yearFrom ?? '?'}-${r.yearTo ?? 'ON'}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
