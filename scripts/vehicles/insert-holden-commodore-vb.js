#!/usr/bin/env node
// Insert Holden VB Commodore (1978-1980) — 95,906 built
// Usage: node scripts/insert-holden-commodore-vb.js [--dry-run]
// First Commodore, replacing HZ. All-new mid-sized body.
// MacPherson strut front / 5-link panhard rod rear (new for Holden).
// Engines heavily detuned for ADR 27A emissions.

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

  // 161ci (2850) — 64kW; heavily detuned ADR27A version
  {
    make: 'Holden', model: 'Commodore', series: 'VB',
    year_from: 1978, year_to: 1980,
    engine_code: '161', engine_litres: 2.638, engine_config: 'I6',
    engine_kw: 64, fuel_type: 'ULP',
    notes: 'Commodore base; Sedan and Wagon',
    specs: {
      engine_description: '161ci 2638cc OHV I6 (9.2:1) — ADR27A',
      torque_nm: 198,
      compression: '9.2:1',
      bore_stroke_mm: '88.9 x 76.2',
      power_rpm: 4000,
      fuel_system: 'Bendix-Stromberg 1-barrel downdraft carburettor',
      suspension_front: 'MacPherson wet strut, 22mm stabiliser bar',
      suspension_rear: '5-link with panhard rod, progressive-rate coil springs, 18mm decoupled stabiliser bar',
      grades: ['Commodore', 'Commodore SL'],
      num_built: 95906,
    },
  },
  // 202ci (3300) — 71kW
  {
    make: 'Holden', model: 'Commodore', series: 'VB',
    year_from: 1978, year_to: 1980,
    engine_code: '202', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 71, fuel_type: 'ULP',
    notes: 'Commodore / SL / SL/E; Sedan and Wagon',
    specs: {
      engine_description: '202ci 3298cc OHV I6 (9.2:1) — ADR27A',
      torque_nm: 221,
      compression: '9.2:1',
      bore_stroke_mm: '92.0 x 82.5',
      power_rpm: 3600,
      fuel_system: 'Bendix-Stromberg 1-barrel downdraft carburettor',
      grades: ['Commodore', 'Commodore SL', 'Commodore SL/E'],
    },
  },
  // 253 V8 — 87kW
  {
    make: 'Holden', model: 'Commodore', series: 'VB',
    year_from: 1978, year_to: 1980,
    engine_code: '253', engine_litres: 4.142, engine_config: 'V8',
    engine_kw: 87, fuel_type: 'ULP',
    notes: 'Optional on SL and SL/E',
    specs: {
      engine_description: '253ci 4142cc OHV V8 (9.4:1)',
      torque_nm: 271,
      compression: '9.4:1',
      bore_stroke_mm: '92.0 x 77.7',
      power_rpm: 4000,
      fuel_system: 'Bendix-Stromberg 2-barrel carburettor',
      exhaust: 'Dual cast iron manifolds with single crossover pipe; optional dual pipes with three mufflers',
      grades: ['Commodore SL', 'Commodore SL/E'],
    },
  },
  // 308 V8 — 114kW standard
  {
    make: 'Holden', model: 'Commodore', series: 'VB',
    year_from: 1978, year_to: 1980,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 114, fuel_type: 'ULP',
    notes: 'Optional on SL and SL/E; TurboHydramatic 350 automatic or M21 4-speed manual',
    specs: {
      engine_description: '308ci 5047cc OHV V8 Rochester Quadrajet (9.4:1)',
      torque_nm: 344,
      compression: '9.4:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4000,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual cast iron manifolds with single crossover pipe; optional dual pipes with three mufflers',
      transmission_auto: 'TurboHydramatic 350 (M41)',
      grades: ['Commodore SL', 'Commodore SL/E'],
    },
  },
  // 308 V8 — 125kW performance tune (referenced in perf data for SL/E)
  {
    make: 'Holden', model: 'Commodore', series: 'VB',
    year_from: 1978, year_to: 1980,
    engine_code: '308', engine_litres: 5.047, engine_config: 'V8',
    engine_kw: 125, fuel_type: 'ULP',
    trim_code: 'SL/E',
    notes: 'SL/E performance tune 308 — 125kW variant referenced in factory performance data',
    specs: {
      engine_description: '308ci 5047cc OHV V8 Rochester Quadrajet (9.4:1) — SL/E performance tune',
      torque_nm: 344,
      compression: '9.4:1',
      bore_stroke_mm: '101.6 x 77.7',
      power_rpm: 4000,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual cast iron manifolds with single crossover pipe; optional dual pipes with three mufflers',
      grades: ['Commodore SL/E'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT VB COMMODORE ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VB&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  // Split by trim_code to avoid PostgREST key mismatch
  const withoutTrim = toInsert.filter(v => !v.trim_code);
  const withTrim    = toInsert.filter(v =>  v.trim_code);
  const inserted = [];
  for (const batch of [withoutTrim, withTrim]) {
    if (!batch.length) continue;
    const r = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(batch),
    });
    if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }
    inserted.push(...r);
  }

  console.log(`Inserted ${inserted.length} vehicles:`);
  for (const v of inserted) {
    console.log(`  ${v.id}  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
