#!/usr/bin/env node
// Insert Holden VN Commodore (1988-1991) — 215,180 built
// Usage: node scripts/insert-holden-commodore-vn.js [--dry-run]
// All-new body (longer, more rounded). First Holden V6 (Buick 3800 derived).
// Nissan RB30 dropped; 308 V8 now EFI (165kW vs VL's 122kW carb).
// EV6 updated tune introduced September 1989 (127kW vs 125kW).
// VQ Statesman/Caprice introduced 7th March 1990 on extended wheelbase floor-pan.

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

  // 3.8L V6 — 125kW; August 1988 to September 1989
  {
    make: 'Holden', model: 'Commodore', series: 'VN',
    year_from: 1988, year_to: 1989,
    engine_code: '3800', engine_litres: 3.791, engine_config: 'V6',
    engine_kw: 125, fuel_type: 'ULP',
    notes: 'Buick-derived 3800 V6; Aug 1988 – Sep 1989 (pre-EV6 update); EFI speed-density',
    specs: {
      engine_description: '3791cc OHV V6 3800 EFI (8.5:1)',
      torque_nm: 292,
      compression: '8.5:1',
      bore_stroke_mm: '96.5 x 86.3',
      power_rpm: 4800,
      fuel_system: 'Electronic fuel injection — Bosch injectors, Delco ECM',
      grades: ['Commodore Executive', 'Commodore Berlina', 'Commodore S', 'Holden Calais', 'VQ Statesman', 'VQ Caprice'],
      num_built: 215180,
    },
  },
  // 3.8L V6 EV6 — 127kW; from September 1989 (Series II)
  {
    make: 'Holden', model: 'Commodore', series: 'VN',
    year_from: 1989, year_to: 1991,
    engine_code: '3800 EV6', engine_litres: 3.791, engine_config: 'V6',
    engine_kw: 127, fuel_type: 'ULP',
    notes: 'Series II EV6 updated tune; Sep 1989 onwards; 288Nm (slightly less torque, more power)',
    specs: {
      engine_description: '3791cc OHV V6 3800 EV6 EFI (8.5:1) — Series II',
      torque_nm: 288,
      compression: '8.5:1',
      bore_stroke_mm: '96.5 x 86.3',
      power_rpm: 4800,
      fuel_system: 'Electronic fuel injection — Bosch injectors, Delco ECM',
      grades: ['Commodore Executive', 'Commodore Berlina', 'Commodore S', 'Holden Calais', 'VQ Statesman', 'VQ Caprice'],
    },
  },
  // 5.0L 308 V8 EFI — 165kW (huge jump from VL's 122kW carb via EFI conversion)
  {
    make: 'Holden', model: 'Commodore', series: 'VN',
    year_from: 1988, year_to: 1991,
    engine_code: '308', engine_litres: 4.987, engine_config: 'V8',
    engine_kw: 165, fuel_type: 'ULP',
    notes: 'EFI 308; SS / Calais / Statesman; 289mm heavy-duty front discs on V8',
    specs: {
      engine_description: '308ci 4987cc OHV V8 EFI (8.4:1)',
      torque_nm: 385,
      compression: '8.4:1',
      bore_stroke_mm: '101.6 x 77.8',
      power_rpm: 4400,
      fuel_system: 'Electronic port fuel injection — Bosch injectors, Delco ECM speed-density',
      exhaust: 'Cast iron dual manifolds with single crossover; single exhaust two reverse-flow mufflers',
      grades: ['Commodore SS', 'Holden Calais', 'VQ Statesman', 'VQ Statesman Caprice'],
    },
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT VN COMMODORE ===');
  console.log(`Prepared ${vehicles.length} vehicles`);

  if (DRY_RUN) {
    for (const v of vehicles) {
      console.log(`  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
    }
    return;
  }

  const existing = await api('/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VN&select=series,year_from,year_to,engine_code,trim_code,fuel_type');
  const existingKeys = new Set(
    existing.map(v => `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`)
  );

  const toInsert = vehicles.filter(v => {
    const key = `${v.series ?? ''}|${v.year_from}|${v.year_to ?? ''}|${v.engine_code ?? ''}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Already in DB: ${vehicles.length - toInsert.length} | To insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  const r = await api('/vehicles', {
    method: 'POST',
    headers: { ...hdrs, Prefer: 'return=representation' },
    body: JSON.stringify(toInsert),
  });
  if (!Array.isArray(r)) { console.error('Unexpected:', r); process.exit(1); }

  console.log(`Inserted ${r.length} vehicles:`);
  for (const v of r) {
    console.log(`  ${v.id}  Commodore ${v.series} ${v.year_from}-${v.year_to} ${v.engine_code} ${v.engine_kw}kW`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
