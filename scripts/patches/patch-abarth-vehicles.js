#!/usr/bin/env node
// Patch Abarth vehicle rows — fix junk model names, wrong engine codes,
// wrong year ranges, missing fields, and bad fuel types.
// Usage: node scripts/patches/patch-abarth-vehicles.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
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

// ─── Patches ─────────────────────────────────────────────────────────────────
// Each entry: { id, description, patch }
// All engine codes for the 1.4T MultiAir family = "312A1"
// kW sources: 595 base = 107kW (145hp), Competizione = 121kW (165hp),
//             695 = 132kW (180hp), 124 Spider = 125kW (170hp),
//             500e = 114kW (electric), pre-2016 595/695 Turismo = 118kW (160hp)

const PATCHES = [

  // ── b1463fbd ──────────────────────────────────────────────────────────────
  // model was "1.4L x 103kW TURBO" — engine spec text in the model field.
  // month_from=4 and year_from=2016 match the 595 312 refresh. Since we
  // already have a proper 595/312 row (8fa7e91f), make this one the
  // 595 Competizione 312 (121kW) which was otherwise missing.
  {
    id: 'b1463fbd-a313-4290-b0c8-153ea20a42ff',
    description: 'Fix junk model "1.4L x 103kW TURBO" → 595 Competizione 312 (121kW)',
    patch: {
      model:          '595',
      series:         '312',
      year_from:      2016,
      year_to:        null,
      month_from:     4,
      month_to:       null,
      engine_code:    '312A1',
      engine_litres:  1.4,
      engine_kw:      121,
      engine_config:  'I4',
      fuel_type:      'ULP',
      chassis:        'Hatchback',
      notes:          'Competizione',
    },
  },

  // ── 140f7d6a ──────────────────────────────────────────────────────────────
  // model was "595 & 595C 312" — two models combined. Since we have a
  // proper 595C/312 row (d55058f6), make this the 595C Competizione 312.
  {
    id: '140f7d6a-c6fa-484f-b092-79ca6680a48f',
    description: 'Fix junk model "595 & 595C 312" → 595C Competizione 312 (121kW)',
    patch: {
      model:          '595C',
      series:         '312',
      year_from:      2016,
      year_to:        null,
      month_from:     4,
      month_to:       null,
      engine_code:    '312A1',
      engine_litres:  1.4,
      engine_kw:      121,
      engine_config:  'I4',
      fuel_type:      'ULP',
      chassis:        'Convertible',
      notes:          'Competizione',
    },
  },

  // ── fbc7bedb ──────────────────────────────────────────────────────────────
  // model="124" series="Spider" — Spider is the model name, not series.
  // fuel_type="Turbo Petrol" is non-standard; use "ULP".
  // year_to missing — 124 Spider was discontinued ~2020 in AU.
  {
    id: 'fbc7bedb-c17b-430a-8f2d-14b489b4b620',
    description: 'Fix 124/Spider → model="124 Spider", series=null, fuel_type=ULP, year_to=2020',
    patch: {
      model:         '124 Spider',
      series:        null,
      year_to:       2020,
      fuel_type:     'ULP',
    },
  },

  // ── c28a6ebd ──────────────────────────────────────────────────────────────
  // model="124" series=null, engine_code="1.4" (not a real code), engine_config null.
  {
    id: 'c28a6ebd-479f-4566-92e0-d346f044c0ef',
    description: 'Fix 124 → model="124 Spider", engine_code=312A1, engine_config=I4',
    patch: {
      model:          '124 Spider',
      series:         null,
      engine_code:    '312A1',
      engine_config:  'I4',
    },
  },

  // ── d582fc37 ──────────────────────────────────────────────────────────────
  // model="500C / 595C / 695C" 2013–2020 132kW — three models in one field.
  // 132kW = 180hp = 695 territory. Make this the 695C (convertible, top-spec).
  {
    id: 'd582fc37-522b-4ce0-842e-04a9bd7fd20e',
    description: 'Fix "500C / 595C / 695C" 132kW → model=695C, engine_code=312A1, engine_config=I4',
    patch: {
      model:          '695C',
      series:         null,
      engine_code:    '312A1',
      engine_config:  'I4',
    },
  },

  // ── 1a47c158 ──────────────────────────────────────────────────────────────
  // model="500C / 595C / 695C" 2014–2016 118kW — three models in one field.
  // 118kW = 160hp = pre-2016 595C Turismo level.
  {
    id: '1a47c158-f6b2-4733-8b71-6f7344d17926',
    description: 'Fix "500C / 595C / 695C" 118kW → model=595C, engine_code=312A1, engine_config=I4',
    patch: {
      model:          '595C',
      series:         null,
      engine_code:    '312A1',
      engine_config:  'I4',
    },
  },

  // ── 95971308 ──────────────────────────────────────────────────────────────
  // model="500e" year_from=2008 year_to=2011 — completely wrong. The Abarth
  // 500e (electric) launched in Australia in 2024. 2008–2011 was the petrol
  // Abarth 500, not the 500e. Fix years; engine_code="" and chassis="" → null.
  {
    id: '95971308-bd14-4209-9f4a-219d927bc522',
    description: 'Fix 500e years 2008–2011 → 2024–present; clear empty string fields; set engine_kw=114',
    patch: {
      year_from:      2024,
      year_to:        null,
      month_from:     null,
      engine_code:    null,
      engine_kw:      114,
      chassis:        'Hatchback',
    },
  },

  // ── 0e661e3f ──────────────────────────────────────────────────────────────
  // model="595" 2008–2016, engine_code="1.4", engine_kw=99, engine_config=null.
  // The modern Abarth 595 (branding) started ~2012 in AU; 99kW is the Abarth
  // 500 (not 595). The pre-2016 AU 595 was 118kW (160hp Turismo spec).
  {
    id: '0e661e3f-c933-40a1-ae0f-caea86973150',
    description: 'Fix 595 2008–2016 → year_from=2012, engine_code=312A1, engine_kw=118, engine_config=I4',
    patch: {
      year_from:      2012,
      engine_code:    '312A1',
      engine_kw:      118,
      engine_config:  'I4',
    },
  },

  // ── 8fa7e91f ──────────────────────────────────────────────────────────────
  // model="595" series="312" 2016-on. engine_code=null, engine_kw=103 (wrong,
  // should be 107 = 145hp), month_from missing, notes contains engine data
  // that belongs in the engine columns.
  {
    id: '8fa7e91f-9670-41e4-9634-f72c13b0f30b',
    description: 'Fix 595/312: engine_code=312A1, engine_kw=103→107, month_from=4, clear notes',
    patch: {
      engine_code:    '312A1',
      engine_kw:      107,
      month_from:     4,
      notes:          null,
    },
  },

  // ── d55058f6 ──────────────────────────────────────────────────────────────
  // model="595C" series="312" 2016-on. Same issues as 8fa7e91f above.
  {
    id: 'd55058f6-f5ed-4e55-bd57-373b8d0e67ce',
    description: 'Fix 595C/312: engine_code=312A1, engine_kw=103→107, month_from=4, clear notes',
    patch: {
      engine_code:    '312A1',
      engine_kw:      107,
      month_from:     4,
      notes:          null,
    },
  },

  // ── f455c376 ──────────────────────────────────────────────────────────────
  // model="695" 2011–2016, engine_code="1.4", engine_config=null.
  {
    id: 'f455c376-b016-4f05-986a-9e74ff9c010d',
    description: 'Fix 695: engine_code=312A1, engine_config=I4',
    patch: {
      engine_code:    '312A1',
      engine_config:  'I4',
    },
  },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — no changes written ===' : '=== PATCH ABARTH VEHICLES ===');
  console.log(`Patches to apply: ${PATCHES.length}\n`);

  let ok = 0;
  for (const { id, description, patch } of PATCHES) {
    console.log(`  [${id.slice(0,8)}] ${description}`);
    if (DRY_RUN) {
      console.log(`    Would PATCH:`, JSON.stringify(patch));
    } else {
      await api(`/vehicles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...hdrs, Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      console.log(`    ✓ Done`);
      ok++;
    }
  }

  console.log(`\n${DRY_RUN ? 'Dry-run complete.' : `Applied ${ok} patches.`}`);

  // ── Print final state ─────────────────────────────────────────────────────
  if (!DRY_RUN) {
    console.log('\n--- Final Abarth vehicle state ---');
    const rows = await api('/vehicles?make=eq.Abarth&select=id,model,series,year_from,year_to,month_from,engine_code,engine_kw,engine_config,fuel_type,chassis,notes&order=model,year_from');
    for (const v of rows) {
      const yr = `${v.month_from ? String(v.month_from).padStart(2,'0')+'/' : ''}${v.year_from}–${v.year_to ?? 'on'}`;
      console.log(`  ${v.model.padEnd(18)} ${(v.series??'').padEnd(6)} ${yr.padEnd(14)} ${String(v.engine_kw??'?')+'kW'} ${v.engine_code??'?'} [${v.fuel_type??'?'}] ${v.chassis??''} ${v.notes??''}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
