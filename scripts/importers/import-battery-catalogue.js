#!/usr/bin/env node
// Import battery fitment catalogue into Supabase
//
// Usage:
//   node scripts/importers/import-battery-catalogue.js [--dry-run] [path/to/csv]
//
// CSV format: optional header row (auto-detected); columns must match the standard layout
// Vehicles are master data — this script NEVER creates vehicles.
// Unmatched rows are written to scripts/flagged/flagged-batteries-<basename>.csv

const fs   = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────────
// CONFIRM: set BRAND to the actual battery brand before running
const BRAND    = 'Century';
const CATEGORY = 'Battery';

const DRY_RUN  = process.argv.includes('--dry-run');
const CSV_PATH = process.argv.find(a => a.endsWith('.csv'))
  || path.join(__dirname, '..', '..', 'Alfa Romeo.csv');

// ─── Env ──────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) { console.error('Missing Supabase credentials in .env.local'); process.exit(1); }

const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// ─── Supabase helpers ─────────────────────────────────────────────────────────
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

// ─── CSV parsing (handles quoted fields with embedded commas) ─────────────────
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

// Column indices (0-based) — matches "Alfa Romeo.csv" layout (no header row)
const COL = {
  part_number:   0,
  name:          1,
  voltage:       2,
  capacity_ah:   3,
  length_mm:     4,
  width_mm:      5,
  height_mm:     6,
  terminal_type: 7,
  cca:           8,
  rc:            9,
  warranty_mo:   10,
  category:      11,
  tier:          12,
  make:          13,
  model:         14,
  year_from:     15,
  year_to:       16,
  description:   17,   // "series" in header — full vehicle description text
  engine_type:   18,   // fuel type (Petrol, Diesel, Electric Motor, …)
  drive_type:    19,
  body_type:     20,
  chassis_code:  21,   // Alfa platform code (937_, 932_, …) — NOT stored in DB chassis
  engine_code:   22,
  power_kw:      23,
  is_auxiliary:  24,
};

