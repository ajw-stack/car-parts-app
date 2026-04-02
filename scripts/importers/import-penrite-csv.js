#!/usr/bin/env node
// Penrite application guide CSV importer
// Reads scripts/penrite_application_guide.csv and imports parts + fitments.
// Only imports AU=1 records.
//
// Usage:
//   node scripts/importers/import-penrite-csv.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '..', '.env.local');
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

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function sbSelect(table, params = '', pageSize = 1000) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { ...sbHeaders, 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}` },
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

async function sbUpsert(table, rows, onConflict) {
  if (DRY_RUN || rows.length === 0) return rows;
  const qs = onConflict ? `?on_conflict=${onConflict}` : '';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`UPSERT ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbInsert(table, rows) {
  if (DRY_RUN || rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
    process.stdout.write(`  Inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
  }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

// ─── Make normalisation ───────────────────────────────────────────────────────
const MAKE_MAP = {
  'ALFA ROMEO': 'Alfa Romeo', 'AUDI': 'Audi', 'BMW': 'BMW',
  'CHEVROLET': 'Chevrolet', 'CHRYSLER': 'Chrysler', 'CITROEN': 'Citroen',
  'DAIHATSU': 'Daihatsu', 'DODGE': 'Dodge', 'FIAT': 'Fiat',
  'FORD': 'Ford', 'GREAT WALL': 'Great Wall', 'HOLDEN': 'Holden',
  'HONDA': 'Honda', 'HSV': 'HSV', 'HYUNDAI': 'Hyundai',
  'ISUZU': 'Isuzu', 'JAGUAR': 'Jaguar', 'JEEP': 'Jeep',
  'KIA': 'Kia', 'LANDROVER': 'Land Rover', 'LAND ROVER': 'Land Rover',
  'LEXUS': 'Lexus', 'MAZDA': 'Mazda', 'MERCEDES': 'Mercedes-Benz',
  'MERCEDES-BENZ': 'Mercedes-Benz', 'MG': 'MG', 'MINI': 'Mini',
  'MITSUBISHI': 'Mitsubishi', 'NISSAN': 'Nissan', 'PEUGEOT': 'Peugeot',
  'PORSCHE': 'Porsche', 'RENAULT': 'Renault', 'SKODA': 'Skoda',
  'SSANGYONG': 'SsangYong', 'SUBARU': 'Subaru', 'SUZUKI': 'Suzuki',
  'TOYOTA': 'Toyota', 'VOLKSWAGEN': 'Volkswagen', 'VOLVO': 'Volvo',
  'PONTIAC': 'Pontiac', 'ISUZU': 'Isuzu',
};

function normMake(raw) {
  const u = raw.trim().toUpperCase();
  return MAKE_MAP[u] ?? (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = path.join(__dirname, '..', 'penrite_application_guide.csv');
  console.log(`=== Penrite CSV Import ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  // 1. Parse CSV
  console.log('Parsing CSV...');
  const rawRows = parseCSV(csvPath);
  console.log(`  Total rows: ${rawRows.length.toLocaleString()}`);

  // Filter AU only, skip empty part codes
  const rows = rawRows.filter(r => r.Available_AU === '1' && r.Penrite_Product_Code);
  console.log(`  AU market rows: ${rows.length.toLocaleString()}`);

  // 2. Build unique parts
  const partMap = new Map();
  for (const r of rows) {
    const code = r.Penrite_Product_Code;
    if (!partMap.has(code)) {
      const name = r.Penrite_Product_Name && r.Penrite_Product_Name !== code
        ? r.Penrite_Product_Name
        : code;
      partMap.set(code, {
        brand: 'Penrite',
        part_number: code,
        name,
        category: r.Compartment || 'Engine Oil',
      });
    }
  }
  console.log(`\nUnique parts: ${partMap.size}`);

  // 3. Upsert parts
  console.log('Upserting parts...');
  const partsArr = [...partMap.values()];
  let upsertedParts = partsArr;
  if (!DRY_RUN) {
    upsertedParts = await sbUpsert('parts', partsArr, 'brand,part_number');
  }

  // 4. Load DB vehicles
  console.log('Loading vehicles from DB...');
  const dbVehicles = await sbSelect('vehicles',
    'select=id,make,model,series,year_from,year_to,engine_code,engine_litres,fuel_type');
  console.log(`  ${dbVehicles.length.toLocaleString()} vehicles loaded`);

  // Index by make
  const vehiclesByMake = {};
  for (const v of dbVehicles) {
    if (!vehiclesByMake[v.make]) vehiclesByMake[v.make] = [];
    vehiclesByMake[v.make].push(v);
  }

  // 5. Load existing parts + fitments
  console.log('Loading existing Penrite parts from DB...');
  const dbParts = await sbSelect('parts', 'select=id,part_number&brand=eq.Penrite');
  const partIdMap = new Map(dbParts.map(p => [p.part_number, p.id]));

  console.log('Loading existing fitments...');
  const penriteIds = dbParts.map(p => p.id);
  const existingFitments = new Set();
  if (penriteIds.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < penriteIds.length; i += CHUNK) {
      const chunk = penriteIds.slice(i, i + CHUNK);
      const existing = await sbSelect('vehicle_part_fitments',
        `select=vehicle_id,part_id&part_id=in.(${chunk.join(',')})`);
      for (const f of existing) existingFitments.add(`${f.vehicle_id}:${f.part_id}`);
    }
  }
  console.log(`  ${existingFitments.size.toLocaleString()} existing fitments`);

  // 6. Match fitments
  console.log('\nMatching fitments...');
  const CURRENT_YEAR = new Date().getFullYear();
  const fitments = [];
  let noPartId = 0, noVehicle = 0, alreadyExists = 0;

  for (const r of rows) {
    const partId = partIdMap.get(r.Penrite_Product_Code);
    if (!partId) { noPartId++; continue; }

    const make = normMake(r.Make);
    const candidates = vehiclesByMake[make] ?? [];
    if (candidates.length === 0) { noVehicle++; continue; }

    const yearFrom  = parseInt(r.Year_From) || null;
    const yearTo    = parseInt(r.Year_To) || null;
    const csvYearTo = (yearTo && yearTo >= CURRENT_YEAR) ? null : yearTo;
    const engCode   = r.Engine?.trim() || null;
    const engLitres = r.Engine_CC ? Math.round((parseInt(r.Engine_CC) / 1000) * 10) / 10 : null;

    let matched = false;
    for (const dbV of candidates) {
      if (dbV.model.toUpperCase() !== r.Model.toUpperCase()) continue;

      // Year overlap
      const lo1 = dbV.year_from ?? 1900, hi1 = dbV.year_to ?? CURRENT_YEAR;
      const lo2 = yearFrom ?? 1900,      hi2 = csvYearTo ?? CURRENT_YEAR;
      if (lo1 > hi2 || lo2 > hi1) continue;

      // Engine code match if both present
      // Penrite sometimes uses "LN3 (L36)" style — check if DB code appears anywhere in it
      if (engCode && dbV.engine_code) {
        const dbCode  = dbV.engine_code.toUpperCase();
        const csvCode = engCode.toUpperCase();
        if (!csvCode.includes(dbCode) && dbCode !== csvCode) continue;
      }

      // Engine litres match if both present (within 0.15L)
      if (engLitres && dbV.engine_litres) {
        if (Math.abs(dbV.engine_litres - engLitres) > 0.15) continue;
      }

      const key = `${dbV.id}:${partId}`;
      if (existingFitments.has(key)) { alreadyExists++; continue; }

      const notes = r.Capacity?.trim() || null;
      fitments.push({ vehicle_id: dbV.id, part_id: partId, notes });
      existingFitments.add(key);
      matched = true;
    }
    if (!matched) noVehicle++;
  }

  console.log(`  New fitments:     ${fitments.length.toLocaleString()}`);
  console.log(`  Already existed:  ${alreadyExists.toLocaleString()}`);
  console.log(`  No vehicle match: ${noVehicle.toLocaleString()}`);
  console.log(`  No part ID:       ${noPartId.toLocaleString()}`);

  if (fitments.length > 0) {
    console.log(`\nInserting ${fitments.length.toLocaleString()} fitments...`);
    await sbInsert('vehicle_part_fitments', fitments);
    console.log('\nDone.');
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
