#!/usr/bin/env node
// Import DBA 2020 catalogue from CSV (all makes, all series variants)
// CSV source: C:\Users\ajwin\Downloads\dba_catalogue_2020_supabase.csv
//
// Usage:
//   node scripts/import-dba-catalogue.js [--dry-run] [--make <makename>]
//
// --make filters to a single make (partial match, case-insensitive).
// Example: node scripts/import-dba-catalogue.js --make BMW --dry-run
//
// Availability flags from CSV:
//   ranged_item      → stocked (no special marking)
//   special_order_item → name gets " (Special Order)" suffix
//   blank            → not available in that series (skipped)
//
// Part number derivation rules (base = Street OED part_no from CSV):
//   Street OED   : DBA{base}
//   Street T2    : DBA{base}S
//   Street X     : DBA{base}X
//   4000 HD      : DBA4{base}
//   4000 T3      : DBA4{base}S
//   4000 XS      : DBA4{base}XS
//   5000 T3      : DBA5{base}S

const fs   = require('fs');
const path = require('path');

const DRY_RUN  = process.argv.includes('--dry-run');
const makeIdx  = process.argv.indexOf('--make');
const MAKE_ARG = makeIdx >= 0 ? process.argv[makeIdx + 1] : null;

const CSV_PATH    = path.join('C:', 'Users', 'ajwin', 'Downloads', 'dba_catalogue_2020_supabase.csv');
const CATEGORY_ID = 31; // Brake Rotor (hardcoded — matches existing DBA scripts)

// ─── Env ──────────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
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

