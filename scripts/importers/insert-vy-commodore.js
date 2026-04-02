#!/usr/bin/env node
// Insert Holden Commodore VY variants with correct trim/chassis combinations.
// Deletes existing broad VY Commodore rows first, then inserts split rows.
//
// Usage: node scripts/importers/insert-vy-commodore.js [--dry-run]

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const h = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// All VY Commodore variants — one row per trim × chassis × engine combination
const rows = [
  // Executive — Sedan & Wagon — L36 only
  { trim_code: 'Executive', chassis: 'Sedan',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },
  { trim_code: 'Executive', chassis: 'Wagon',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },

  // Acclaim — Sedan & Wagon — L36 only
  { trim_code: 'Acclaim',   chassis: 'Sedan',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },
  { trim_code: 'Acclaim',   chassis: 'Wagon',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },

  // S — Sedan only — L36 or L67
  { trim_code: 'S',         chassis: 'Sedan',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },
  { trim_code: 'S',         chassis: 'Sedan',  engine_code: 'L67',        engine_litres: 3.8, engine_config: 'V6', engine_kw: 171, fuel_type: 'ULP', notes: 'Supercharged' },
  { trim_code: 'S',         chassis: 'Ute',    engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },

  // Berlina — Sedan & Wagon — L36 or LS1
  { trim_code: 'Berlina',   chassis: 'Sedan',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },
  { trim_code: 'Berlina',   chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 225, fuel_type: 'ULP', notes: 'Optional V8' },
  { trim_code: 'Berlina',   chassis: 'Wagon',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP' },
  { trim_code: 'Berlina',   chassis: 'Wagon',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 225, fuel_type: 'ULP', notes: 'Optional V8' },

  // Calais — Sedan only — L36 / L67 (standard) / LS1
  { trim_code: 'Calais',    chassis: 'Sedan',  engine_code: 'LN3 (L36)', engine_litres: 3.8, engine_config: 'V6', engine_kw: 152, fuel_type: 'ULP', notes: 'V6 delete option' },
  { trim_code: 'Calais',    chassis: 'Sedan',  engine_code: 'L67',        engine_litres: 3.8, engine_config: 'V6', engine_kw: 171, fuel_type: 'ULP', notes: 'Supercharged; standard engine' },
  { trim_code: 'Calais',    chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 225, fuel_type: 'ULP', notes: 'Optional V8' },

  // SV8 — Sedan only — LS1 (VY I 225kW, VY II 245kW)
  { trim_code: 'SV8',       chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 225, fuel_type: 'ULP', year_from: 2002, year_to: 2003, notes: 'VY Series I' },
  { trim_code: 'SV8',       chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 245, fuel_type: 'ULP', year_from: 2003, year_to: 2004, notes: 'VY Series II' },

  // SS — Sedan & limited Wagon — LS1 (VY I 235kW, VY II 245kW)
  { trim_code: 'SS',        chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 235, fuel_type: 'ULP', year_from: 2002, year_to: 2003, notes: 'VY Series I' },
  { trim_code: 'SS',        chassis: 'Sedan',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 245, fuel_type: 'ULP', year_from: 2003, year_to: 2004, notes: 'VY Series II' },
  { trim_code: 'SS',        chassis: 'Wagon',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 235, fuel_type: 'ULP', year_from: 2002, year_to: 2003, notes: 'VY Series I; limited edition' },
  { trim_code: 'SS',        chassis: 'Wagon',  engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 245, fuel_type: 'ULP', year_from: 2003, year_to: 2004, notes: 'VY Series II; limited edition' },
  { trim_code: 'SS',        chassis: 'Ute',    engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 235, fuel_type: 'ULP', year_from: 2002, year_to: 2003, notes: 'VY Series I' },
  { trim_code: 'SS',        chassis: 'Ute',    engine_code: 'LS1 (GENIII)', engine_litres: 5.7, engine_config: 'V8', engine_kw: 245, fuel_type: 'ULP', year_from: 2003, year_to: 2004, notes: 'VY Series II' },
];

// Add base fields to every row
const vehicles = rows.map(r => ({
  make: 'Holden',
  model: 'Commodore',
  series: 'VY',
  year_from: r.year_from ?? 2002,
  year_to: r.year_to ?? 2004,
  trim_code: r.trim_code,
  chassis: r.chassis,
  engine_code: r.engine_code,
  engine_litres: r.engine_litres,
  engine_config: r.engine_config,
  engine_kw: r.engine_kw,
  fuel_type: r.fuel_type,
  notes: r.notes ?? null,
}));

async function main() {
  console.log(`=== VY Commodore Insert ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);
  console.log(`${vehicles.length} rows to insert\n`);

  if (DRY_RUN) {
    vehicles.forEach(v => console.log(`  ${v.trim_code} ${v.chassis} ${v.engine_code} ${v.engine_kw}kW`));
    console.log('\nDry run complete — nothing written.');
    return;
  }

  // 1. Delete existing broad VY Commodore rows (those without trim_code)
  console.log('Deleting existing broad VY Commodore rows...');
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VY&trim_code=is.null`,
    { method: 'DELETE', headers: h }
  );
  console.log(`  Delete status: ${delRes.status}`);

  // 2. Pre-fetch existing to deduplicate
  const existRes = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?make=eq.Holden&model=eq.Commodore&series=eq.VY&select=engine_code,trim_code,fuel_type,year_from,year_to,chassis`,
    { headers: h }
  );
  const existing = await existRes.json();
  const existKeys = new Set(existing.map(v =>
    `${v.engine_code}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}|${v.year_from}|${v.year_to}|${v.chassis ?? ''}`
  ));

  const newRows = vehicles.filter(v => {
    const key = `${v.engine_code}|${v.trim_code ?? ''}|${v.fuel_type ?? ''}|${v.year_from}|${v.year_to}|${v.chassis ?? ''}`;
    return !existKeys.has(key);
  });

  console.log(`  ${vehicles.length - newRows.length} already exist, inserting ${newRows.length} new rows...`);
  if (newRows.length === 0) { console.log('Nothing new to insert.'); return; }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(newRows),
  });

  if (!res.ok) {
    console.error('Insert failed:', res.status, await res.text());
    return;
  }

  const inserted = await res.json();
  console.log(`Inserted ${inserted.length} rows.\n`);
  inserted.forEach(v => console.log(`  ${v.trim_code} ${v.chassis} ${v.engine_code} ${v.engine_kw}kW`));
  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
