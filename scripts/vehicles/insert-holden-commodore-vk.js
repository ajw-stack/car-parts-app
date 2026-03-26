#!/usr/bin/env node
// Insert Holden VK Commodore (1984-1986) — 135,705 built (including HDT)
// Usage: node scripts/insert-holden-commodore-vk.js [--dry-run]
// New 3-vertical-louvre grille, 3.3 EFI introduced (Bosch L-Jetronic), 253 dropped.
// V5H = high-performance 308 SS tune (177kW); Calais Director was HDT option.

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

  // 3.3L 202 EST I6 — 86kW; GM Strasbourg twin-barrel (carburettor)
  {
    make: 'Holden', model: 'Commodore', series: 'VK',
    year_from: 1984, year_to: 1986,
    engine_code: '202', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 86, fuel_type: 'ULP',
    notes: 'SL / Executive / Berlina; Sedan and Wagon; EST = Electronic Spark Timing (carb)',
    specs: {
      engine_description: '202ci 3298cc OHV I6 EST (8.8:1)',
      torque_nm: 232,
      compression: '8.8:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4200,
      fuel_system: 'GM Strasbourg twin-barrel downdraft carburettor',
      grades: ['Commodore SL', 'Commodore Executive', 'Commodore Berlina'],
    },
  },
  // 3.3L 202 EFI I6 — 106kW; Bosch LEII-Jetronic
  {
    make: 'Holden', model: 'Commodore', series: 'VK',
    year_from: 1984, year_to: 1986,
    engine_code: '202 EFI', engine_litres: 3.298, engine_config: 'I6',
    engine_kw: 106, fuel_type: 'ULP',
    notes: 'Berlina / Calais; first EFI Holden six-cylinder',
    specs: {
      engine_description: '202ci 3298cc OHV I6 EFI Bosch LEII-Jetronic (8.8:1)',
      torque_nm: 266,
      compression: '8.8:1',
      bore_stroke_mm: '92.1 x 82.5',
      power_rpm: 4400,
      fuel_system: 'Bosch LEII-Jetronic fuel injection',
      exhaust: 'Fabricated tuned-length stainless steel tubular — 1,6 / 2,5 / 3,4 firing pairs',
      grades: ['Commodore Berlina', 'Holden Calais'],
    },
  },
  // 5.0L 308 V8 — 126kW dual exhaust
  {
    make: 'Holden', model: 'Commodore', series: 'VK',
    year_from: 1984, year_to: 1986,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 126, fuel_type: 'ULP',
    notes: 'Optional on Berlina / Calais; dual exhaust standard',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet (9.2:1)',
      torque_nm: 361,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Cast iron per bank; dual pipes',
      grades: ['Commodore Berlina', 'Holden Calais'],
    },
  },
  // 5.0L 308 V5H V8 (SS) — 177kW; performance cam/exhaust; manual only
  {
    make: 'Holden', model: 'Commodore', series: 'VK',
    year_from: 1984, year_to: 1986,
    engine_code: '308', engine_litres: 5.044, engine_config: 'V8',
    engine_kw: 177, fuel_type: 'ULP',
    trim_code: 'SS',
    notes: 'SS model; V5H RPO code; low-restriction exhaust with white-head-proof coated headers; manual only',
    specs: {
      engine_description: '308ci 5044cc OHV V8 Rochester Quadrajet V5H (9.2:1) — SS performance tune',
      torque_nm: 419,
      compression: '9.2:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4800,
      engine_prefix: 'V5H',
      fuel_system: 'Rochester Quadrajet 4-barrel downdraft carburettor',
      exhaust: 'Low-restriction dual exhaust with white-head-proof coated headers',
      grades: ['Commodore SS'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT VK COMMODORE ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code}${v.trim_code ? ' ('+v.trim_code+')' : ''} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VK&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
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
