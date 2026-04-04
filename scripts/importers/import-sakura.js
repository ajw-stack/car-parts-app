#!/usr/bin/env node
// Import Sakura 4WD Filter Kits from extracted CSV
// Source: sakura_4wd_filters.csv
//
// Usage:
//   node scripts/importers/import-sakura.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const CSV_PATH = path.join(__dirname, '..', '..', 'sakura_4wd_filters.csv');

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
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const hdrs = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = l.split(',').map(v => v.trim());
    const row = {};
    hdrs.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ─── Make normalisation ───────────────────────────────────────────────────────
const MAKE_MAP = {
  'FORD':          'Ford',
  'HOLDEN':        'Holden',
  'HYUNDAI':       'Hyundai',
  'ISUZU':         'Isuzu',
  'MAZDA':         'Mazda',
  'MERCEDES BENZ': 'Mercedes-Benz',
  'MITSUBISHI':    'Mitsubishi',
  'NISSAN':        'Nissan',
  'SSANGYONG':     'SsangYong',
  'SUZUKI':        'Suzuki',
  'TOYOTA':        'Toyota',
  'VOLKSWAGEN':    'Volkswagen',
};

// ─── Year parsing ─────────────────────────────────────────────────────────────
function parseYearRange(s) {
  if (!s) return null;
  s = s.trim().toUpperCase();

  // MM/YYYY-YYYY or MM/YY-YYYY
  let m = s.match(/^(\d{1,2})\/(\d{2,4})-(\d{4})$/);
  if (m) {
    const from = m[2].length === 2 ? (parseInt(m[2]) <= 30 ? 2000 + parseInt(m[2]) : 1900 + parseInt(m[2])) : parseInt(m[2]);
    return { yearFrom: from, yearTo: parseInt(m[3]) };
  }

  // YYYY-YYYY
  m = s.match(/^(\d{4})-(\d{4})$/);
  if (m) return { yearFrom: parseInt(m[1]), yearTo: parseInt(m[2]) };

  // YYYY-ON or YYYY-on
  m = s.match(/^(\d{4})-ON$/);
  if (m) return { yearFrom: parseInt(m[1]), yearTo: null };

  // Single YYYY
  m = s.match(/^(\d{4})$/);
  if (m) return { yearFrom: parseInt(m[1]), yearTo: parseInt(m[1]) };

  // MM/YYYY-ON
  m = s.match(/^(\d{1,2})\/(\d{4})-ON$/);
  if (m) return { yearFrom: parseInt(m[2]), yearTo: null };

  return null;
}

// ─── Row validation ───────────────────────────────────────────────────────────
// Known engine codes / non-model values to reject from Model field
const REJECT_MODEL = new Set([
  'FORD','HOLDEN','HYUNDAI','ISUZU','MAZDA','MERCEDES BENZ','MITSUBISHI',
  'NISSAN','SSANGYONG','SUZUKI','TOYOTA','VOLKSWAGEN',
]);

function isValidRow(row) {
  const model = row['Model']?.trim();
  const year  = row['Year']?.trim();
  const kit   = row['4WD_Filter_Kit']?.trim();

  // Must have a kit number
  if (!kit || !kit.startsWith('K-')) return false;

  // Must have a year range we can parse
  if (!year || !parseYearRange(year)) return false;

  // Must have a model that isn't a make name or engine code
  if (!model) return false;
  if (REJECT_MODEL.has(model.toUpperCase())) return false;
  // Reject if model looks like an engine code (all caps, no spaces, short)
  if (/^[A-Z0-9\-]+$/.test(model) && model.length <= 8 && !model.includes(' ')) return false;

  return true;
}

// ─── Model name normalisation ─────────────────────────────────────────────────
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

function yearOverlap(v, yearFrom, yearTo) {
  const dFrom = yearFrom ?? 0;
  const dTo   = yearTo   ?? 9999;
  return (v.year_from ?? 0) <= dTo && (v.year_to ?? 9999) >= dFrom;
}

