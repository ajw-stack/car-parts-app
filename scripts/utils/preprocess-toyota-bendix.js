#!/usr/bin/env node
// Pre-process toyota_bendix_brakes_v2.csv into the standard import CSV format.
//
// Transforms applied:
//  - brand column: "Toyota" → "Bendix"  (brand is the parts supplier, not the vehicle make)
//  - make column: kept as "Toyota"
//  - Combined series (e.g. "N5, N6, N7") split into separate rows
//  - Category names normalised to DB values (removes directional prefix)
//  - Position "Front Axle" / "Rear Axle" → "Front" / "Rear"
//  - Rows with empty model or part number dropped
//
// Usage:
//   node scripts/preprocess-toyota-bendix.js <input.csv> <output.csv>

const fs = require('fs');
const path = require('path');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/preprocess-toyota-bendix.js <input.csv> <output.csv>');
  process.exit(1);
}

// ─── CSV parser (handles quoted fields) ────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        // check for escaped quote ""
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

// ─── Category mapping ──────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  'Front Brake Pad Set':               'Brake Pad Set',
  'Rear Brake Pad Set':                'Brake Pad Set',
  'Front Brake Shoe Set':              'Brake Shoe Set',
  'Rear Brake Shoe Set':               'Brake Shoe Set',
  'Front Brake Disc Rotor':            'Brake Rotor',
  'Rear Brake Disc Rotor':             'Brake Rotor',
  'Front Brake Drum':                  'Brake Drum',
  'Rear Brake Drum':                   'Brake Drum',
  'Brake Fluid':                       'Brake Fluid',
  'Front Brake Hose Set':              'Brake Hose Set',
  'Rear Brake Hose Set':               'Brake Hose Set',
  'Front High Performance Brake Kit':  'High Performance Brake Kit',
  'Rear High Performance Brake Kit':   'High Performance Brake Kit',
  'High Performance Brake Kit':        'High Performance Brake Kit',
  'Park Brake Shoe Set, parking brake':'Park Brake Shoe Set',
  'Rear Brake Shoe Set, parking brake':'Park Brake Shoe Set',
  'Brake Booster Brake Booster':       'Brake Booster',
  'Brake Booster':                     'Brake Booster',
  'Front and Rear Brake Pad Set':      'Brake Pad Set',
};

function normCategory(raw) {
  return CATEGORY_MAP[raw] ?? raw;
}

const POSITION_MAP = {
  'Front Axle':                                          'Front',
  'Rear Axle':                                           'Rear',
  'Brake shoe at parking brake':                         'Rear',
  'Rear Axle Centre':                                    'Rear',
  'Rear Axle both sides':                                'Rear',
  'At steering rod intermediate lever to front axle':    'Front',
  'Front AxleRear Axle':                                 'Front',
};

function normPosition(raw) {
  return POSITION_MAP[raw] ?? raw;
}

// ─── Process ───────────────────────────────────────────────────────────────────
const lines = fs.readFileSync(path.resolve(inputPath), 'utf8').split(/\r?\n/);

let headerCols = null;
const outputRows = [];

let skipped = 0, split = 0, kept = 0;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const cols = parseCSVLine(line);

  if (!headerCols) {
    headerCols = cols.map(h => h.toLowerCase());
    continue;
  }

  const get = (name) => cols[headerCols.indexOf(name)] ?? '';

  const brand      = get('brand');
  const make       = get('make');
  const model      = get('model').trim();
  const series     = get('series').trim();
  const engine     = get('engine').trim();
  const trim       = get('trim').trim();
  const drivetrain = get('drivetrain').trim();
  const body       = get('body').trim();
  const yearFrom   = get('year_from').trim();
  const yearTo     = get('year_to').trim();
  const category   = get('category').trim();
  const position   = get('position').trim();
  const partNumber = get('part_number').trim();
  const notes      = get('notes').trim();

  // Drop rows with no model or no part number
  if (!model || !partNumber) { skipped++; continue; }

  const normCat = normCategory(category);
  const normPos = normPosition(position);

  // Fix brand (vehicle make appears in brand column — always output supplier "Bendix")
  const outBrand = 'Bendix';

  // Split combined series like "N5, N6, N7"
  const seriesList = series.split(',').map(s => s.trim()).filter(Boolean);
  if (seriesList.length === 0) seriesList.push('');

  if (seriesList.length > 1) split += seriesList.length - 1;

  for (const s of seriesList) {
    outputRows.push([outBrand, make, model, s, engine, trim, drivetrain, body, yearFrom, yearTo, normCat, normPos, partNumber, notes]);
    kept++;
  }
}

// ─── Write output CSV ──────────────────────────────────────────────────────────
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

console.log(`Input rows: ${lines.length - 1} (minus header)`);
console.log(`Skipped (unsupported category / no model): ${skipped}`);
console.log(`Extra rows from series splits: ${split}`);
console.log(`Output rows: ${kept}`);
console.log(`Written to: ${path.resolve(outputPath)}`);
