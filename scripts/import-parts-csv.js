#!/usr/bin/env node
// Generic parts CSV importer
// CSV format: brand,make,model,series,engine,trim,drivetrain,body,year_from,year_to,category,position,part_number,notes
// All columns except brand,make,model,part_number,category are optional.
// Blank lines in the CSV are ignored (can be used as visual separators).
//
// Usage:
//   node scripts/import-parts-csv.js <file.csv> [--dry-run]

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
function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped ""
        else inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const rows  = [];
  let headers = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = splitCSVLine(line);

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
    const trim       = get('trim').trim() || null;
    const drivetrain = get('drivetrain').trim() || null;
    const body       = get('body').trim() || null;
    const notes      = get('notes').trim() || null;

    if (!partNumber || !make || !model) continue;

    rows.push({ partNumber, brand, category, position, make, model, series, engine, trim, drivetrain, body, yearFrom, yearTo, notes });
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
  const trimUp   = row.trim ? row.trim.toUpperCase() : null;

  // Base filter: make + model + series + year
  const base = dbVehicles.filter(v => {
    if ((v.model ?? '').toUpperCase() !== modelUp) return false;
    if (seriesUp && (v.series ?? '').toUpperCase() !== seriesUp) return false;
    return yearsOverlap(v.year_from, v.year_to, row.yearFrom, row.yearTo);
  });

  if (base.length === 0) return base;

  // Narrow by trim — only apply when at least one DB row actually has that trim_code.
  // Falls back to full base set when trim is used as an engine description (e.g. "i V6")
  // rather than a customer-visible variant stored in the DB.
  if (trimUp) {
    const trimMatched = base.filter(v => (v.trim_code ?? '').toUpperCase() === trimUp);
    if (trimMatched.length > 0) return trimMatched;
    // No DB rows have this trim_code — treat as informational and continue with base set
  }

  if (csvLitres === null) return base;

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

  // 5. Load vehicles (include all backfillable fields)
  const dbVehicles = await sbSelect(
    'vehicles',
    'select=id,make,model,series,trim_code,year_from,year_to,engine_litres,engine_code,engine_config,engine_kw,fuel_type,chassis,grade,notes'
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

  // 7. Match vehicles, collect fitments, and queue backfill patches
  const fitmentsToInsert = [];
  const unmatchedRows    = [];
  const vehiclePatches   = new Map(); // vehicle id → fields to patch
  let matchCount = 0, skipCount = 0;

  // CSV columns that map directly to vehicle table fields (only backfill when currently null)
  const BACKFILL_FIELDS = [
    { csv: 'engine',     dbField: 'engine_code',   transform: v => v.split(/\s/)[0] || null },
    { csv: 'drivetrain', dbField: 'grade',          transform: v => v },
  ];

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
      // Queue fitment
      const key = `${v.id}:${partId}:${row.position ?? ''}`;
      if (existingFitments.has(key)) { skipCount++; } else {
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

      // Queue backfill: only patch fields that are currently null on the DB row
      const patch = vehiclePatches.get(v.id) ?? {};
      if (row.engine_litres != null && v.engine_litres == null) patch.engine_litres = row.engine_litres;
      if (row.engine       != null && v.engine_code   == null) {
        const code = row.engine.split(/\s/)[0];
        if (code) patch.engine_code = code;
      }
      if (Object.keys(patch).length > 0) vehiclePatches.set(v.id, patch);
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

  // 8b. Backfill null vehicle fields
  if (vehiclePatches.size > 0) {
    console.log(`\nBackfilling ${vehiclePatches.size} vehicle records with new data...`);
    let patchCount = 0;
    for (const [vehicleId, patch] of vehiclePatches) {
      if (DRY_RUN) { console.log(`  [dry] PATCH ${vehicleId}: ${JSON.stringify(patch)}`); continue; }
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${vehicleId}`,
        { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(patch) }
      );
      if (!res.ok) console.warn(`  PATCH ${vehicleId} failed: ${res.status} ${await res.text()}`);
      else patchCount++;
    }
    if (!DRY_RUN) console.log(`  Updated ${patchCount} vehicles.`);
  }

  // 9. Report unmatched
  if (unmatchedRows.length > 0) {
    const seen = new Set();
    const unique = unmatchedRows.filter(r => {
      const k = `${r.make}|${r.model}|${r.series}|${r.engine ?? ''}|${r.trim ?? ''}|${r.drivetrain ?? ''}|${r.body ?? ''}|${r.yearFrom}-${r.yearTo}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    console.log(`\nUnmatched vehicles (${unique.length} unique) — add these to the DB then re-run:`);
    for (const r of unique) {
      const extra = [r.engine, r.trim, r.drivetrain, r.body].filter(Boolean).join(' | ');
      console.log(`  [${r.make}] ${r.model} ${r.series} ${r.yearFrom ?? '?'}-${r.yearTo ?? 'ON'}${extra ? '  (' + extra + ')' : ''}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
