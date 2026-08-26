#!/usr/bin/env node
// Splits "Turbo Petrol" / "Turbo Diesel" fuel_type values into:
//   fuel_type = Petrol / Diesel  +  induction = Turbocharged
// Also handles MHEV variants.
// Reads the CSV, updates in memory, writes back.
//
// Usage: node scripts/migrate-fuel-induction.js <file.csv>

const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csvArg = process.argv.find(a => a.endsWith('.csv'));
if (!csvArg) {
  console.error('Usage: node scripts/migrate-fuel-induction.js <file.csv>');
  process.exit(1);
}

const csvPath = path.resolve(csvArg);
const raw = fs.readFileSync(csvPath, 'utf8');

const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });

const MAPPINGS = [
  { from: 'Turbo Petrol',      fuel: 'Petrol',      induction: 'Turbocharged' },
  { from: 'Turbo Diesel',      fuel: 'Diesel',      induction: 'Turbocharged' },
  { from: 'Turbo Petrol MHEV', fuel: 'Petrol MHEV', induction: 'Turbocharged' },
  { from: 'Turbo Diesel MHEV', fuel: 'Diesel MHEV', induction: 'Turbocharged' },
];

let changed = 0;

for (const row of records) {
  const ft = (row.fuel_type ?? '').trim();
  const match = MAPPINGS.find(m => m.from === ft);
  if (match) {
    row.fuel_type = match.fuel;
    // Only set induction if currently blank
    if (!row.induction || row.induction.trim() === '') {
      row.induction = match.induction;
    }
    changed++;
  }
}

const out = stringify(records, { header: true });
fs.writeFileSync(csvPath, out, 'utf8');

console.log(`Done. ${changed} rows updated. CSV saved.`);
