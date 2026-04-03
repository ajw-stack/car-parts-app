#!/usr/bin/env node
// Penrite API importer
// Scans product IDs 1–200, fetches vehicle fitments from the Penrite API,
// and imports parts + fitments into the GPC database.
//
// Usage:
//   node scripts/importers/import-penrite.js [--dry-run] [--max-id=200]

const path = require('path');
const fs   = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const maxIdArg = process.argv.find(a => a.startsWith('--max-id='));
const MAX_ID = maxIdArg ? parseInt(maxIdArg.split('=')[1]) : 200;

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

const PENRITE_BASE = 'https://penriteoil.com.au/api/v1/fetchProductVehicles?id=';

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

async function sbUpsert(table, rows, onConflict) {
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

// ─── Mapping helpers ──────────────────────────────────────────────────────────
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
};

function normMake(raw) {
  const u = raw.trim().toUpperCase();
  return MAKE_MAP[u] ?? (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
}

function normTitle(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function configLetter(c) {
  if (!c) return null;
  const map = { 'I': 'Inline', 'V': 'V', 'B': 'Boxer', 'W': 'W', 'R': 'Rotary' };
  return map[c.toUpperCase()] ?? null;
}

function toEngineConfig(c, cyls) {
  const base = configLetter(c);
  if (!base || !cyls) return base;
  return `${base}-${cyls}`;
}

// ─── Fetch Penrite API ────────────────────────────────────────────────────────
async function fetchPenriteProduct(id) {
  try {
    const res = await fetch(`${PENRITE_BASE}${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    // Only AU market records
    return data.filter(r => r.vehicle && r.vehicle.AU === 1);
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`=== Penrite Import (IDs 1–${MAX_ID}) ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  // 1. Scan all IDs and collect raw records
  console.log(`Scanning IDs 1–${MAX_ID}...`);
  const allRecords = [];
  const foundIds = [];
  for (let id = 1; id <= MAX_ID; id++) {
    const records = await fetchPenriteProduct(id);
    if (records && records.length > 0) {
      allRecords.push(...records);
      foundIds.push({ id, partno: records[0].Partno, count: records.length });
      process.stdout.write(`  ID ${id}: ${records[0].Partno} (${records.length} fitments)\n`);
    }
    // Small delay to be polite to the API
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nFound ${foundIds.length} products, ${allRecords.length} AU fitment records.\n`);
  if (allRecords.length === 0) { console.log('Nothing to import.'); return; }

  // 2. Build unique parts
  const partMap = new Map(); // partno → { brand, part_number, name, category, description }
  for (const r of allRecords) {
    if (!partMap.has(r.Partno)) {
      partMap.set(r.Partno, {
        brand: 'Penrite',
        part_number: r.Partno,
        name: r.Partno,
        category: r.Subcat ?? 'Engine Oil',
      });
    }
  }
  const partsToUpsert = [...partMap.values()];
  console.log(`Upserting ${partsToUpsert.length} parts...`);

  let upsertedParts = partsToUpsert;
  if (!DRY_RUN) {
    upsertedParts = await sbUpsert('parts', partsToUpsert, 'brand,part_number');
  }

  // 3. Load DB data needed for matching
  console.log('Loading vehicles from DB...');
  const dbVehicles = await sbSelect('vehicles', 'select=id,make,model,series,year_from,year_to,engine_code,engine_litres,fuel_type,engine_config');

  console.log('Loading existing parts from DB...');
  const dbParts = await sbSelect('parts', 'select=id,brand,part_number&brand=eq.Penrite');
  const partIdMap = new Map(dbParts.map(p => [p.part_number, p.id]));

  console.log('Loading existing fitments...');
  const penritePartIds = dbParts.map(p => p.id);
  let existingFitments = new Set();
  if (penritePartIds.length > 0) {
    const existing = await sbSelect('vehicle_part_fitments',
      `select=vehicle_id,part_id&part_id=in.(${penritePartIds.join(',')})`);
    for (const f of existing) existingFitments.add(`${f.vehicle_id}:${f.part_id}`);
  }

  // 4. Match fitments to DB vehicles
  console.log('Matching fitments to vehicles...');

  // Index DB vehicles by make
  const vehiclesByMake = {};
  for (const v of dbVehicles) {
    if (!vehiclesByMake[v.make]) vehiclesByMake[v.make] = [];
    vehiclesByMake[v.make].push(v);
  }

  const CURRENT_YEAR = new Date().getFullYear();
  const fitments = [];
  let skipped = 0;

  for (const r of allRecords) {
    const partId = partIdMap.get(r.Partno);
    if (!partId) { skipped++; continue; }

    const v = r.vehicle;
    const make = normMake(v.make);
    const candidates = vehiclesByMake[make] ?? [];

    const yearFrom = v.yearmin || null;
    const yearTo   = (v.yearmax && v.yearmax < CURRENT_YEAR) ? v.yearmax : null;
    const engLitres = v.cc ? Math.round((v.cc / 1000) * 10) / 10 : null;
    const engCode  = v.engine?.trim() || null;
    const fuelType = v.fuel ? normTitle(v.fuel) : null;

    for (const dbV of candidates) {
      // Model must match
      if (dbV.model.toUpperCase() !== v.model.toUpperCase()) continue;

      // Year overlap
      const lo1 = dbV.year_from ?? 1900, hi1 = dbV.year_to ?? CURRENT_YEAR;
      const lo2 = yearFrom ?? 1900,      hi2 = yearTo ?? CURRENT_YEAR;
      if (lo1 > hi2 || lo2 > hi1) continue;

      // Engine code match if both present
      if (engCode && dbV.engine_code) {
        if (dbV.engine_code.toUpperCase() !== engCode.toUpperCase()) continue;
      }

      // Engine litres match if both present (within 0.1L)
      if (engLitres && dbV.engine_litres) {
        if (Math.abs(dbV.engine_litres - engLitres) > 0.15) continue;
      }

      const key = `${dbV.id}:${partId}`;
      if (existingFitments.has(key)) continue;

      const notes = r.longfootnote?.trim() || null;
      fitments.push({ vehicle_id: dbV.id, part_id: partId, notes });
      existingFitments.add(key);
    }
  }

  console.log(`\nMatched: ${fitments.length} new fitments`);
  console.log(`Skipped (part not in DB): ${skipped}`);

  if (fitments.length > 0) {
    console.log('Inserting fitments...');
    await sbInsert('vehicle_part_fitments', fitments);
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
