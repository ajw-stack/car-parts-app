#!/usr/bin/env node
// Patch fuel_type where it is unambiguously derivable:
//   1. Diesel keyword in model name (DIESEL / TDI / CDI / dCi / HDi / TDS / NNNd / TD)
//   2. Hybrid keyword in model name + specific hybrid models (BMW 330E, etc.)
//   3. Whole-make = ULP (Cadillac, Daimler, Eunos, Hummer, Lotus, Pontiac, Rolls-Royce, Scion)
//   4. Holden HSV = ULP (excludes JACKAROO/TROOPER and INSIGNIA which could be diesel)
//   5. BMW specific petrol models (Z3, Z4, M2, M3, M4, 116i + F/E series with explicit petrol specs)
// Usage: node scripts/patches/patch-fuel-type-obvious.js [--dry-run]

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

async function fetchAll(filter) {
  const rows = [];
  let offset = 0;
  while (true) {
    const page = await api(`${filter}&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

async function patch(filter, fuel_type, label) {
  if (DRY_RUN) {
    const rows = await api(`${filter}&select=id`);
    console.log(`  ${String(rows.length).padStart(4)} rows  →  ${fuel_type}  (${label})`);
    return rows.length;
  } else {
    await api(filter, {
      method:  'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body:    JSON.stringify({ fuel_type }),
    });
    console.log(`  ✓  ${fuel_type}  ${label}`);
    return 0;
  }
}

// ── Diesel keywords in model name ─────────────────────────────────────────────
function looksDiesel(model) {
  const m = (model || '').toUpperCase();
  // Skip mixed rows that mention both PETROL and TD/Diesel — can't assign a single fuel type
  if (/PETROL/.test(m) && (/\bTD\b/.test(m) || /\bDIESEL\b/.test(m))) return false;
  return (
    /\bDIESEL\b/.test(m)      ||
    /\bTDI\b/.test(m)         ||
    /\bCDI\b/.test(m)         ||
    /\bDCI\b/.test(m)         ||
    /\bHDI\b/.test(m)         ||
    /\bSDI\b/.test(m)         ||
    /\bTDS\b/.test(m)         ||
    /\b\d{3,}L?D\b/.test(m)  ||  // 116D, 320D, 730D, 730LD (3+ digits avoids "4D"/"2D" = door counts)
    /\b\d{2,}TD\b/.test(m)   ||  // 525TD, 325TD (2+ digits)
    /\bTD\b/.test(m)              // standalone "TD" — e.g. "2.5L TD"
  );
}

function looksHybrid(model) {
  const m = (model || '').toUpperCase();
  return /HYBRID|ACTIVEHYBRID|PLUG.IN|PHEV/.test(m);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH FUEL TYPE (OBVIOUS) ===');
  let total = 0;

  // ── 1. Diesel by model name keyword ─────────────────────────────────────────
  console.log('\n--- 1. Diesel (keyword in model name) ---');
  const allNull = await fetchAll('/vehicles?fuel_type=is.null&select=id,make,model&order=make,model');

  // Group diesel candidates by make+model
  const dieselGroups = {};
  for (const r of allNull) {
    if (looksDiesel(r.model)) {
      const key = `${r.make}||${r.model}`;
      dieselGroups[key] = { make: r.make, model: r.model };
    }
  }
  for (const { make, model } of Object.values(dieselGroups)) {
    const enc = encodeURIComponent;
    const n = await patch(
      `/vehicles?make=eq.${enc(make)}&model=eq.${enc(model)}&fuel_type=is.null`,
      'Diesel',
      `${make} / ${model}`
    );
    total += n;
  }

  // ── 2. Hybrid by model name keyword ─────────────────────────────────────────
  console.log('\n--- 2. Hybrid (keyword in model name) ---');
  const hybridGroups = {};
  for (const r of allNull) {
    if (looksHybrid(r.model)) {
      const key = `${r.make}||${r.model}`;
      hybridGroups[key] = { make: r.make, model: r.model };
    }
  }
  for (const { make, model } of Object.values(hybridGroups)) {
    const enc = encodeURIComponent;
    const n = await patch(
      `/vehicles?make=eq.${enc(make)}&model=eq.${enc(model)}&fuel_type=is.null`,
      'Hybrid',
      `${make} / ${model}`
    );
    total += n;
  }

  // BMW 330E = plug-in hybrid (name has no "hybrid" keyword)
  {
    const n = await patch(
      '/vehicles?make=eq.BMW&model=eq.330E&fuel_type=is.null',
      'Hybrid', 'BMW / 330E (plug-in hybrid)'
    );
    total += n;
  }

  // ── 3. Whole-make = ULP ──────────────────────────────────────────────────────
  console.log('\n--- 3. Whole-make = ULP ---');
  const ulpMakes = ['Cadillac', 'Daimler', 'Eunos', 'Hummer', 'Lotus', 'Pontiac', 'Rolls-Royce', 'Scion'];
  for (const make of ulpMakes) {
    const n = await patch(
      `/vehicles?make=eq.${encodeURIComponent(make)}&fuel_type=is.null`,
      'ULP', `${make} (all models)`
    );
    total += n;
  }

  // ── 4. Holden HSV = ULP (excluding JACKAROO/TROOPER and INSIGNIA) ───────────
  console.log('\n--- 4. Holden HSV = ULP (excl. JACKAROO/TROOPER & INSIGNIA) ---');
  {
    const n = await patch(
      '/vehicles?make=eq.Holden+HSV&fuel_type=is.null' +
      '&model=neq.JACKAROO+%2F+TROOPER+%E2%80%93+ISUZU+GM' +
      '&model=neq.INSIGNIA',
      'ULP', 'Holden HSV (all HSV performance models)'
    );
    total += n;
  }

  // ── 5. BMW clearly petrol models ─────────────────────────────────────────────
  console.log('\n--- 5. BMW clearly petrol (ULP) ---');
  const bmwUlp = [
    'Z3', 'Z4',           // petrol roadsters — no diesel Z sold in AU
    'M2', 'M3', 'M4',    // M-performance — always petrol
    '116i',               // petrol hatchback
    // E-series with explicit petrol specs in the name
    'E31 M70',
    'E38 750I V12 5.4L 240kW',
    'E39 4.4 V8',
    'E39 V8',
    'E60 2.2L',
    'E60 2.5L – MANUAL',
    'E60 4.0L V8',
    'E60 4.4L V8',
    'E63 3.0L',
    'E81 2.0L HATCHBACK',
    'E82 2.0L & 3.0L',
    'E88 2.0L CONVER TIBLE',
    'E88 2.0L CONVERTIBLE',
    'E93 2.0L CONVERTIBLE',
    // F-series with explicit petrol displacement/turbo (no diesel mention)
    'F02 3.0L TURBO',
    'F10 4.4L V8',
    'F11 3.0L TOURING',
    'F20 1.6L TURBO',
    'F20 1.6L TURBO & X/DRIVE HATCHBACK',
    'F20 3.0L',
    'F21 1.6L HATCHBACK',
    'F22 & F23 2.0L TURBO',
    'F22 & F23 3.L',
    'F30 2.0L TURBO',
    'F30 / F31 / F35 / F80 2.0L & X/DRIVE SALOON',
    'F30 / F35 / F80 2.0L TURBO & X/DRIVE SEDAN',
    'F30 /F35 / F80 1.6L SEDAN',
    'F30 / F35 / F80 1.5L SEDAN',
    'F30, F31, 2.0L ESTATE & X/DRIVE',
    'F31 1.5L WAGON',
    'F31 320I',
    'F32 / F33 / F82 2.0L TURBO & X/DRIVE COUPE',
    'F33 / F83 2.0L CONVERTIBLE',
    'F34 2.0L & X/DRIVE HATCHBACK',
    'F34 2.0L TURBO & X/DRIVE HATCHBACK',
    'F34 3.0L GRAN TURISMO & X/DRIVE HATCHBACK',
    'F34 320i',
    'F36 GRAN COUP 2.0L TURBO & X/DRIVE',
  ];
  for (const model of bmwUlp) {
    const n = await patch(
      `/vehicles?make=eq.BMW&model=eq.${encodeURIComponent(model)}&fuel_type=is.null`,
      'ULP', `BMW / ${model}`
    );
    total += n;
  }

  console.log(DRY_RUN
    ? `\nDry-run complete. Would patch ~${total} rows.`
    : '\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
