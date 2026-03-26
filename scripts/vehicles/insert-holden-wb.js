#!/usr/bin/env node
// Insert Holden WB (1980-1985) — 60,231 built
// Commercial range: Utility, Panel Van, One-Tonner, Kingswood Utility/Van
// Statesman: DeVille, Caprice, Series II, HDT Magnum
// Usage: node scripts/insert-holden-wb.js [--dry-run]

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

const vehicles = [

  // ── COMMERCIALS ──────────────────────────────────────────────────────────
  // 3.3L 202 I6 — 83kW; Utility, Panel Van, Kingswood Utility/Van, One-Tonner
  {
    make: 'Holden', model: 'Kingswood', series: 'WB',
    year_from: 1980, year_to: 1985,
    engine_code: '202', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 83, fuel_type: 'ULP',
    notes: 'Utility, Panel Van, Kingswood Utility/Van, One-Tonner',
    specs: {
      engine_description: '202ci 3298cc OHV I6 GM Strasbourg Varajet (8.8:1)',
      torque_nm: 231,
      compression: '8.8:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4000,
      fuel_system: 'GM Strasbourg Varajet twin-barrel downdraft carburettor',
      num_built: 60231,
    },
  },
  // 4.2L 253 V8 — 100kW single / 115kW dual exhaust; Commercials
  {
    make: 'Holden', model: 'Kingswood', series: 'WB',
    year_from: 1980, year_to: 1985,
    engine_code: '253', engine_litres: 4.142, engine_config: 'V8',
    engine_kw: 100, fuel_type: 'ULP',
    notes: 'Optional on commercial variants; 115kW with dual exhaust',
    specs: {
      engine_description: '253ci 4142cc OHV V8 Rochester Quadrajet (9.0:1)',
      torque_nm: 269,
      torque_nm_dual_exhaust: 289,
      compression: '9.0:1',
      bore_stroke_mm: '92.1 x 77.8',
      power_rpm: 4200,
      engine_kw_dual_exhaust: 115,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
    },
  },

  // ── STATESMAN ─────────────────────────────────────────────────────────────
  // 5.0L 308 V8 — 126kW; DeVille and Caprice
  {
    make: 'Holden', model: 'Statesman', series: 'WB',
    year_from: 1980, year_to: 1985,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 126, fuel_type: 'ULP',
    notes: 'Statesman DeVille and Caprice (incl Series II from Aug 1983)',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet 4BBL (9.2:1)',
      torque_nm: 361,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Rochester Quadrajet 4BBL downdraft carburettor',
    },
  },
  // 5.0L 308 V8 HDT Magnum — 188kW; Statesman Magnum
  {
    make: 'Holden', model: 'Statesman', series: 'WB',
    year_from: 1980, year_to: 1985,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 188, fuel_type: 'ULP',
    trim_code: 'HDT Magnum',
    notes: 'HDT Brock Statesman Magnum; high performance tune',
    specs: {
      engine_description: '308ci 5044cc OHV V8 HDT high performance (9.2:1)',
      torque_nm: 429,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 5000,
      fuel_system: '4-barrel downdraft carburettor',
      exhaust: 'HDT exhaust manifold with high performance exhaust system',
      wheels: 'Momo alloy 7.00JJ x 15',
      tyres: 'Pirelli P6 235/30 VR15',
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT HOLDEN WB ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) console.log(`  ${v.model} WB ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW${v.trim_code ? ' ('+v.trim_code+')' : ''}`);
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&series=eq.WB&select=series,model,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.model ?? ''}|${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.model ?? ''}|${v.series}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  // Split by trim_code presence for PostgREST key uniformity
  const withTrim    = toInsert.filter(v => v.trim_code);
  const withoutTrim = toInsert.filter(v => !v.trim_code);

  for (const batch of [withoutTrim, withTrim].filter(b => b.length > 0)) {
    const r = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(batch),
    });
    if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }
    for (const v of r) {
      console.log(`  Inserted ${v.id}  ${v.model} WB ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW${v.trim_code ? ' ('+v.trim_code+')' : ''}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
