#!/usr/bin/env node
// Insert Holden Torana vehicle records
// Usage: node scripts/insert-holden-torana.js [--dry-run]
// Supports: LC (1969-1972), LJ (1972-1975), LH (1974-1976), LX (1976-1978), UC (1978-1980)

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function splitByTrimCode(rows) {
  return [rows.filter(v => !v.trim_code), rows.filter(v => v.trim_code)];
}

async function insertBatch(rows) {
  if (rows.length === 0) return [];
  const r = await api('/vehicles', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!Array.isArray(r)) throw new Error('Unexpected response: ' + JSON.stringify(r));
  return r;
}

// ─── Vehicle data ────────────────────────────────────────────────────────────

const vehicles = [

  // ── Torana LC (1969–1972) — 74,627 built (incl. 1,633 XU-1) ─────────────
  // Four-cylinder models: Opel-derived engines; shorter wheelbase (2433mm vs 2540mm)
  // Six-cylinder models: Holden 138ci and 161ci engines; longer wheelbase
  // GTR: 161S engine (twin-barrel); GTR XU-1: 186ci triple-carb race engine

  // 71ci 1200 (base) — Opel 1159cc, 41.9kW
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1200 LC', engine_litres: 1.159, engine_config: 'I4',
    engine_kw: 42, fuel_type: 'ULP',
    notes: 'Torana base; 2- and 4-door; wheelbase 2433mm',
    specs: {
      engine_description: '71ci 1159cc OHV I4 (8.5:1) — Opel-derived',
      torque_nm: 90,
      compression: '8.5:1',
      bore_stroke_mm: '77.7 x 61.0',
      power_rpm: 5400,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana', 'Torana S', 'Torana DeLuxe'],
      num_built: 74627,
    },
  },
  // Series 70 1200 — higher compression 9.0:1, 51.4kW
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1200 S70', engine_litres: 1.159, engine_config: 'I4',
    engine_kw: 51, fuel_type: 'ULP',
    notes: 'Torana Series 70; 2- and 4-door; wheelbase 2433mm',
    specs: {
      engine_description: '71ci 1159cc OHV I4 Series 70 (9.0:1) — Opel-derived',
      torque_nm: 93,
      compression: '9.0:1',
      bore_stroke_mm: '77.7 x 60.9',
      power_rpm: 5800,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  // 1600 4-cylinder — Opel 1599cc, 59.7kW
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '1600', engine_litres: 1.599, engine_config: 'I4',
    engine_kw: 60, fuel_type: 'ULP',
    notes: 'Torana 1600; 2- and 4-door; wheelbase 2433mm',
    specs: {
      engine_description: '97.5ci 1599cc OHV I4 (9.0:1) — Opel-derived',
      torque_nm: 130,
      compression: '9.0:1',
      bore_stroke_mm: '85.7 x 66.8',
      power_rpm: 5500,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana SL 1600', 'Torana 1600 DeLuxe'],
    },
  },
  // 138ci 6-cylinder — 2250cc, 70.9kW; longer wheelbase (2540mm)
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '138', engine_litres: 2.250, engine_config: 'I6',
    engine_kw: 71, fuel_type: 'ULP',
    notes: 'Torana S / SL 6-cylinder; wheelbase 2540mm',
    specs: {
      engine_description: '138ci 2250cc OHV I6 (9.2:1)',
      torque_nm: 162,
      compression: '9.2:1',
      bore_stroke_mm: '79.4 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  // 161ci 6-cylinder — 2640cc, 85kW
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 85, fuel_type: 'ULP',
    notes: 'Torana S / SL 6-cylinder; wheelbase 2540mm',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.2:1)',
      torque_nm: 212,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  // 161S 6-cylinder (GTR) — twin-barrel, 93.2kW
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1969, year_to: 1972,
    engine_code: '161S', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 93, fuel_type: 'ULP',
    notes: 'Torana GTR; 2-door only; front disc brakes standard; LSD optional',
    specs: {
      engine_description: '161S 2640cc OHV I6 twin-barrel (9.2:1)',
      torque_nm: 203,
      compression: '9.2:1',
      bore_stroke_mm: '85.7 x 76.2',
      power_rpm: 4800,
      fuel_system: 'Two-barrel Bendix-Stromberg downdraft carburettor',
      grades: ['GTR'],
    },
  },
  // 186ci XU-1 — triple Stromberg sidedraught, 119kW; from June 1971
  {
    make: 'Holden', model: 'Torana', series: 'LC',
    year_from: 1971, year_to: 1972,
    engine_code: '186 XU-1', engine_litres: 3.050, engine_config: 'I6',
    engine_kw: 119, fuel_type: 'ULP',
    trim_code: 'GTR XU-1',
    notes: 'GTR XU-1; triple Stromberg sidedraught; high-perf camshaft; LSD standard; 1,633 built',
    specs: {
      engine_description: '186ci 3050cc OHV I6 XU-1 triple sidedraught (10.05:1)',
      torque_nm: 257,
      compression: '10.05:1',
      bore_stroke_mm: '92.1 x 76.2',
      power_rpm: 5200,
      fuel_system: 'Triple 1.5-inch 150 CDS Stromberg sidedraught carburettors',
      exhaust: 'Twin manifolds, 2-inch system and sports muffler',
      camshaft: 'High performance; longer duration higher lift for Bathurst model',
      head: '161 head with enlarged inlet/exhaust valves and V8 valve springs',
      num_built_xu1: 1633,
      grades: ['GTR XU-1'],
    },
  },

  // ── Torana LJ (1972–1974, TA to 1975) — 81,453 built (1,667 XU-1) ──────────
  // Same body as LC, new HQ-style grille. Added 1300 and 202 engines.
  // 161 upgraded to 88kW/9.4:1 (vs LC's 85kW/9.2:1). 202 introduced Feb 1973.
  // XU-1 upgraded from 186ci to 202ci with triple Stromberg sidedraught.

  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '1200', engine_litres: 1.159, engine_config: 'I4',
    engine_kw: 42, fuel_type: 'ULP',
    notes: 'Torana base; wheelbase 2433mm',
    specs: {
      engine_description: '71ci 1159cc OHV I4 (8.5:1) — Opel-derived',
      torque_nm: 90,
      compression: '8.5:1',
      bore_stroke_mm: '77.7 x 61.0',
      power_rpm: 5400,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana', 'Torana S', 'Torana DeLuxe'],
      num_built: 81453,
    },
  },
  // 1300 — Opel ~1254cc (spec sheet erroneously lists 1159cc; correct per bore 80.9×61mm)
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '1300', engine_litres: 1.254, engine_config: 'I4',
    engine_kw: 47, fuel_type: 'ULP',
    notes: 'Torana 1300 DeLuxe; wheelbase 2433mm',
    specs: {
      engine_description: '1254cc OHV I4 (8.5:1) — Opel-derived; spec sheet lists 1159cc (error)',
      torque_nm: 96,
      compression: '8.5:1',
      bore_stroke_mm: '80.9 x 61.0',
      power_rpm: 5400,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana S', 'Torana DeLuxe'],
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '1600', engine_litres: 1.599, engine_config: 'I4',
    engine_kw: 60, fuel_type: 'ULP',
    notes: 'Torana 1600; wheelbase 2433mm',
    specs: {
      engine_description: '97.5ci 1599cc OHV I4 (8.5:1) — Opel-derived',
      torque_nm: 130,
      compression: '8.5:1',
      bore_stroke_mm: '85.7 x 69.2',
      power_rpm: 5500,
      fuel_system: 'Single Zenith downdraft carburettor',
      grades: ['Torana SL 1600'],
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '138', engine_litres: 2.250, engine_config: 'I6',
    engine_kw: 71, fuel_type: 'ULP',
    notes: 'Torana S / SL 6-cylinder; wheelbase 2540mm',
    specs: {
      engine_description: '138ci 2250cc OHV I6 (9.2:1)',
      torque_nm: 162,
      compression: '9.2:1',
      bore_stroke_mm: '79.4 x 76.2',
      power_rpm: 4600,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  // 161 upgraded to 88kW / 9.4:1 vs LC's 85kW / 9.2:1
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'Torana S / SL 6-cylinder; upgraded from LC (85kW/9.2:1 to 88kW/9.4:1)',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 227,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  // 202 — introduced February 1973
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1973, year_to: 1975,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'Introduced February 1973; Torana GTR 3300',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Single Bendix-Stromberg downdraft carburettor',
      grades: ['Torana SL', 'GTR'],
    },
  },
  // 202 XU-1 — replaced 186 XU-1 from LC; triple Stromberg 175 CD2-S
  {
    make: 'Holden', model: 'Torana', series: 'LJ',
    year_from: 1972, year_to: 1975,
    engine_code: '202 XU-1', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 142, fuel_type: 'ULP',
    trim_code: 'GTR XU-1',
    notes: 'GTR XU-1; triple Stromberg 175 CD2-S; high-perf HX camshaft; LSD standard; 1,667 built',
    specs: {
      engine_description: '202ci 3310cc OHV I6 XU-1 triple sidedraught (10.3:1)',
      torque_nm: 270,
      compression: '10.3:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 5600,
      fuel_system: 'Triple 175 CD2-S Stromberg sidedraught carburettors with low-restriction air cleaners',
      exhaust: 'Twin manifolds, 2-inch system and sports muffler',
      camshaft: '"HX" high-performance camshaft; modified head with larger exhaust valves on 1973 Bathurst',
      num_built_xu1: 1667,
      grades: ['GTR XU-1'],
    },
  },

  // ── Torana LX (1976–1978) — 49,902 built (8,527 Hatchbacks) ─────────────
  // Minor facelift of LH. New Hatchback body style. A9X option pack (SS Hatch and SL/R 5000).
  // V8 engines derated mid-run: 253 from 130kW → 120kW, 308 from 186kW → 170kW (after July 1976).
  // RTS (Radial Tuned Suspension) introduced across range from April 1977.

  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '1900', engine_litres: 1.897, engine_config: 'I4',
    engine_kw: 76, fuel_type: 'ULP',
    notes: 'Torana S / SL 1900; Opel-sourced; Solex 2-barrel',
    specs: {
      engine_description: '1897cc OHV I4 Opel (9.0:1) — Solex two-barrel',
      torque_nm: 156,
      compression: '9.0:1',
      bore_stroke_mm: '93.0 x 69.8',
      power_rpm: 5400,
      fuel_system: 'Solex two-barrel downdraft carburettor',
      grades: ['S 1900', 'SL 1900'],
      num_built: 49902,
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'S / SL 2850 (161ci); RTS from April 1977',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['S 2850', 'SL 2850'],
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'SL/R 3300; SS Hatchback standard; RTS from April 1977',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Single Bendix-Stromberg downdraft carburettor',
      grades: ['SL/R 3300', 'SL 3300 Hatchback', 'SS 3300 Hatchback'],
    },
  },
  // 253 V8 — derated after July 1976: 130kW → 120kW
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 120, fuel_type: 'ULP',
    notes: 'Pre-July 1976: 130kW; from July 1976: 120kW. SL/R 4.2 V8 and SS Hatchback',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4800,
      engine_kw_early: 130,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      grades: ['SL/R 4.2 V8', 'SS 4.2 V8 Hatchback', 'SL 4.2 V8 Hatchback'],
    },
  },
  // 308 V8 — derated after July 1976: 186kW → 170kW; A9X pack available
  {
    make: 'Holden', model: 'Torana', series: 'LX',
    year_from: 1976, year_to: 1978,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 170, fuel_type: 'ULP',
    notes: 'Pre-July 1976: 186kW; from July 1976: 170kW. Dual exhaust on SS Hatch and SL/R 5000',
    specs: {
      engine_description: '308ci 5047cc OHV V8 Rochester Quadrajet (9.7:1)',
      torque_nm: 434,
      compression: '9.7:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      engine_kw_early: 186,
      fuel_system: 'Four-barrel Rochester Quadrajet downdraft carburettor',
      exhaust: 'Dual exhaust on SS Hatch and SL/R 5000',
      grades: ['SL/R 5000', 'SS 5000 Hatchback', 'A9X'],
    },
  },

  // ── Torana UC (1978–1980) — 53,007 built ─────────────────────────────────
  // Smoother, more rounded facelift of LX. V8 dropped entirely.
  // Introduced Holden-designed "Starfire 4" engine (replacing Opel unit).
  // Starfire: same bore/stroke as Opel 1900 but Holden-designed, lower power (60kW vs 76kW) for emissions.
  // Models: Sunbird (entry), S, SL sedan and hatchback. RTS standard.

  // 1900 Starfire — Holden-designed OHV I4, 1892cc, 60kW; replaced Opel unit
  {
    make: 'Holden', model: 'Torana', series: 'UC',
    year_from: 1978, year_to: 1980,
    engine_code: '1900', engine_litres: 1.892, engine_config: 'I4',
    engine_kw: 60, fuel_type: 'ULP',
    notes: 'Sunbird / S / SL; Holden Starfire 4 engine (replaced Opel unit); RTS standard',
    specs: {
      engine_description: '1892cc Holden Starfire OHV I4 (8.7:1) — GM Varajet two-barrel',
      torque_nm: 140,
      compression: '8.7:1',
      bore_stroke_mm: '93.0 x 69.8',
      power_rpm: 4000,
      fuel_system: 'Two-barrel Varajet downdraft carburettor',
      engine_note: 'Holden-designed "Starfire 4" — replaced Opel-sourced engine from LH/LX',
      grades: ['Sunbird', 'Sunbird Hatchback', 'Torana S', 'Torana SL'],
      num_built: 53007,
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'UC',
    year_from: 1978, year_to: 1980,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'S / SL 2850 (161ci); RTS standard',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      grades: ['Torana S', 'Torana SL'],
    },
  },
  {
    make: 'Holden', model: 'Torana', series: 'UC',
    year_from: 1978, year_to: 1980,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'SL / SL Hatchback 3300; RTS standard',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Single Bendix-Stromberg downdraft carburettor',
      grades: ['Torana SL', 'Torana SL Hatchback'],
    },
  },

  // ── Torana LH (1974–1976) — 71,408 built ─────────────────────────────────
  // Completely new squared-off body. Larger wheelbase (2586mm). New 1900 Opel 4cyl.
  // V8 options for first time in Torana. L34 racing version with Holley carb (260kW).

  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '1900', engine_litres: 1.897, engine_config: 'I4',
    engine_kw: 76, fuel_type: 'ULP',
    notes: 'Torana S / SL 1900; Opel-sourced engine; Solex 2-barrel',
    specs: {
      engine_description: '1897cc OHV I4 Opel (9.0:1) — Solex two-barrel',
      torque_nm: 156,
      compression: '9.0:1',
      bore_stroke_mm: '93.0 x 69.8',
      power_rpm: 5400,
      fuel_system: 'Solex two-barrel downdraft carburettor',
      grades: ['Torana S 1900', 'Torana SL 1900'],
      num_built: 71408,
    },
  },
  // 161ci (2850) — same spec as LJ 161
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '161', engine_litres: 2.640, engine_config: 'I6',
    engine_kw: 88, fuel_type: 'ULP',
    notes: 'Torana S / SL 2850 (161ci)',
    specs: {
      engine_description: '161ci 2640cc OHV I6 (9.4:1)',
      torque_nm: 228,
      compression: '9.4:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4400,
      fuel_system: 'Bendix-Stromberg single-barrel downdraft carburettor',
      engine_prefix: 'HE (LC Export) / HD (HC)',
      grades: ['Torana S 2850', 'Torana SL 2850'],
    },
  },
  // 202ci (3300) — standard on SL/R
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '202', engine_litres: 3.310, engine_config: 'I6',
    engine_kw: 101, fuel_type: 'ULP',
    notes: 'Torana SL/R 3300',
    specs: {
      engine_description: '202ci 3310cc OHV I6 HC (9.4:1)',
      torque_nm: 262,
      compression: '9.4:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Single Bendix-Stromberg downdraft carburettor',
      engine_prefix: 'HM (LC Export) / HL (HC)',
      grades: ['Torana SL/R 3300'],
    },
  },
  // 253 V8 — first V8 in Torana
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '253', engine_litres: 4.146, engine_config: 'V8',
    engine_kw: 138, fuel_type: 'ULP',
    notes: 'Torana SL/R 253 — first V8 in Torana',
    specs: {
      engine_description: '253ci 4146cc OHV V8 (9.0:1)',
      torque_nm: 355,
      compression: '9.0:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4400,
      fuel_system: 'Twin-barrel Bendix-Stromberg carburettor',
      engine_prefix: 'HR',
      grades: ['Torana SL/R 253'],
    },
  },
  // 308 V8 (SL/R 5000) — Stromberg 4-barrel
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 179, fuel_type: 'ULP',
    notes: 'Torana SL/R 5000; front and rear stabiliser bar standard',
    specs: {
      engine_description: '308ci 5047cc OHV V8 (9.0:1) — Stromberg 4-barrel',
      torque_nm: 427,
      compression: '9.0:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4800,
      fuel_system: 'Four-barrel Stromberg downdraft carburettor',
      engine_prefix: 'HT',
      grades: ['Torana SL/R 5000'],
    },
  },
  // 308 V8 L34 — homologation racing version with Holley carb, 260kW (from July 1974)
  {
    make: 'Holden', model: 'Torana', series: 'LH',
    year_from: 1974, year_to: 1976,
    engine_code: '308 L34', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 260, fuel_type: 'ULP',
    trim_code: 'L34',
    notes: 'L34 racing homologation kit; Holley 4-barrel; dual exhaust; 254mm drums all round',
    specs: {
      engine_description: '308ci 5047cc OHV V8 L34 race (9.8:1) — Holley four-barrel',
      torque_nm: 390,
      compression: '9.8:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 6000,
      fuel_system: 'Holley four-barrel carburettor',
      exhaust: 'Dual exhaust pipes',
      notes_spec: '349bhp (260kW) — optional L34 racing kit',
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HOLDEN TORANA ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api(`/vehicles?make=eq.Holden&model=eq.Torana&select=series,year_from,year_to,engine_code,trim_code,fuel_type`);
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  const [withoutTrim, withTrim] = splitByTrimCode(toInsert);
  const inserted = [...await insertBatch(withoutTrim), ...await insertBatch(withTrim)];

  console.log(`Inserted ${inserted.length} vehicles:`);
  for (const v of inserted) {
    console.log(`  ${v.id}  Torana ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
