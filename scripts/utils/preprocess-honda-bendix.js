#!/usr/bin/env node
// Pre-process honda_brake_catalogue.csv into the standard import CSV format.
//
// Source columns:
//   make,model,series,body,year_from,year_to,engine_code,engine_litres,engine_kw,
//   trim_code,drivetrain,front_pads,rear_pads,park_brake_shoes,notes
//
// Each source row may produce up to 3 output rows:
//   front_pads   → position=Front,      category=Brake Pad Set
//   rear_pads    → position=Rear,       category=Brake Pad Set
//   park_brake_shoes → position=Park Brake, category=Brake Shoe Set
//
// Series like "CL,CN" are split into one output row per series.
//
// Usage:
//   node scripts/utils/preprocess-honda-bendix.js <input.csv> <output.csv>

const fs   = require('fs');
const path = require('path');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/utils/preprocess-honda-bendix.js <input.csv> <output.csv>');
  process.exit(1);
}

// ─── CSV parser (handles quoted fields) ───────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

// ─── Process ──────────────────────────────────────────────────────────────────
const lines = fs.readFileSync(path.resolve(inputPath), 'utf8').split(/\r?\n/);
let headerCols = null;
const outputRows = [];
let kept = 0, skipped = 0, splits = 0;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  if (!headerCols) {
    headerCols = cols.map(h => h.toLowerCase());
    continue;
  }

  const get = (name) => cols[headerCols.indexOf(name)] ?? '';

  const make         = get('make').trim();
  const model        = get('model').trim();
  const series       = get('series').trim();
  const body         = get('body').trim();
  const yearFrom     = get('year_from').trim();
  const yearTo       = get('year_to').trim();
  const engineLitres = get('engine_litres').trim();
  const trimCode     = get('trim_code').trim();
  const drivetrain   = get('drivetrain').trim();
  const frontPads    = get('front_pads').trim();
  const rearPads     = get('rear_pads').trim();
  const parkShoes    = get('park_brake_shoes').trim();
  // Fix encoding artefact "Ã" that appears in some notes
  const notes        = get('notes').trim().replace(/Ã/g, '');

  if (!make || !model) { skipped++; continue; }

  // Split combined series e.g. "CL,CN" → ["CL", "CN"]
  const seriesList = series.split(',').map(s => s.trim()).filter(Boolean);
  if (seriesList.length === 0) seriesList.push('');
  if (seriesList.length > 1) splits += seriesList.length - 1;

  for (const s of seriesList) {
    // front pads
    if (frontPads) {
      outputRows.push(['Bendix', make, model, s, engineLitres, trimCode, drivetrain, body, yearFrom, yearTo, 'Brake Pad Set', 'Front', frontPads, notes]);
      kept++;
    }
    // rear pads
    if (rearPads) {
      outputRows.push(['Bendix', make, model, s, engineLitres, trimCode, drivetrain, body, yearFrom, yearTo, 'Brake Pad Set', 'Rear', rearPads, notes]);
      kept++;
    }
    // park brake shoes
    if (parkShoes) {
      outputRows.push(['Bendix', make, model, s, engineLitres, trimCode, drivetrain, body, yearFrom, yearTo, 'Brake Shoe Set', 'Park Brake', parkShoes, notes]);
      kept++;
    }
  }
}

// ─── Write output CSV ─────────────────────────────────────────────────────────
const HEADER = 'brand,make,model,series,engine,trim,drivetrain,body,year_from,year_to,category,position,part_number,notes';

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const csvLines = [HEADER];
for (const row of outputRows) {
  csvLines.push(row.map(escapeCSV).join(','));
}

fs.writeFileSync(path.resolve(outputPath), csvLines.join('\n') + '\n', 'utf8');

console.log(`Input rows:  ${lines.length - 1} (minus header)`);
console.log(`Skipped:     ${skipped}`);
console.log(`Series splits: ${splits} extra rows`);
console.log(`Output rows: ${kept}`);
console.log(`Written to:  ${path.resolve(outputPath)}`);
