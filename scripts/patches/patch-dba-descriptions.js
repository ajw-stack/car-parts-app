#!/usr/bin/env node
// Patch description onto existing DBA parts (rotor dimensions)
// Usage: node scripts/patch-dba-descriptions.js [--dry-run]

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

function desc({ type, a, b, c, d, e, f }) {
  const minPart = d ? ` (min ${d}mm)` : '';
  return `Ø${a}mm ${type} | Ht ${b}mm | ${c}mm thick${minPart} | CHD ${e}mm | ${f}-bolt`;
}

// part_number → dimension description
const DESCRIPTIONS = {
  'DBA665':   desc({ type: 'Vented', a: 284, b: 44, c: 22, d: 20.2, e: 59, f: 4 }),
  'DBA2405':  desc({ type: 'Solid',  a: 240, b: 40, c: 11, d: 9.2,  e: 59, f: 4 }),
  'DBA2964E': desc({ type: 'Vented', a: 280, b: 44, c: 22, d: 20.2, e: 55, f: 4 }),
  'DBA2965E': desc({ type: 'Solid',  a: 280, b: 35.6, c: 9.5, d: 7.5, e: 55, f: 4 }),
};

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH DBA DESCRIPTIONS ===');

  const partNums = Object.keys(DESCRIPTIONS);
  const parts = await api(`/parts?brand=eq.DBA&part_number=in.(${partNums.join(',')})&select=id,part_number`);
  console.log(`Found ${parts.length} parts`);

  for (const p of parts) {
    const description = DESCRIPTIONS[p.part_number];
    if (!description) continue;
    if (DRY_RUN) { console.log(`  ${p.part_number} → ${description}`); continue; }
    await api(`/parts?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { ...hdrs, Prefer: 'return=minimal' },
      body: JSON.stringify({ description }),
    });
    console.log(`  ✓ ${p.part_number}`);
  }
  console.log('Done.');
}
main().catch(err => { console.error(err); process.exit(1); });