// Paginated GET — handles large result sets via Range headers
async function apiGetAll(urlPath) {
  const all = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const res = await fetch(`${BASE}/rest/v1${urlPath}`, {
      headers: { ...HDRS, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${await res.text()}`);
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
  const colHdrs = splitLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = splitLine(l);
    const row  = {};
    colHdrs.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ─── Make normalisation ───────────────────────────────────────────────────────
const MAKE_MAP = {
  ABARTH: 'Abarth', ACURA: 'Acura',
  ALFAROMEO: 'Alfa Romeo', ASTONMARTIN: 'Aston Martin',
  AUDI: 'Audi', AUSTINHEALEY: 'Austin Healey',
  BMW: 'BMW', CADILLAC: 'Cadillac', CHERY: 'Chery',
  CHEVROLET: 'Chevrolet', CHRYSLER: 'Chrysler', CITROEN: 'Citroen',
  DAEWOO: 'Daewoo', DAIHATSU: 'Daihatsu', DAIMLERCHRYSLER: 'DaimlerChrysler',
  DODGE: 'Dodge', DS: 'DS', EUNOS: 'Eunos',
  FIAT: 'Fiat', FORD: 'Ford', FOTON: 'Foton',
  GMC: 'GMC', GREATWALL: 'Great Wall',
  HOLDEN: 'Holden', HONDA: 'Honda', HUMMER: 'Hummer',
  HYUNDAI: 'Hyundai', INFINITI: 'Infiniti', ISUZU: 'Isuzu',
  JAGUAR: 'Jaguar', JEEP: 'Jeep', KIA: 'Kia',
  LANDROVER: 'Land Rover', LEYLAND: 'Leyland', LEXUS: 'Lexus', LOTUS: 'Lotus',
  MAZDA: 'Mazda', MERCEDESBENZ: 'Mercedes-Benz',
  MG: 'MG', MINI: 'Mini', MITSUBISHI: 'Mitsubishi', MORRIS: 'Morris',
  NISSAN: 'Nissan', OPEL: 'Opel',
  PEUGEOT: 'Peugeot', PONTIAC: 'Pontiac', PORSCHE: 'Porsche', PROTON: 'Proton',
  RENAULT: 'Renault', ROLLSROYCE: 'Rolls-Royce', ROVER: 'Rover',
  SAAB: 'Saab', SCION: 'Scion', SEAT: 'SEAT', SKODA: 'Skoda', SMART: 'Smart',
  SSANGYONG: 'SsangYong', SUBARU: 'Subaru', SUZUKI: 'Suzuki', TESLA: 'Tesla',
  TOYOTA: 'Toyota', TRIUMPH: 'Triumph',
  VOLKSWAGEN: 'Volkswagen', VOLVO: 'Volvo',
};

function normMake(raw) {
  const key = raw.trim().toUpperCase().replace(/[\s\-]+/g, '');
  return MAKE_MAP[key] ?? raw.trim();
}

// ─── Year parsing ─────────────────────────────────────────────────────────────
function expand2DigitYear(yy) {
  const n = +yy;
  return n <= 30 ? 2000 + n : 1900 + n;
}

function parseYears(s) {
  if (!s) return {};
  s = s.trim();
  let m;

  // Silently ignore non-year data that leaked into this field
  if (/^(PCD=|BACKING|ILP|Not\b)/i.test(s)) return {};

  // Normalise OCR/typo variants before matching
  // "0N" → "on", dot-separator "08.2007" → "08/2007"
  s = s.replace(/\b0[Nn]\b/g, 'on').replace(/(\d{2})\.(\d{4})/g, '$1/$2');

  // Fix missing slash in "031999" style: "06/1994-031999" → "06/1994-03/1999"
  s = s.replace(/-(\d{2})(\d{4})$/, '-$1/$2');

  // Fix 3-digit year typos: "01/200-" → "01/2000-"
  s = s.replace(/(\d{1,2})\/(\d{3})(-|$)/, (_, mo, yr, sep) => `${mo}/0${yr}${sep}`);

  // Strip leading/trailing noise phrases — keep only the first parseable range
  s = s.replace(/^(Late|Early|From|Up\s*to|Until|to)\s*/i, (_, kw) => {
    // "Up to" / "Until" / "to" mean year_to only — handled below after cleaning
    return kw.match(/up\s*to|until|^to$/i) ? '__UPTO__' : '';
  });

  const upto = s.startsWith('__UPTO__');
  s = s.replace('__UPTO__', '').trim();

  // If multiple ranges separated by space, take the first token-pair
  // e.g. "1996-2007 05/2004-09/2007" → "1996-2007"
  if (/\s/.test(s)) {
    s = s.split(/\s+/)[0];
  }

  // MM/YYYY-MM/YYYY
  if ((m = s.match(/^(\d{1,2})\/(\d{4})-(\d{1,2})\/(\d{4})$/)))
    return upto
      ? { year_to: +m[2], month_to: +m[1] }
      : { year_from: +m[2], year_to: +m[4], month_from: +m[1], month_to: +m[3] };
  // MM/YYYY-YYYY
  if ((m = s.match(/^(\d{1,2})\/(\d{4})-(\d{4})$/)))
    return upto
      ? { year_to: +m[2], month_to: +m[1] }
      : { year_from: +m[2], year_to: +m[3], month_from: +m[1] };
  // MM/YY-YYYY (2-digit start year)
  if ((m = s.match(/^(\d{1,2})\/(\d{2})-(\d{4})$/)))
    return { year_from: expand2DigitYear(m[2]), year_to: +m[3], month_from: +m[1] };
  // YYYY-MM/YYYY
  if ((m = s.match(/^(\d{4})-(\d{1,2})\/(\d{4})$/)))
    return upto
      ? { year_to: +m[3], month_to: +m[2] }
      : { year_from: +m[1], year_to: +m[3], month_to: +m[2] };
  // MM/YYYY-on
  if ((m = s.match(/^(\d{1,2})\/(\d{4})-on$/i)))
    return { year_from: +m[2], month_from: +m[1] };
  // YYYY-on
  if ((m = s.match(/^(\d{4})-on$/i)))
    return { year_from: +m[1] };
  // YYYY-YYYY
  if ((m = s.match(/^(\d{4})-(\d{4})$/)))
    return upto
      ? { year_to: +m[2] }
      : { year_from: +m[1], year_to: +m[2] };
  // YYYY-YY (2-digit end year, e.g. 2000-01, 2004-06)
  if ((m = s.match(/^(\d{4})-(\d{2})$/))) {
    const from = +m[1];
    const to   = expand2DigitYear(m[2]);
    return upto ? { year_to: to } : { year_from: from, year_to: to };
  }
  // MM/YYYY (single month/year, no end)
  if ((m = s.match(/^(\d{1,2})\/(\d{4})$/)))
    return upto
      ? { year_to: +m[2], month_to: +m[1] }
      : { year_from: +m[2], month_from: +m[1] };
  // Single YYYY
  if ((m = s.match(/^(\d{4})$/)))
    return upto ? { year_to: +m[1] } : { year_from: +m[1], year_to: +m[1] };
  // YYYY-only
  if ((m = s.match(/^(\d{4})-only$/i)))
    return { year_from: +m[1], year_to: +m[1] };
  // D/MM/YY or M/DD/YY — treat last component as 2-digit year
  if ((m = s.match(/^(\d{1,2})\/(\d{2})\/(\d{2})$/)))
    return { year_from: expand2DigitYear(m[3]), year_to: expand2DigitYear(m[3]) };

  // Remaining unrecognized — warn but don't abort
  console.warn(`  Unrecognized years format: "${s}"`);
  return {};
}

// ─── Dimension string ─────────────────────────────────────────────────────────
function dimStr(row) {
  if (!row.A) return null;
  const type = row.solid_vented === 'V' ? 'Vented' : 'Solid';
  const min  = row.D ? ` (min ${row.D}mm)` : '';
  return `Ø${row.A}mm ${type} | Ht ${row.B}mm | ${row.C}mm thick${min} | CHD ${row.E}mm | ${row.F}-bolt`;
}

// ─── Series definitions ───────────────────────────────────────────────────────
// pre = numeric prefix prepended to base number, suf = suffix appended
const SERIES = [
  { col: 'oed_status',     pre: '',  suf: '',   label: 'Street Series Rotor'    },
  { col: 't2_status',      pre: '',  suf: 'S',  label: 'Street Series T2 Rotor' },
  { col: 'x_status',       pre: '',  suf: 'X',  label: 'Street Series X Rotor'  },
  { col: 'hd_status',      pre: '4', suf: '',   label: '4000 Series HD Rotor'   },
  { col: 't3_4000_status', pre: '4', suf: 'S',  label: '4000 Series T3 Rotor'   },
  { col: 'xs_status',      pre: '4', suf: 'XS', label: '4000 Series XS Rotor'   },
  { col: 't3_5000_status', pre: '5', suf: 'S',  label: '5000 Series T3 Rotor'   },
];

function derivePn(base, s) {
  return `DBA${s.pre}${base}${s.suf}`;
}

// ─── Vehicle matching ─────────────────────────────────────────────────────────
// Vehicles are master data — this importer NEVER creates vehicles.
// For each DBA row, we run up to 4 matching strategies against existing DB vehicles.
// All matched vehicles get a fitment. Unmatched rows are reported at the end.
//
// Strategy 1 — Exact case-insensitive model name match
// Strategy 2 — Series code extraction (e.g. VE/VEII/VF → Commodore VE, VE II, VF)
// Strategy 3 — Compound text split on "/" and "&" (RODEO / COLORADO → Rodeo + Colorado)
// Strategy 4 — Embedded keyword lookup (CALAIS, STATESMAN, CREWMAN, etc.)

// ── Series-to-model map ────────────────────────────────────────────────────────
// For makes where DBA uses heading=make, the model_text contains series codes.
// Keys are the series codes as they appear in DBA text; values are DB model names.
const SERIES_MODEL_MAP = {
  Holden: {
    // Commodore
    VB:'Commodore', VC:'Commodore', VH:'Commodore', VK:'Commodore',
    VL:'Commodore', VN:'Commodore', VP:'Commodore', VR:'Commodore',
    VS:'Commodore', VT:'Commodore', VU:'Commodore', VX:'Commodore',
    VY:'Commodore', VZ:'Commodore',
    VE:'Commodore', VEII:'Commodore', 'VE II':'Commodore',
    VF:'Commodore', 'VF II':'Commodore', ZB:'Commodore',
    // Statesman / Caprice
    WH:'Statesman', WK:'Statesman', WL:'Statesman', WM:'Statesman',
    // Gemini (series code = body series)
    TX:'Gemini', TC:'Gemini', TD:'Gemini', TE:'Gemini',
    TF:'Gemini', TG:'Gemini', RB:'Gemini',
    // Rodeo (DBA calls it "R9")
    R9:'Rodeo',
    // Barina
    TK:'Barina', TM:'Barina',
    // Barina Spark
    MJ:'Barina Spark',
  },
};

// ── Ordered series lists (for range expansion e.g. "VB-VS") ────────────────────
const SERIES_ORDER = {
  Holden: {
    Commodore: ['VB','VC','VH','VK','VL','VN','VP','VR','VS','VT','VX','VY','VZ','VE','VEII','VF','VFII','ZB'],
    Statesman: ['WH','WK','WL','WM'],
    Gemini:    ['TX','TC','TD','TE','TF','TG','RB'],
  },
};

// ── Alias map — DBA marketing terms → normalised model names ──────────────────
// Applied before other strategies. Keys are uppercase patterns to test in rawText.
const ALIAS_MAP = {
  Holden: {
    'ONE TONNER':  'Ute',
    'ONE-TONNER':  'Ute',
    'HSV':         null,     // HSV is a sub-brand — handled via series (VE/VF) not separate model
    'COLORADO':    'Colorado', // also captured by KEYWORD_MODEL_MAP, explicit here for alias clarity
    '4WD RODEO':   'Rodeo',
    'CREWMAN':     'Crewman',
  },
};

// ── Keyword-to-model map ───────────────────────────────────────────────────────
// For model names embedded in longer DBA description strings.
const KEYWORD_MODEL_MAP = {
  Holden: {
    CALAIS:'Calais', STATESMAN:'Statesman', CAPRICE:'Caprice',
    CREWMAN:'Crewman', MONARO:'Monaro',
    COLORADO:'Colorado', RODEO:'Rodeo',
    TORANA:'Torana', SUNBIRD:'Torana',
    FRONTERA:'Frontera', DROVER:'Drover',
    // DBA performance/upgrade headings — match all Commodore variants by year range
    'UPGRADE OPTIONS':'Commodore', WALKINSHAW:'Commodore',
    COMBO:'Combo', CRUZE:'Cruze', BARINA:'Barina',
    // "Inc UTE" = "including Ute variant" — Commodore Ute is still a Commodore in DB
    UTE:'Commodore',
  },
};

// ── Series-to-successor map: when year range exceeds the primary model, also try ──
// e.g. Rodeo ended ~2008; Colorado is its successor using same brake spec (R9)
const SERIES_SUCCESSOR = {
  Holden: {
    R9: 'Colorado',
  },
};

// ── Core year-overlap check ────────────────────────────────────────────────────
function yearOverlap(v, yearFrom, yearTo) {
  const dFrom = yearFrom ?? 0;
  const dTo   = yearTo   ?? 9999;
  return (v.year_from ?? 0) <= dTo && (v.year_to ?? 9999) >= dFrom;
}

// ── Range expansion helper: "VB-VS" → ['VB','VC','VH','VK','VL','VN','VP','VR','VS'] ──
function expandSeriesRange(make, rawText) {
  const seriesMap  = SERIES_MODEL_MAP[make];
  const seriesOrder = SERIES_ORDER[make];
  if (!seriesMap || !seriesOrder) return null;

  // Match "CODE–CODE" or "CODE-CODE" (range notation between two known series codes)
  const m = rawText.match(/\b([A-Z]{1,4})\s*[-–]\s*([A-Z]{1,4})\b/i);
  if (!m) return null;

  const fromCode = m[1].toUpperCase();
  const toCode   = m[2].toUpperCase();
  if (!seriesMap[fromCode] || !seriesMap[toCode]) return null;

  const modelName = seriesMap[fromCode];
  if (seriesMap[toCode] !== modelName) return null;

  const order    = seriesOrder[modelName];
  if (!order) return null;

  const fromIdx = order.indexOf(fromCode);
  const toIdx   = order.indexOf(toCode);
  if (fromIdx < 0 || toIdx < 0 || fromIdx > toIdx) return null;

  return { modelName, codes: order.slice(fromIdx, toIdx + 1) };
}

// ── Multi-strategy vehicle resolver ───────────────────────────────────────────
// Returns all matching vehicle records. Never creates vehicles.
// Strategies run in order; first non-empty result wins.
function resolveVehicles(make, rawText, existing, yearFrom, yearTo) {
  // Strip DBA qualifier prefixes like "Inc " (meaning "including this variant")
  // e.g. "Inc UTE" → "UTE" for keyword matching
  const stripped = rawText.replace(/^\s*Inc\s+/i, '').trim();
  if (stripped !== rawText.trim()) {
    const via = resolveVehicles(make, stripped, existing, yearFrom, yearTo);
    if (via.length) return via;
  }

  const normText = rawText.trim().toUpperCase();
  const deduped  = new Set();
  const uniq     = v => { if (deduped.has(v.id)) return false; deduped.add(v.id); return true; };

  // Strategy 1: Direct case-insensitive model name match
  const direct = existing.filter(v =>
    v.model.trim().toUpperCase() === normText && yearOverlap(v, yearFrom, yearTo)
  );
  if (direct.length) return direct;

  // Strategy 2a: Range expansion ("VB-VS Commodore" → expand each code in range)
  const range = expandSeriesRange(make, rawText);
  if (range) {
    const matched = [];
    for (const code of range.codes) {
      const codeUp = code.toUpperCase();
      existing.filter(v =>
        v.model === range.modelName &&
        (!v.series || v.series.toUpperCase().replace(/\s+/g, ' ').trim() === codeUp) &&
        yearOverlap(v, yearFrom, yearTo)
      ).filter(uniq).forEach(v => matched.push(v));
    }
    if (matched.length) return matched;
  }

  // Strategy 2b: Series code extraction (each known code tested independently)
  const seriesMap     = SERIES_MODEL_MAP[make];
  const successorMap  = SERIES_SUCCESSOR[make];
  if (seriesMap) {
    const matched = [];
    for (const [code, modelName] of Object.entries(seriesMap)) {
      const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      if (!new RegExp(`\\b${esc}\\b`, 'i').test(rawText)) continue;
      const codeUp = code.toUpperCase().replace(/\s+/g, ' ').trim();
      existing.filter(v =>
        v.model === modelName &&
        (!v.series || v.series.toUpperCase().replace(/\s+/g, ' ').trim() === codeUp) &&
        yearOverlap(v, yearFrom, yearTo)
      ).filter(uniq).forEach(v => matched.push(v));

      // Successor model: same brake spec carries over (e.g. R9 Rodeo → Colorado)
      const successorModel = successorMap?.[code];
      if (successorModel) {
        existing.filter(v =>
          v.model === successorModel && yearOverlap(v, yearFrom, yearTo)
        ).filter(uniq).forEach(v => matched.push(v));
      }
    }
    if (matched.length) return matched;
  }

  // Strategy 3: Compound text split ("/" and "&") — e.g. "Rodeo / Colorado"
  const segments = rawText.split(/\s*[\/&]\s*/).map(s => s.trim()).filter(Boolean);
  if (segments.length > 1) {
    const matched = [];
    for (const seg of segments) {
      // First try direct model name
      existing.filter(v =>
        v.model.trim().toUpperCase() === seg.toUpperCase() &&
        yearOverlap(v, yearFrom, yearTo)
      ).filter(uniq).forEach(v => matched.push(v));
      // Then try recursive resolve on each segment
      if (!matched.length) {
        resolveVehicles(make, seg, existing, yearFrom, yearTo).filter(uniq).forEach(v => matched.push(v));
      }
    }
    if (matched.length) return matched;
  }

  // Strategy 4a: Alias map ("One Tonner" → "Ute", "4WD Rodeo" → "Rodeo", etc.)
  const aliasMap = ALIAS_MAP[make];
  if (aliasMap) {
    for (const [alias, modelName] of Object.entries(aliasMap)) {
      if (!modelName) continue; // null means "handled by series" — skip
      if (!new RegExp(`\\b${alias.replace(/[-]/g, '[-]')}\\b`, 'i').test(rawText)) continue;
      const matched = existing.filter(v =>
        v.model === modelName && yearOverlap(v, yearFrom, yearTo)
      );
      if (matched.length) return matched.filter(uniq);
    }
  }

  // Strategy 4b: Embedded keyword lookup
  const kwMap = KEYWORD_MODEL_MAP[make];
  if (kwMap) {
    const matched = [];
    for (const [kw, modelName] of Object.entries(kwMap)) {
      if (!new RegExp(`\\b${kw}\\b`, 'i').test(rawText)) continue;
      existing.filter(v =>
        v.model === modelName && yearOverlap(v, yearFrom, yearTo)
      ).filter(uniq).forEach(v => matched.push(v));
    }
    if (matched.length) return matched;
  }

  return []; // No match — reported for manual review
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORT DBA 2020 CATALOGUE ===');
  if (MAKE_ARG) console.log(`Make filter: "${MAKE_ARG}"`);

  // Load + parse CSV
  console.log(`\nReading ${CSV_PATH}`);
  const allRows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'))
    .filter(r => r.record_type === 'application');
  console.log(`Application rows in CSV: ${allRows.length}`);

  // Apply make filter
  const rows = MAKE_ARG
    ? allRows.filter(r => normMake(r.make).toLowerCase().includes(MAKE_ARG.toLowerCase()))
    : allRows;
  console.log(`Rows after filter: ${rows.length}`);

  // ── 1. Collect all parts ──────────────────────────────────────────────────
  const partMap = new Map(); // derivedPartNumber -> part object

  for (const row of rows) {
    const base = row.part_no?.trim();
    if (!base || base.toUpperCase() === 'TBA') continue;

    const pos  = row.fr === 'F' ? 'Front' : 'Rear';
    const desc = dimStr(row);

    for (const s of SERIES) {
      const status = row[s.col]?.trim();
      if (!status) continue; // blank = not available in this series

      const pn      = derivePn(base, s);
      const isSpecO = status === 'special_order_item';

      if (!partMap.has(pn)) {
        partMap.set(pn, {
          brand:       'DBA',
          part_number: pn,
          name:        `${s.label} ${pos}${isSpecO ? ' (Special Order)' : ''}`,
          description: desc,
          category:    'Brake Rotor',
          category_id: CATEGORY_ID,
        });
      }
    }
  }

  console.log(`\nUnique parts to upsert: ${partMap.size}`);

  // ── 2. Upsert parts ───────────────────────────────────────────────────────
  const partRows  = [...partMap.values()];
  const partIdMap = {}; // part_number -> DB id

  if (!DRY_RUN) {
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < partRows.length; i += BATCH) {
      const chunk    = partRows.slice(i, i + BATCH);
      const upserted = await api('/parts?on_conflict=brand,part_number', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=merge-duplicates,return=representation' },
        body:    JSON.stringify(chunk),
      });
      for (const p of upserted) partIdMap[p.part_number] = p.id;
      done += upserted.length;
      process.stdout.write(`\r  Parts: ${done}/${partRows.length}`);
    }
    console.log();
  } else {
    console.log('  (dry run) sample parts:');
    partRows.slice(0, 8).forEach(p => console.log(`    ${p.part_number}  ${p.name}`));
    if (partRows.length > 8) console.log(`    ... +${partRows.length - 8} more`);
    partRows.forEach(p => { partIdMap[p.part_number] = `(${p.part_number})`; });
  }

  // ── 3. Load existing vehicles per make (read-only — never created here) ──
  // Key: normalised make → array of vehicle records
  const makeExisting = new Map(); // make -> vehicle[]

  const allMakes = [...new Set(rows.map(r => normMake(r.make)))];
  for (const make of allMakes) {
    const enc      = encodeURIComponent(make);
    const existing = await apiGetAll(`/vehicles?make=eq.${enc}&select=id,model,series,year_from,year_to`);
    makeExisting.set(make, existing);
    if (DRY_RUN) console.log(`  ${make}: ${existing.length} vehicles in DB`);
  }

  // ── 4. Match each CSV row to existing vehicles ────────────────────────────
  // rowVehicleIds: rowIndex -> vehicle id[]  (may be multiple matches)
  const rowVehicleIds = new Map();
  const unmatched     = new Map(); // "make|model|years" -> count

  for (let idx = 0; idx < rows.length; idx++) {
    const row  = rows[idx];
    const base = row.part_no?.trim();
    if (!base || base.toUpperCase() === 'TBA') continue;

    const make = normMake(row.make);

    // Derive the model name — prefer heading when it's a real model name (not just the make)
    let model = (row.heading ?? '').trim();
    const rawMakeKey = row.make.trim().toUpperCase().replace(/[\s\-]+/g, '');
    if (!model || model.toUpperCase().replace(/[\s\-]+/g, '') === rawMakeKey) {
      model = (row.model_text ?? '').trim() || (row.group_model_text ?? '').trim() || model;
    }

    // Extract chassis qualifiers ("From Chassis BB000001", "To Chassis AB999999") —
    // these are fitment conditions, NOT part of the vehicle name.
    // Strip them from model text and store for chassis_restriction on the fitment.
    const CHASSIS_RE = /(?:From|To)\s+Chassis\s+\S+/gi;
    const chassisQuals = model.match(CHASSIS_RE);
    let chassisRestriction = null;
    if (chassisQuals) {
      chassisRestriction = chassisQuals.join('; ');
      model = model.replace(CHASSIS_RE, '').trim();
      // If nothing meaningful is left, fall back to group_model_text (also stripped)
      if (!model) {
        model = ((row.group_model_text ?? '').replace(CHASSIS_RE, '').trim()) ||
                ((row.band_model_text  ?? '').replace(CHASSIS_RE, '').trim());
      }
    }

    const { year_from = null, year_to = null } = parseYears(row.years);

    const existing = makeExisting.get(make) ?? [];
    let matches = resolveVehicles(make, model, existing, year_from, year_to);

    // Fallback: when the heading is a DBA product category (e.g. "COMBO") rather than
    // a vehicle model name, primary resolve may fail — retry with model_text/group_model_text.
    if (!matches.length) {
      const candidates = [
        row.model_text,
        row.group_model_text,
        row.band_model_text,
      ].map(s => (s ?? '').replace(CHASSIS_RE, '').trim()).filter(s => s && s !== model);
      for (const cand of candidates) {
        matches = resolveVehicles(make, cand, existing, year_from, year_to);
        if (matches.length) break;
      }
    }

    if (matches.length) {
      rowVehicleIds.set(idx, { ids: matches.map(v => v.id), chassisRestriction });
    } else {
      const k = `${make} | ${model} | ${row.years}`;
      unmatched.set(k, (unmatched.get(k) ?? 0) + 1);
    }
  }

  // ── 5. Build fitments ─────────────────────────────────────────────────────
  const fitments = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row  = rows[idx];
    const base = row.part_no?.trim();
    if (!base || base.toUpperCase() === 'TBA') continue;

    const entry = rowVehicleIds.get(idx);
    if (!entry?.ids?.length) continue;

    const { ids: vehicleIds, chassisRestriction } = entry;
    const pos = row.fr === 'F' ? 'Front' : 'Rear';

    for (const s of SERIES) {
      const status = row[s.col]?.trim();
      if (!status) continue;

      const pn     = derivePn(base, s);
      const partId = partIdMap[pn];
      if (!partId) continue;

      for (const vehicleId of vehicleIds) {
        fitments.push({
          vehicle_id:          vehicleId,
          part_id:             partId,
          position:            pos,
          qty:                 1,
          chassis_restriction: chassisRestriction ?? null,
        });
      }
    }
  }

  // Report unmatched rows
  if (unmatched.size) {
    console.log(`\nNo vehicle match found for ${unmatched.size} unique application(s) — add to vehicle master data if needed:`);
    for (const [k, n] of unmatched) console.log(`  [${n}x]  ${k}`);
  }
  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    // Fetch existing fitments for our parts (in chunks to avoid huge URLs)
    const allPartIds = [...new Set(
      fitments.map(f => f.part_id).filter(id => typeof id === 'number')
    )];
    const existFit = [];
    const PCHUNK   = 100;
    for (let i = 0; i < allPartIds.length; i += PCHUNK) {
      const ids   = allPartIds.slice(i, i + PCHUNK);
      const batch = await api(
        `/vehicle_part_fitments?part_id=in.(${ids.join(',')})&select=vehicle_id,part_id,position,chassis_restriction`
      );
      existFit.push(...batch);
    }

    const existSet = new Set(existFit.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}|${f.chassis_restriction ?? ''}`));
    const newFit   = fitments.filter(f => !existSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}|${f.chassis_restriction ?? ''}`));
    console.log(`New fitments (after dedup): ${newFit.length}`);

    const BATCH = 500;
    let done    = 0;
    for (let i = 0; i < newFit.length; i += BATCH) {
      await api('/vehicle_part_fitments', {
        method:  'POST',
        headers: { ...HDRS, Prefer: 'resolution=ignore-duplicates' },
        body:    JSON.stringify(newFit.slice(i, i + BATCH)),
      });
      done += Math.min(BATCH, newFit.length - i);
      process.stdout.write(`\r  Fitments: ${done}/${newFit.length}`);
    }
    console.log();
  } else if (DRY_RUN) {
    console.log('  (dry run) fitments not inserted');
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
