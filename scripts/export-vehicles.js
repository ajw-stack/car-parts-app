#!/usr/bin/env node
// Export vehicles table to CSV for manual editing
// Usage: node scripts/export-vehicles.js [output.csv]

const fs   = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const COLUMNS = [
  'id', 'delete',
  'make', 'model', 'series', 'manufacturer_code', 'trim_code', 'grade',
  'month_from', 'year_from', 'month_to', 'year_to',
  'engine_code', 'engine_litres', 'engine_kw', 'engine_config',
  'engine_valves', 'camshaft_setup', 'fuel_type', 'fuel_delivery',
  'chassis', 'drive_train', 'transmission', 'country_of_manufacture', 'notes',
];

// 'delete' is a spreadsheet-only column — not in the DB, so exclude from fetch
const DB_COLUMNS = COLUMNS.filter(c => c !== 'delete');

const outFile = process.argv[2] || `vehicles-export-${new Date().toISOString().slice(0,10)}.csv`;

async function fetchAll() {
  const PAGE = 1000;
  let rows = [];
  let from = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/vehicles?select=${DB_COLUMNS.join(',')}&order=make.asc,model.asc,year_from.asc&offset=${from}&limit=${PAGE}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error('Fetch failed:', await res.text());
      process.exit(1);
    }
    const page = await res.json();
    rows = rows.concat(page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

(async () => {
  console.log('Fetching vehicles...');
  const rows = await fetchAll();
  console.log(`  ${rows.length} rows fetched`);

  // Add empty 'delete' column to each row for the spreadsheet
  const rowsWithDelete = rows.map(r => ({ ...r, delete: '' }));
  const csv = stringify(rowsWithDelete, { header: true, columns: COLUMNS });
  fs.writeFileSync(outFile, csv, 'utf8');
  console.log(`Exported to: ${outFile}`);
})();
