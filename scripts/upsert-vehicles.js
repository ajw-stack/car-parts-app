#!/usr/bin/env node
// Upsert vehicles from a CSV back into Supabase.
// SAFE: blank cells are ignored — they will NOT overwrite existing Supabase data.
// Only cells you have filled in will be written.
// To intentionally clear a field, type NULL (uppercase) in the cell.
// To delete a row, type yes in the `delete` column — the row will be removed from Supabase.
// Rows with an `id` are updated; rows without an `id` are inserted as new.
//
// Usage:
//   node scripts/upsert-vehicles.js <file.csv> [--dry-run]

const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvArg  = process.argv.find(a => a.endsWith('.csv'));
const DRY_RUN = process.argv.includes('--dry-run');

if (!csvArg) {
  console.error('Usage: node scripts/upsert-vehicles.js <file.csv> [--dry-run]');
  process.exit(1);
}

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

const baseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ─── Type coercion ────────────────────────────────────────────────────────────
const INTEGER_COLS = ['month_from', 'year_from', 'month_to', 'year_to', 'engine_kw', 'engine_valves', 'seats', 'doors', 'transmission_speeds'];
const DECIMAL_COLS = ['engine_litres'];

function coerceValue(col, raw) {
  const v = typeof raw === 'string' ? raw.trim() : raw;
  if (v === '' || v === null || v === undefined) return undefined; // blank = skip, no change
  if (v.toUpperCase() === 'NULL') return null;                    // NULL = explicitly clear the field
  if (col === 'year_to' && v.toLowerCase() === 'current') return 0;
  if (INTEGER_COLS.includes(col)) return Number(v);
  if (DECIMAL_COLS.includes(col)) return parseFloat(v);
  return v;
}

// Build a payload containing only non-blank fields from a CSV row.
function buildPayload(row) {
  const payload = {};
  for (const [col, raw] of Object.entries(row)) {
    if (col === 'id') continue;
    const val = coerceValue(col, raw);
    if (val !== undefined) payload[col] = val;
  }
  return payload;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function patchRow(id, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PATCH ${id} failed: ${await res.text()}`);
}

async function insertRow(payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`INSERT failed: ${await res.text()}`);
}

async function deleteRow(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`, {
    method: 'DELETE',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
  });
  if (!res.ok) throw new Error(`DELETE ${id} failed: ${await res.text()}`);
}

// Run up to `limit` promises concurrently.
async function pool(tasks, limit = 10) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const raw = fs.readFileSync(csvArg, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Loaded ${records.length} rows from ${csvArg}`);
  if (DRY_RUN) console.log('DRY RUN — no changes will be written\n');

  const toDelete = records.filter(r => r.id && r.id.trim() && (r.delete ?? '').trim().toLowerCase() === 'yes');
  const toUpdate = records.filter(r => r.id && r.id.trim() && (r.delete ?? '').trim().toLowerCase() !== 'yes');
  const toInsert = records.filter(r => !r.id || !r.id.trim());

  if (toDelete.length) {
    console.log(`\n⚠️  ${toDelete.length} row(s) marked for deletion:`);
    for (const r of toDelete) {
      console.log(`   ${r.id}  ${r.make} ${r.model} ${r.series ?? ''} ${r.year_from ?? ''}`);
    }
    if (!DRY_RUN) {
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => rl.question('\nType DELETE to confirm, or anything else to abort: ', ans => {
        rl.close();
        if (ans.trim() !== 'DELETE') {
          console.log('Aborted — no rows deleted.');
          process.exit(0);
        }
        resolve();
      }));
    }
  }

  let done = 0;
  let skipped = 0;

  const deleteTasks = toDelete.map(row => async () => {
    if (!DRY_RUN) await deleteRow(row.id.trim());
    done++;
    process.stdout.write(`\r  ${done}/${records.length} processed...`);
  });

  const updateTasks = toUpdate.map(row => async () => {
    const payload = buildPayload(row);
    if (Object.keys(payload).length === 0) { skipped++; done++; return; }
    if (!DRY_RUN) await patchRow(row.id.trim(), payload);
    done++;
    process.stdout.write(`\r  ${done}/${records.length} processed...`);
  });

  const insertTasks = toInsert.map(row => async () => {
    const payload = buildPayload(row);
    if (!DRY_RUN) await insertRow(payload);
    done++;
    process.stdout.write(`\r  ${done}/${records.length} processed...`);
  });

  await pool(deleteTasks, 10);
  await pool(updateTasks, 10);
  await pool(insertTasks, 10);

  console.log(`\nDone.`);
  console.log(`  Deleted : ${toDelete.length} rows`);
  console.log(`  Updated : ${toUpdate.length - skipped} rows (${skipped} had no changes)`);
  console.log(`  Inserted: ${toInsert.length} rows`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
})();