function parseRow(cols) {
  const int = (i) => { const n = parseInt(cols[i], 10); return isNaN(n) ? null : n; };
  const str = (i) => (cols[i] ?? '').trim();
  return {
    part_number:   str(COL.part_number),
    name:          str(COL.name),
    voltage:       int(COL.voltage),
    capacity_ah:   int(COL.capacity_ah),
    length_mm:     int(COL.length_mm),
    width_mm:      int(COL.width_mm),
    height_mm:     int(COL.height_mm),
    terminal_type: str(COL.terminal_type),
    cca:           int(COL.cca),
    rc:            int(COL.rc),
    warranty_mo:   int(COL.warranty_mo),
    tier:          str(COL.tier),
    make:          str(COL.make),
    model:         str(COL.model),
    year_from:     int(COL.year_from),
    year_to:       int(COL.year_to),
    description:   str(COL.description),
    engine_type:   str(COL.engine_type),
    drive_type:    str(COL.drive_type),
    body_type:     str(COL.body_type),
    chassis_code:  str(COL.chassis_code),
    engine_code:   str(COL.engine_code),
    power_kw:      int(COL.power_kw),
    is_auxiliary:  str(COL.is_auxiliary) === 'Yes',
  };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
const MAKE_MAP = {
  'ABARTH':        'Abarth',
  'ALFA ROMEO':    'Alfa Romeo',
  'ASTON MARTIN':  'Aston Martin',
  'AUDI':          'Audi',
  'BMW':           'BMW',
  'FORD':          'Ford',
  'HOLDEN':        'Holden',
  'SUZUKI':        'Suzuki',
  'VW':            'Volkswagen',
};

function dbMakeFor(csvMake) {
  return MAKE_MAP[csvMake] || MAKE_MAP[csvMake.toUpperCase()] || csvMake;
}

// Returns true if the engine_code value is actually a raw displacement (1500, 1186cc, …)
function isDisplacement(s) {
  return /^\d+cc?$/i.test(s) || /^\d{4}$/.test(s);
}

// Parse raw displacement string → engine_litres float (e.g. "1500" → 1.5)
function displacementToLitres(s) {
  const n = parseInt(s.replace(/cc$/i, ''), 10);
  return isNaN(n) ? null : parseFloat((n / 1000).toFixed(2));
}

// Extract displacement from the description string ("1.9 JTDM 16V …" → 1.9)
function litresFromDesc(desc) {
  if (!desc) return null;
  // Decimal displacement at start: "1.9 …", "3.2 …", "0.9 …"
  const m = desc.match(/^(\d+\.\d+)\s/);
  if (m) return parseFloat(m[1]);
  // Integer cc at start: "1750 (105,…)", "2000 …"
  const m2 = desc.match(/^(\d{4})\s/);
  if (m2) {
    const cc = parseInt(m2[1], 10);
    if (cc > 200 && cc < 9999) return parseFloat((cc / 1000).toFixed(2));
  }
  return null;
}

// Map CSV fuel type → DB fuel_type (permissive — unknown values pass through)
function mapFuelType(csvFuel) {
  const map = {
    'Petrol':        'Petrol',
    'Diesel':        'Diesel',
    'Electric Motor':'Electric',
    'Plug-In Hybrid':'PHEV',
    'Mild Hybrid':   'Mild Hybrid',
  };
  return map[csvFuel] || csvFuel || null;
}

// ─── Year overlap ─────────────────────────────────────────────────────────────
function yearOverlap(v, yFrom, yTo) {
  const lo1 = v.year_from ?? 0,   hi1 = v.year_to ?? 9999;
  const lo2 = yFrom       ?? 0,   hi2 = yTo       ?? 9999;
  return lo1 <= hi2 && lo2 <= hi1;
}

// ─── Vehicle matching ─────────────────────────────────────────────────────────

// For BMW, the CSV uses series numbers ("1"–"8") but the DB has individual
// sub-models ("116i", "118D", "530D", etc.). Extract the sub-model code from
// the description column so we can match it against DB model names.
function extractBMWSubModelCode(description) {
  if (!description) return null;
  // Strip pipe-separated LWB variants: "735 i| iL Petrol …" → "735 i"
  let desc = description.replace(/\|.*$/, '').trim();
  // Strip from first fuel/drivetrain keyword onward
  desc = desc.replace(/\s+(Petrol|Diesel|Electric|Hybrid|Mild|Plug|Range|Full|All-wheel|Rear|Front|xDrive)\b.*/i, '').trim();
  // Normalize: lowercase, collapse spaces ("118 d" → "118d")
  return desc.toLowerCase().replace(/\s+/g, '') || null;
}

function findVehicles(row, vehiclesByMakeModel, vehiclesByMake) {
  const dbMake = dbMakeFor(row.make);

  // CSV may list multiple models as "500 / 595 / 695" — expand each variant
  const modelVariants = row.model.includes('/')
    ? row.model.split('/').map(m => m.trim())
    : [row.model];

  const pool = [];
  const seen = new Set();
  for (const mv of modelVariants) {
    const mvLower = mv.toLowerCase();
    // 1. Exact model name match (case-insensitive)
    for (const v of (vehiclesByMakeModel.get(`${dbMake}||${mvLower}`) || [])) {
      if (!seen.has(v.id)) { seen.add(v.id); pool.push(v); }
    }
    // 2. Prefix match: CSV "124" → DB "124 Spider", "124 Abarth", etc.
    const prefix = mvLower + ' ';
    for (const v of (vehiclesByMake.get(dbMake) || [])) {
      if (!seen.has(v.id) && v.model.toLowerCase().startsWith(prefix)) {
        seen.add(v.id);
        pool.push(v);
      }
    }
  }

  // 3. BMW series-level fallback: CSV model is a single digit ("1"–"8") but DB
  //    stores individual sub-models. Extract the specific variant from description.
  if (pool.length === 0 && dbMake === 'BMW' && /^\d$/.test(row.model)) {
    const subCode = extractBMWSubModelCode(row.description);
    if (subCode) {
      for (const v of (vehiclesByMake.get(dbMake) || [])) {
        if (!seen.has(v.id)) {
          const dbCode = v.model.toLowerCase().replace(/\s+/g, '');
          if (dbCode === subCode) { seen.add(v.id); pool.push(v); }
        }
      }
    }
  }

  return pool.filter(v => {
    if (!yearOverlap(v, row.year_from, row.year_to)) return false;

    // Fuel type — only filter if both sides have a value and they disagree
    if (v.fuel_type && row.engine_type) {
      const csvFuel = mapFuelType(row.engine_type);
      if (csvFuel && v.fuel_type !== csvFuel) {
        // ULP and Petrol are the same thing (Australian unlead petrol naming)
        const ulpPetrol = (a, b) =>
          (a === 'Petrol' && b === 'ULP') || (a === 'ULP' && b === 'Petrol');
        if (!ulpPetrol(csvFuel, v.fuel_type)) return false;
      }
    }

    // Engine kW — allow ±15 kW tolerance
    if (row.power_kw && v.engine_kw) {
      if (Math.abs(v.engine_kw - row.power_kw) > 15) return false;
    }

    return true;
  });
}

// ─── Flagged CSV writer ───────────────────────────────────────────────────────
function buildFlaggedCSV(flaggedRows) {
  const header = [
    'reason', 'part_number', 'make', 'model', 'year_from', 'year_to',
    'description', 'engine_type', 'body_type', 'engine_code', 'power_kw',
  ].join(',');

  const lines = flaggedRows.map(({ row, reason }) => {
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    return [
      esc(reason),
      row.part_number,
      row.make,
      esc(row.model),
      row.year_from ?? '',
      row.year_to   ?? '',
      esc(row.description),
      row.engine_type,
      row.body_type,
      esc(row.engine_code),
      row.power_kw ?? '',
    ].join(',');
  });

  return header + '\n' + lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT BATTERIES ===');
  console.log(`Brand:   ${BRAND}`);
  console.log(`CSV:     ${CSV_PATH}`);
  console.log();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    console.error('Pass the path as an argument: node import-battery-catalogue.js path/to/file.csv');
    process.exit(1);
  }

  // ── 1. Parse CSV ─────────────────────────────────────────────────────────
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter(l => l.trim());
  // Auto-detect header row: skip first line if it starts with "part_number"
  const dataLines = lines[0] && lines[0].toLowerCase().startsWith('part_number')
    ? lines.slice(1) : lines;
  const allRows = dataLines.map(l => parseRow(splitLine(l)));
  console.log(`Parsed ${allRows.length} rows${dataLines.length < lines.length ? ' (header skipped)' : ''}`);

  // ── 2. Classify rows ──────────────────────────────────────────────────────
  const validRows  = [];
  const nameErrors = []; // #NAME? description

  for (const row of allRows) {
    if (!row.part_number) continue;

    if (row.description === '#NAME?' || !row.description) {
      nameErrors.push({ row, reason: '#NAME? in description — source spreadsheet formula error, engine/variant data missing' });
      continue;
    }

    // Detect displacement-in-engine-code field; annotate but keep valid
    if (row.engine_code && isDisplacement(row.engine_code)) {
      row._litresFromCode  = displacementToLitres(row.engine_code);
      row._engineCodeValid = false;
    } else {
      row._litresFromCode  = null;
      row._engineCodeValid = true;
    }

    // Always try to parse litres from description as a fallback
    row._litresFromDesc = litresFromDesc(row.description);

    validRows.push(row);
  }

  console.log(`  Valid rows:      ${validRows.length}`);
  console.log(`  #NAME? errors:   ${nameErrors.length}`);
  console.log();

  // ── 3. Ensure Battery category exists ─────────────────────────────────────
  let cats = await apiGetAll(`/part_categories?select=id,name`);
  let cat  = cats.find(c => c.name === CATEGORY);
  if (!cat) {
    console.log(`Creating "${CATEGORY}" category...`);
    if (!DRY_RUN) {
      const maxSort = cats.reduce((m, c) => Math.max(m, c.sort_order || 0), 0);
      const created = await api('/part_categories?on_conflict=name', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=merge-duplicates,return=representation' },
        body:    JSON.stringify([{ name: CATEGORY, sort_order: maxSort + 1 }]),
      });
      cat = Array.isArray(created) ? created[0] : created;
    } else {
      cat = { id: null };
    }
  }
  console.log(`Category "${CATEGORY}" id=${cat?.id ?? '(dry-run)'}`);

  // ── 4. Build unique parts map ──────────────────────────────────────────────
  const partMap = new Map(); // part_number → object
  for (const row of validRows) {
    if (partMap.has(row.part_number)) continue;
    partMap.set(row.part_number, {
      brand:       BRAND,
      part_number: row.part_number,
      name:        row.name,
      category:    CATEGORY,
      category_id: cat?.id ?? null,
      specs: {
        voltage:       row.voltage,
        capacity_ah:   row.capacity_ah,
        cca:           row.cca,
        rc_minutes:    row.rc,
        length_mm:     row.length_mm,
        width_mm:      row.width_mm,
        height_mm:     row.height_mm,
        terminal_type: row.terminal_type,
        warranty_months: row.warranty_mo,
        tier:          row.tier,
      },
    });
  }
  console.log(`Unique battery part numbers: ${partMap.size}`);

  // ── 5. Upsert parts ───────────────────────────────────────────────────────
  const partRows  = [...partMap.values()];
  const partIdMap = {}; // part_number → DB id

  if (!DRY_RUN) {
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < partRows.length; i += BATCH) {
      const chunk    = partRows.slice(i, i + BATCH);
      const upserted = await api(`/parts?on_conflict=brand,part_number`, {
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
    partRows.slice(0, 5).forEach(p =>
      console.log(`    ${p.part_number}  →  ${p.name}  (${p.specs.capacity_ah}Ah, ${p.specs.cca}CCA)`)
    );
    if (partRows.length > 5) console.log(`    ... +${partRows.length - 5} more`);
    partRows.forEach(p => { partIdMap[p.part_number] = `dry_${p.part_number}`; });
  }

  // ── 6. Load relevant vehicles from DB ────────────────────────────────────
  const csvMakes = [...new Set(validRows.map(r => dbMakeFor(r.make)))].filter(Boolean);
  console.log(`\nLoading vehicles for: ${csvMakes.join(', ')}...`);
  const dbVehicles = [];
  for (const make of csvMakes) {
    const batch = await apiGetAll(
      `/vehicles?make=eq.${encodeURIComponent(make)}&select=id,make,model,series,year_from,year_to,engine_kw,engine_litres,fuel_type,chassis,engine_code,notes`
    );
    dbVehicles.push(...batch);
  }
  console.log(`  Found ${dbVehicles.length} vehicles`);

  // Index by "make||model_lower" for fast exact-model lookup
  const vehiclesByMakeModel = new Map();
  // Index by make for prefix-match fallback (e.g. "124" → "124 Spider")
  const vehiclesByMake = new Map();
  for (const v of dbVehicles) {
    const key = `${v.make}||${v.model.toLowerCase()}`;
    if (!vehiclesByMakeModel.has(key)) vehiclesByMakeModel.set(key, []);
    vehiclesByMakeModel.get(key).push(v);
    if (!vehiclesByMake.has(v.make)) vehiclesByMake.set(v.make, []);
    vehiclesByMake.get(v.make).push(v);
  }

  // ── 7. Load existing fitments to avoid duplicates ─────────────────────────
  const existingFitments = new Set();
  const liveIds = Object.values(partIdMap).filter(id => typeof id === 'string' && !id.startsWith('dry_'));
  if (!DRY_RUN && liveIds.length > 0) {
    console.log('Loading existing fitments...');
    const CHUNK = 200;
    for (let i = 0; i < liveIds.length; i += CHUNK) {
      const chunk = liveIds.slice(i, i + CHUNK);
      const rows = await apiGetAll(
        `/vehicle_part_fitments?select=vehicle_id,part_id&part_id=in.(${chunk.join(',')})`
      );
      for (const f of rows) existingFitments.add(`${f.vehicle_id}|${f.part_id}`);
    }
    console.log(`  Existing fitments: ${existingFitments.size}`);
  }

  // ── 8. Match rows → vehicles; collect fitments + backfill patches ──────────
  const fitmentsToInsert = [];
  const fitmentSet       = new Set(existingFitments);
  const backfillPatches  = new Map(); // vehicleId → patch object
  const noMatchRows      = [];

  for (const row of validRows) {
    const partId = partIdMap[row.part_number];
    if (!partId) continue;

    const matched = findVehicles(row, vehiclesByMakeModel, vehiclesByMake);

    if (matched.length === 0) {
      noMatchRows.push({
        row,
        reason: 'No matching vehicle found in DB',
      });
      continue;
    }

    for (const v of matched) {
      // Fitment
      const fKey = `${v.id}|${partId}`;
      if (!fitmentSet.has(fKey)) {
        fitmentSet.add(fKey);
        fitmentsToInsert.push({
          vehicle_id: v.id,
          part_id:    partId,
          notes:      row.is_auxiliary ? 'Auxiliary' : null,
        });
      }

      // Backfill — accumulate one patch per vehicle; first match wins per field
      const patch = backfillPatches.get(v.id) || {};

      // Only set a field if: DB value is null AND patch doesn't already have it
      if (!v.engine_kw   && patch.engine_kw   == null && row.power_kw)
        patch.engine_kw   = row.power_kw;
      if (!v.chassis     && patch.chassis     == null && row.body_type)
        patch.chassis     = row.body_type;
      if (!v.fuel_type   && patch.fuel_type   == null && row.engine_type)
        patch.fuel_type   = mapFuelType(row.engine_type);
      if (!v.engine_code && patch.engine_code == null && row._engineCodeValid && row.engine_code)
        patch.engine_code = row.engine_code;
      if (!v.engine_litres && patch.engine_litres == null) {
        const litres = row._litresFromDesc ?? row._litresFromCode;
        if (litres) patch.engine_litres = litres;
      }
      if (!v.notes && patch.notes == null) {
        const dt = row.drive_type.toLowerCase();
        if (dt.includes('all-wheel')) patch.notes = 'AWD';
      }
      if (!v.series && patch.series == null && row.chassis_code)
        patch.series = row.chassis_code;

      if (Object.keys(patch).length > 0) backfillPatches.set(v.id, patch);
    }
  }

  // ── 9. Apply backfill patches ─────────────────────────────────────────────
  console.log(`\nBackfill patches: ${backfillPatches.size} vehicles`);
  if (!DRY_RUN && backfillPatches.size > 0) {
    let done = 0, conflicts = 0;
    for (const [vehicleId, patch] of backfillPatches) {
      try {
        await api(`/vehicles?id=eq.${vehicleId}`, {
          method:  'PATCH',
          headers: { ...HDRS, Prefer: 'return=minimal' },
          body:    JSON.stringify(patch),
        });
      } catch (e) {
        // 409 = backfill would make this row identical to an existing vehicle
        // (DB already has a "complete" twin) — skip safely
        if (e.message.startsWith('409')) { conflicts++; }
        else throw e;
      }
      done++;
      process.stdout.write(`\r  Patched: ${done}/${backfillPatches.size} (${conflicts} skipped — already exists)`);
    }
    console.log();
  } else if (DRY_RUN) {
    let shown = 0;
    for (const [vehicleId, patch] of backfillPatches) {
      if (shown++ >= 5) break;
      console.log(`  vehicle ${vehicleId}:`, JSON.stringify(patch));
    }
    if (backfillPatches.size > 5) console.log(`  ... +${backfillPatches.size - 5} more`);
  }

  // ── 10. Insert fitments ────────────────────────────────────────────────────
  console.log(`\nNew fitments to insert: ${fitmentsToInsert.length}`);
  if (!DRY_RUN && fitmentsToInsert.length > 0) {
    const BATCH = 500;
    let done = 0;
    for (let i = 0; i < fitmentsToInsert.length; i += BATCH) {
      const chunk = fitmentsToInsert.slice(i, i + BATCH);
      await api('/vehicle_part_fitments', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body:    JSON.stringify(chunk),
      });
      done += chunk.length;
      process.stdout.write(`\r  Fitments: ${done}/${fitmentsToInsert.length}`);
    }
    console.log();
  } else if (DRY_RUN && fitmentsToInsert.length > 0) {
    fitmentsToInsert.slice(0, 5).forEach(f =>
      console.log(`  vehicle ${f.vehicle_id} → part ${f.part_id}`)
    );
    if (fitmentsToInsert.length > 5) console.log(`  ... +${fitmentsToInsert.length - 5} more`);
  }

  // ── 11. Write flagged CSV ─────────────────────────────────────────────────
  const allFlagged = [...nameErrors, ...noMatchRows];

  const flaggedDir  = path.join(__dirname, '..', 'flagged');
  const csvBasename = path.basename(CSV_PATH, path.extname(CSV_PATH))
    .toLowerCase().replace(/\s+/g, '-');
  const flaggedPath = path.join(flaggedDir, `flagged-batteries-${csvBasename}.csv`);

  fs.mkdirSync(flaggedDir, { recursive: true });
  fs.writeFileSync(flaggedPath, buildFlaggedCSV(allFlagged), 'utf8');

  // ── 12. Summary ───────────────────────────────────────────────────────────
  console.log('\n─── Summary ──────────────────────────────────────────');
  console.log(`  Total CSV rows:          ${allRows.length}`);
  console.log(`  Valid rows processed:    ${validRows.length}`);
  console.log(`  #NAME? errors (skipped): ${nameErrors.length}`);
  console.log(`  Vehicles with matches:   ${backfillPatches.size + fitmentsToInsert.length > 0 ? '(see above)' : 0}`);
  console.log(`  Fitments inserted:       ${DRY_RUN ? `(dry-run) ~${fitmentsToInsert.length} pending` : fitmentsToInsert.length}`);
  console.log(`  Backfill patches:        ${DRY_RUN ? '(dry-run)' : backfillPatches.size}`);
  console.log(`  No-match rows flagged:   ${noMatchRows.length}`);
  console.log(`  Flagged CSV:             ${flaggedPath}`);

  if (nameErrors.length > 0) {
    console.log('\n  #NAME? rows (review source spreadsheet):');
    const seen = new Set();
    for (const { row } of nameErrors) {
      const k = `${row.make}|${row.model}|${row.year_from}-${row.year_to}|${row.engine_code}`;
      if (seen.has(k)) continue;
      seen.add(k);
      console.log(`    ${row.make} ${row.model} ${row.year_from}–${row.year_to}  engine_code="${row.engine_code}"`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