// ─── Category lookup ──────────────────────────────────────────────────────────
const FILTER_KIT_CATEGORY_ID = 26; // "Filter Service Kit" in part_categories

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT SAKURA 4WD FILTER KITS ===');

  // ── 1. Parse CSV ───────────────────────────────────────────────────────────
  const allRows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
  const validRows = allRows.filter(isValidRow);
  const skippedRows = allRows.filter(r => !isValidRow(r));
  console.log(`\nTotal CSV rows: ${allRows.length}`);
  console.log(`Valid rows:     ${validRows.length}`);
  console.log(`Skipped rows:   ${skippedRows.length}`);

  // Write skipped rows to a file for manual review
  const skippedPath = path.join(__dirname, '..', '..', 'sakura_skipped_rows.csv');
  const skippedHeaders = ['Manufacturer','Model','Series','Engine','Cylinders','Capacity','Fuel_Type','Fuel_Air_Intake','Year','4WD_Filter_Kit','Filter_Guard_Kit','_skip_reason'];
  const skippedWithReason = skippedRows.map(row => {
    let reason = '';
    const kit   = row['4WD_Filter_Kit']?.trim();
    const year  = row['Year']?.trim();
    const model = row['Model']?.trim();
    if (!kit || !kit.startsWith('K-'))          reason = 'No valid kit number';
    else if (!year || !parseYearRange(year))     reason = 'No valid year range';
    else if (!model)                             reason = 'No model';
    else if (REJECT_MODEL.has(model.toUpperCase())) reason = 'Model field contains make name';
    else if (/^[A-Z0-9\-]+$/.test(model) && model.length <= 8 && !model.includes(' ')) reason = 'Model looks like engine code';
    else                                         reason = 'Unknown';
    return { ...row, _skip_reason: reason };
  });
  const skippedLines = [skippedHeaders.join(','), ...skippedWithReason.map(r => skippedHeaders.map(h => r[h] ?? '').join(','))];
  fs.writeFileSync(skippedPath, skippedLines.join('\n'), 'utf8');
  console.log(`Skipped rows saved to: sakura_skipped_rows.csv`);

  // ── 2. Build unique parts ──────────────────────────────────────────────────
  const partMap = new Map(); // part_number → part object
  for (const row of validRows) {
    const pn = row['4WD_Filter_Kit'].trim();
    if (!partMap.has(pn)) {
      partMap.set(pn, {
        brand:       'Sakura',
        part_number: pn,
        name:        `4WD Filter Kit ${pn}`,
        category:    'Filter Service Kit',
        category_id: FILTER_KIT_CATEGORY_ID,
      });
    }
    // Also add filter guard kit if present
    const fg = row['Filter_Guard_Kit']?.trim();
    if (fg && fg.startsWith('FG-') && !partMap.has(fg)) {
      partMap.set(fg, {
        brand:       'Sakura',
        part_number: fg,
        name:        `4WD Filter Guard Kit ${fg}`,
        category:    'Filter Service Kit',
        category_id: FILTER_KIT_CATEGORY_ID,
      });
    }
  }

  console.log(`Unique parts: ${partMap.size}`);

  // ── 4. Upsert parts ────────────────────────────────────────────────────────
  const partRows  = [...partMap.values()];
  const partIdMap = {}; // part_number → DB id

  if (!DRY_RUN) {
    const upserted = await api('/parts?on_conflict=brand,part_number', {
      method:  'POST',
      headers: { ...HDRS, Prefer: 'resolution=merge-duplicates,return=representation' },
      body:    JSON.stringify(partRows),
    });
    for (const p of upserted) partIdMap[p.part_number] = p.id;
    console.log(`Parts upserted: ${upserted.length}`);
  } else {
    console.log('  (dry-run) parts:');
    partRows.forEach(p => { console.log(`    ${p.part_number}  →  ${p.name}`); partIdMap[p.part_number] = `dry_${p.part_number}`; });
  }

  // ── 5. Load vehicles per make ──────────────────────────────────────────────
  const allMakes = [...new Set(validRows.map(r => MAKE_MAP[r['Manufacturer']?.trim().toUpperCase()] ?? null).filter(Boolean))];
  const makeVehicles = new Map();

  console.log('\nLoading vehicles from DB...');
  for (const make of allMakes) {
    const vs = await apiGetAll(`/vehicles?make=eq.${encodeURIComponent(make)}&select=id,model,series,year_from,year_to`);
    makeVehicles.set(make, vs);
    console.log(`  ${make}: ${vs.length} vehicles`);
  }

  // ── 6. Match rows to vehicles ──────────────────────────────────────────────
  const fitments  = [];
  const fitmentSet = new Set();
  const unmatched  = [];

  for (const row of validRows) {
    const makeRaw = row['Manufacturer']?.trim().toUpperCase();
    const dbMake  = MAKE_MAP[makeRaw];
    if (!dbMake) { unmatched.push(`No make mapping: ${makeRaw}`); continue; }

    const model   = row['Model']?.trim();
    const yearStr = row['Year']?.trim();
    const yr      = parseYearRange(yearStr);
    const kitPn   = row['4WD_Filter_Kit']?.trim();
    const fgPn    = row['Filter_Guard_Kit']?.trim();

    const partId  = partIdMap[kitPn];
    if (!partId) continue;

    const vehicles = makeVehicles.get(dbMake) ?? [];
    const matched  = vehicles.filter(v =>
      modelMatch(model, v.model) && yearOverlap(v, yr.yearFrom, yr.yearTo)
    );

    if (matched.length === 0) {
      unmatched.push(`${dbMake} ${model} ${yearStr}`);
      continue;
    }

    for (const v of matched) {
      // Main kit
      const k1 = `${v.id}|${partId}`;
      if (!fitmentSet.has(k1)) {
        fitmentSet.add(k1);
        fitments.push({ vehicle_id: v.id, part_id: partId });
      }
      // Filter guard kit
      if (fgPn && partIdMap[fgPn]) {
        const fgId = partIdMap[fgPn];
        const k2   = `${v.id}|${fgId}`;
        if (!fitmentSet.has(k2)) {
          fitmentSet.add(k2);
          fitments.push({ vehicle_id: v.id, part_id: fgId });
        }
      }
    }
  }

  console.log(`\nNew fitments: ${fitments.length}`);
  console.log(`Unmatched:    ${unmatched.length}`);

  // ── 7. Insert fitments ─────────────────────────────────────────────────────
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
  }

  // ── 8. Unmatched summary ───────────────────────────────────────────────────
  if (unmatched.length > 0) {
    console.log('\n--- Valid rows with no DB vehicle match ---');
    [...new Set(unmatched)].forEach(u => console.log(`  ${u}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
