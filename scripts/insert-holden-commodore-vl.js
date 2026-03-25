#!/usr/bin/env node
// Insert Holden VL Commodore (1986-1988) — 151,801 built (incl. HDT/HSV)
// Usage: node scripts/insert-holden-commodore-vl.js [--dry-run]
// Major change: Nissan RB30 6-cyl replaces Holden 202 six; Turbo variant.
// All models fitted with catalytic converters.
// SV88 = 1988 SS Group A (500 built 1986, 750 built 1987).

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

const vehicles = [

  // 3.0L Nissan RB30E I6 — 114kW EFI
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1986, year_to: 1988,
    engine_code: 'RB30', engine_litres: 2.962, engine_config: 'I6',
    engine_kw: 114, fuel_type: 'ULP',
    notes: 'Nissan-built RB30E; standard engine across SL/Executive/Berlina/Calais; 5-speed manual or 4-speed auto',
    specs: {
      engine_description: '2962cc OHV I6 Nissan RB30E EFI (9.0:1)',
      torque_nm: 247,
      compression: '9.0:1',
      bore_stroke_mm: '86.0 x 85.0',
      power_rpm: 5200,
      fuel_system: 'Electronic fuel injection',
      exhaust: 'Catalytic converter fitted',
      grades: ['Commodore SL', 'Commodore Executive', 'Commodore Berlina', 'Holden Calais'],
      num_built: 151801,
    },
  },
  // 3.0L Nissan RB30ET Turbo I6 — 150kW EFI Turbo
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1986, year_to: 1988,
    engine_code: 'RB30ET', engine_litres: 2.962, engine_config: 'I6',
    engine_kw: 150, fuel_type: 'ULP',
    notes: 'Nissan-built RB30ET turbo; 7.8:1 compression; heavy-duty 5-speed manual or 4-speed auto',
    specs: {
      engine_description: '2962cc OHV I6 Nissan RB30ET Turbo EFI (7.8:1)',
      torque_nm: 296,
      compression: '7.8:1',
      bore_stroke_mm: '86.0 x 85.0',
      power_rpm: 5600,
      fuel_system: 'Electronic fuel injection with turbocharger',
      exhaust: 'Catalytic converter fitted',
      grades: ['Commodore SL', 'Commodore Berlina', 'Holden Calais'],
    },
  },
  // 5.0L 308 V8 — 122kW carb (standard tune)
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1986, year_to: 1988,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 122, fuel_type: 'ULP',
    notes: 'Optional on Calais/SS; Rochester Quadrajet carb; TriMatic auto',
    specs: {
      engine_description: '308ci 4987cc OHV V8 Rochester Quadrajet (8.5:1)',
      torque_nm: 323,
      compression: '8.5:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Catalytic converter; cast iron dual manifolds single crossover pipe',
      grades: ['Holden Calais', 'Commodore SS'],
    },
  },
  // 5.0L SV88 V8 — 136kW; 1988 SS Group A
  {
    make: 'Holden', model: 'Commodore', series: 'VL',
    year_from: 1986, year_to: 1988,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 136, fuel_type: 'ULP',
    trim_code: 'SV88',
    notes: 'SS Group A; SV88 RPO; dual exhaust; 500 built 1986, 750 built 1987; Borg Warner BT5G 5-speed',
    specs: {
      engine_description: '308ci 4987cc OHV V8 Rochester Quadrajet SV88 (8.5:1) — Group A SS',
      torque_nm: 355,
      compression: '8.5:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      engine_prefix: 'SV88',
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Dual exhaust with catalytic converter',
      grades: ['Commodore SS Group A'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT VL COMMODORE ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VL&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  // Split batches by trim_code presence for PostgREST key uniformity
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
