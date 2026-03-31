#!/usr/bin/env node
// Report on vehicles with missing or suspicious model names.
//
// Flags:
//   - NULL / empty model
//   - Model looks like a year (all digits, 4 chars, 1900-2100)
//   - Model looks like a chassis/series code only (all uppercase letters+digits, ≤6 chars, no spaces)
//   - Model is a bare number (e.g. "31", "36") — may be a series in wrong column
//   - Model contains only special characters / very short (<2 chars)
//
// Usage: node scripts/analysis/check-vehicle-models.js

const fs   = require('fs');
const path = require('path');

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchAll() {
  const PAGE = 1000;
  let offset = 0;
  const all = [];
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vehicles?select=id,make,model,series,year_from,year_to,engine_config,fuel_type&order=make.asc,model.asc&limit=${PAGE}&offset=${offset}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function classifyModel(model) {
  if (model === null || model === undefined || model === '') return 'MISSING';

  const m = model.trim();
  if (m === '') return 'MISSING';

  // Bare year
  if (/^\d{4}$/.test(m) && +m >= 1900 && +m <= 2100) return 'LOOKS_LIKE_YEAR';

  // Bare number (could be a series code that ended up in model column)
  if (/^\d+$/.test(m)) return 'BARE_NUMBER';

  // Single character or empty-ish
  if (m.length < 2) return 'TOO_SHORT';

  // Looks like a chassis/series code: all uppercase letters and digits, no spaces, ≤6 chars
  // Exclude known legitimate short model names: i20 i30 i40 i45 etc handled below
  if (/^[A-Z0-9]+$/.test(m) && m.length <= 6) return 'LOOKS_LIKE_CHASSIS_CODE';

  return null; // OK
}

async function main() {
  console.log('Fetching all vehicles...');
  const vehicles = await fetchAll();
  console.log(`Total vehicles: ${vehicles.length}\n`);

  const flagged = [];

  for (const v of vehicles) {
    const reason = classifyModel(v.model);
    if (reason) {
      flagged.push({ reason, ...v });
    }
  }

  if (flagged.length === 0) {
    console.log('No issues found. All vehicles have valid model names.');
    return;
  }

  // Group by reason
  const byReason = {};
  for (const f of flagged) {
    if (!byReason[f.reason]) byReason[f.reason] = [];
    byReason[f.reason].push(f);
  }

  for (const [reason, rows] of Object.entries(byReason)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FLAG: ${reason} (${rows.length} vehicles)`);
    console.log('='.repeat(60));
    for (const r of rows) {
      const modelStr = r.model === null ? 'NULL' : `"${r.model}"`;
      console.log(`  [${r.id}] ${r.make} | model=${modelStr} | series="${r.series ?? ''}" | ${r.year_from ?? '?'}-${r.year_to ?? 'ON'} | ${r.engine_config ?? ''} ${r.fuel_type ?? ''}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL FLAGGED: ${flagged.length} vehicles`);
  console.log('='.repeat(60));
}

main().catch(err => { console.error(err); process.exit(1); });
