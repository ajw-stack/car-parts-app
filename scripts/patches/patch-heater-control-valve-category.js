#!/usr/bin/env node
// Creates a "Heater Control Valve" category in part_categories (if missing)
// and reclassifies all parts with category IN ("Heater Control Valve", "Coolant Control Valve")
// away from Water Pump into the new category.

const fs   = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const HDRS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: HDRS, ...opts });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function main() {
  // 1. Check if "Heater Control Valve" category already exists
  const existing = await api('/part_categories?name=eq.Heater+Control+Valve&select=id,name');
  let categoryId;

  if (existing && existing.length > 0) {
    categoryId = existing[0].id;
    console.log(`Category already exists: id=${categoryId}`);
  } else {
    // 2. Insert new category (auto-generated id)
    const inserted = await api('/part_categories?select=id,name', {
      method: 'POST',
      headers: { ...HDRS, Prefer: 'return=representation' },
      body: JSON.stringify({
        name:       'Heater Control Valve',
        sort_order: 145,
      }),
    });
    categoryId = inserted[0].id;
    console.log(`Created new category: id=${categoryId}, name="Heater Control Valve"`);
  }

  // 4. Find all parts with category IN ("Heater Control Valve", "Coolant Control Valve")
  const partsHCV = await api("/parts?category=eq.Heater+Control+Valve&select=id,brand,part_number,category_id");
  const partsCCV = await api("/parts?category=eq.Coolant+Control+Valve&select=id,brand,part_number,category_id");
  const parts = [...(partsHCV ?? []), ...(partsCCV ?? [])];

  console.log(`\nFound ${parts.length} parts to reclassify:`);
  parts.forEach(p => console.log(`  ${p.brand} ${p.part_number}  (current category_id=${p.category_id})`));

  if (parts.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  // 5. Update each part
  let updated = 0;
  for (const p of parts) {
    await api(`/parts?id=eq.${p.id}`, {
      method:  'PATCH',
      headers: { ...HDRS, Prefer: 'return=minimal' },
      body:    JSON.stringify({ category_id: categoryId }),
    });
    updated++;
    process.stdout.write(`\r  Updated ${updated}/${parts.length}`);
  }
  console.log(`\n\nDone. ${updated} parts now point to category_id=${categoryId} ("Heater Control Valve")`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
