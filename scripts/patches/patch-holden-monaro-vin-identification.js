#!/usr/bin/env node
// Patch VIN / chassis identification data into existing HK/HT/HG/HQ/HJ/HX/HZ vehicle records
// Usage: node scripts/patch-holden-monaro-vin-identification.js [--dry-run]
//
// Sources: HK, HT, HG, HQ (×2), HJ, HX, HZ Holden Monaro Identification tables.
// Data is stored in specs.vin_identification for display on the vehicle specs page.
//
// Engine ID letters (HQ onwards) map to engine prefixes stamped on the block:
//   E=QE, D=QD, L=QL 202 LC, M=QM 202 HC, S=QS, R=QR, T=QT, U=QU (350)
// Note: VIN table shows QL=202 LC and QM=202 HC (opposite of some secondary sources).
//
// PATCH strategy: GET current specs → merge vin_identification → PATCH full specs object.

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, options = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Shared plant tables ──────────────────────────────────────────────────────
const PLANTS_HK_TO_HQ_EARLY = {
  'H1–H4': 'Brisbane', 'H5–H9': 'Sydney',
  'J1–J9': 'Melbourne', 'L1–L5': 'Adelaide', 'L6–L9': 'Perth',
};
const PLANTS_HQ_LATE_ONWARDS = {
  'H1–H4': 'Brisbane', 'H5–H9': 'Sydney',
  'J1–J9': 'Dandenong', 'L1–L5': 'Adelaide',
};

// ── VIN identification definitions per model ─────────────────────────────────
// series_vin_data[model] → object used to build vin_identification for each record.
// engine_id_by_code maps engine_code → { engine_id_letter, vin_engine_prefix }

const SERIES_VIN = {

  HK: {
    series_code: 'K',
    engine_number_location: 'Right front near cylinder bank',
    body_codes: {
      '80337': 'Monaro Coupe',
      '80437': 'Monaro Coupe',
      '80737': 'Monaro GTS Coupe',
      '81837': 'Monaro GTS 350 Coupe',
    },
    assembly_plants: PLANTS_HK_TO_HQ_EARLY,
    // Engine-specific: only the 327 V8 has an engine number listed
    engine_numbers_by_code: { '327': '327' },
  },

  HT: {
    series_code: 'T',
    engine_number_location: 'Right front near cylinder bank',
    body_codes: {
      '80337': 'Monaro Coupe',
      '80437': 'Monaro Coupe',
      '80737': 'Monaro GTS Coupe (L6)',
      '80837': 'Monaro GTS Coupe (V8)',
      '81837': 'Monaro GTS 350 Coupe',
    },
    assembly_plants: PLANTS_HK_TO_HQ_EARLY,
    // 350 has both auto (350A) and manual (350M) engine number suffixes
    engine_numbers_by_code: { '350': { auto: '350A', manual: '350M' } },
  },

  HG: {
    series_code: 'G',
    engine_number_location: 'Stamped on pad at front of right hand cylinder bank (with prefix)',
    body_codes: {
      '80337': 'Monaro Coupe',
      '80437': 'Monaro Coupe',
      '80837': 'Monaro GTS Coupe',
      '81837': 'Monaro GTS 350 Coupe',
    },
    assembly_plants: PLANTS_HK_TO_HQ_EARLY,
    engine_numbers_by_code: { '350': { auto: '350A', manual: '350M' } },
  },

  HQ: {
    series_code: 'Q',
    engine_number_location: 'Stamped on pad at front of right hand cylinder bank (with prefix)',
    // Early system (to August 1972) — chassis plate on right hand side of firewall
    body_codes_early: {
      '80337': 'Monaro Coupe',
      '80437': 'Monaro Coupe',
      '80837': 'Monaro GTS Coupe',
      '81837': 'Monaro GTS 350 Coupe',
    },
    // Late system (from October 1972) — model numbers on plate right hand side of firewall
    body_codes: {
      '8P37':  'Monaro LS Coupe',
      '8Q69':  'Monaro GTS Sedan',
      '8Q37':  'Monaro GTS Coupe',
    },
    model_year_codes: { 'B': 1972, 'C': 1973, 'D': 1974 },
    assembly_plants: PLANTS_HQ_LATE_ONWARDS,
    // Engine ID letters (from October 1972 VIN system)
    // Source: HQ identification table — E=QE 173 LC, D=QD 173 HC,
    //   L=QL 202 LC, M=QM 202 HC, S=QS 253 LC, R=QR 253 HC, T=QT 308 HC, U=QU 350
    engine_id_by_code: {
      '173 LC': { engine_id_letter: 'E', vin_engine_prefix: 'QE' },
      '173':    { engine_id_letter: 'D', vin_engine_prefix: 'QD' },
      '202 LC': { engine_id_letter: 'L', vin_engine_prefix: 'QL' },
      '202':    { engine_id_letter: 'M', vin_engine_prefix: 'QM' },
      '253 LC': { engine_id_letter: 'S', vin_engine_prefix: 'QS' },
      '253':    { engine_id_letter: 'R', vin_engine_prefix: 'QR' },
      '308':    { engine_id_letter: 'T', vin_engine_prefix: 'QT' },
      '350':    { engine_id_letter: 'U', vin_engine_prefix: 'QU' },
    },
  },

  HJ: {
    // No separate series code listed; VIN serial ends in 'J' to identify HJ
    vin_serial_suffix: 'J',
    engine_number_location: 'L6: right side of engine block; V8: top left side of block',
    body_codes: {
      '8P37': 'Monaro LS Coupe',
      '8Q69': 'Monaro GTS Sedan',
      '8Q37': 'Monaro GTS Coupe',
    },
    model_year_codes: { 'D': 1974, 'E': 1975, 'F': 1976 },
    assembly_plants: PLANTS_HQ_LATE_ONWARDS,
    // 173 not listed in HJ Monaro VIN table (Monaro used 202+ only)
    engine_id_by_code: {
      '202 LC': { engine_id_letter: 'L', vin_engine_prefix: 'QL' },
      '202':    { engine_id_letter: 'M', vin_engine_prefix: 'QM' },
      '253 LC': { engine_id_letter: 'S', vin_engine_prefix: 'QS' },
      '253':    { engine_id_letter: 'R', vin_engine_prefix: 'QR' },
      '308':    { engine_id_letter: 'T', vin_engine_prefix: 'QT' },
    },
  },

  HX: {
    vin_serial_suffix: 'X',
    engine_number_location: 'V8: top left side of block',
    body_codes: {
      '8Q69': 'Monaro GTS Sedan',
      '8Q37': 'Monaro GTS Coupe',
    },
    model_year_codes: { 'F': 1976, 'G': 1977 },
    assembly_plants: PLANTS_HQ_LATE_ONWARDS,
    engine_id_by_code: {
      '253': { engine_id_letter: 'R', vin_engine_prefix: 'QR' },
      '308': { engine_id_letter: 'T', vin_engine_prefix: 'QT' },
    },
  },

  HZ: {
    vin_serial_suffix: 'Z',
    engine_number_location: 'V8: top left side of block',
    body_codes: {
      '8Q69': 'Monaro GTS Sedan',
    },
    model_year_codes: { 'G': 1977, 'H': 1978, 'J': 1979 },
    assembly_plants: PLANTS_HQ_LATE_ONWARDS,
    engine_id_by_code: {
      '253': { engine_id_letter: 'R', vin_engine_prefix: 'QR' },
      '308': { engine_id_letter: 'T', vin_engine_prefix: 'QT' },
    },
  },

};

async function patchModel(model) {
  const vinDef = SERIES_VIN[model];
  const records = await api(`/vehicles?make=eq.Holden&model=eq.${model}&select=id,engine_code,engine_kw,specs`);
  console.log(`\n${model}: ${records.length} records`);

  for (const rec of records) {
    const engineCode = rec.engine_code ?? '';

    // Build vin_identification for this record
    const vinId = {};
    if (vinDef.series_code)       vinId.series_code = vinDef.series_code;
    if (vinDef.vin_serial_suffix) vinId.vin_serial_suffix = vinDef.vin_serial_suffix;
    if (vinDef.engine_number_location) vinId.engine_number_location = vinDef.engine_number_location;
    if (vinDef.body_codes_early)  vinId.body_codes_early = vinDef.body_codes_early;
    if (vinDef.body_codes)        vinId.body_codes = vinDef.body_codes;
    if (vinDef.model_year_codes)  vinId.model_year_codes = vinDef.model_year_codes;
    if (vinDef.assembly_plants)   vinId.assembly_plants = vinDef.assembly_plants;

    // Engine-specific: engine_number
    if (vinDef.engine_numbers_by_code?.[engineCode]) {
      vinId.engine_number = vinDef.engine_numbers_by_code[engineCode];
    }

    // Engine-specific: engine_id_letter + vin_engine_prefix
    if (vinDef.engine_id_by_code?.[engineCode]) {
      Object.assign(vinId, vinDef.engine_id_by_code[engineCode]);
    }

    const currentSpecs = rec.specs ?? {};
    const mergedSpecs  = { ...currentSpecs, vin_identification: vinId };

    if (DRY_RUN) {
      console.log(`  ${rec.id}  ${model} ${engineCode} ${rec.engine_kw}kW → vin_id letter: ${vinId.engine_id_letter ?? '(none)'}`);
      continue;
    }

    await api(`/vehicles?id=eq.${rec.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ specs: mergedSpecs }),
    });
    console.log(`  ✓ ${rec.id}  ${model} ${engineCode} ${rec.engine_kw}kW`);
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH VIN IDENTIFICATION ===');
  for (const model of ['HK', 'HT', 'HG', 'HQ', 'HJ', 'HX', 'HZ']) {
    await patchModel(model);
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
