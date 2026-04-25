#!/usr/bin/env node
// Fixes brake part categories:
// 1. Creates missing "Brake Calipers" and "Master Cylinders" part_categories rows
// 2. Assigns correct category_id to all parts currently sitting at null

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

async function getAll(urlPath) {
  const all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const res = await fetch(`${BASE}/rest/v1${urlPath}`, {
      headers: { ...HDRS, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function ensureCategory(name, sortOrder) {
  const existing = await api(`/part_categories?name=eq.${encodeURIComponent(name)}&select=id,name`);
  if (existing && existing.length > 0) {
    console.log(`  Category "${name}" already exists: id=${existing[0].id}`);
    return existing[0].id;
  }
  const inserted = await api('/part_categories?select=id,name', {
    method: 'POST',
    headers: { ...HDRS, Prefer: 'return=representation' },
    body: JSON.stringify({ name, sort_order: sortOrder }),
  });
  console.log(`  Created category "${name}": id=${inserted[0].id}`);
  return inserted[0].id;
}

async function patchByCategory(categoryText, newCategoryId, label) {
  // Find parts with this category text that have wrong or null category_id
  const parts = await getAll(`/parts?category=eq.${encodeURIComponent(categoryText)}&select=id,category,category_id`);
  const toFix = parts.filter(p => p.category_id !== newCategoryId);
  if (toFix.length === 0) {
    console.log(`  ${label}: all ${parts.length} already correct`);
    return 0;
  }
  let done = 0;
  for (const p of toFix) {
    await api(`/parts?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { ...HDRS, Prefer: 'return=minimal' },
      body: JSON.stringify({ category_id: newCategoryId }),
    });
    done++;
    if (done % 50 === 0) process.stdout.write(`\r    ${label}: ${done}/${toFix.length}`);
  }
  process.stdout.write(`\r    ${label}: ${done}/${toFix.length} fixed\n`);
  return done;
}

async function main() {
  console.log('=== Brake Category Patch ===\n');

  // ── 1. Ensure new categories exist ─────────────────────────────────────────
  console.log('Step 1: Ensure categories exist...');
  const caliperCatId    = await ensureCategory('Brake Calipers',   320);
  const masterCylCatId  = await ensureCategory('Master Cylinders', 330);

  // Known existing IDs (from DB audit)
  const BRAKE_ROTOR_ID  = 31;
  const BRAKE_PAD_ID    = 28;
  const BRAKE_SHOE_ID   = 29;
  const BRAKE_DRUM_ID   = 30;
  const BRAKE_HOSE_ID   = 33;
  const HP_KIT_ID       = 34;  // "High Performance Brake Kit" / Brake Upgrade Kits

  // ── 2. Patch brake parts with null category_id ─────────────────────────────
  console.log('\nStep 2: Fixing category_id for brake parts...');

  // Rotors
  await patchByCategory('Brake discs', BRAKE_ROTOR_ID, 'Brake discs → Brake Rotor');

  // Pads
  await patchByCategory('Brake pads', BRAKE_PAD_ID, 'Brake pads → Brake Pad Set');
  await patchByCategory('Brake pad accessories', BRAKE_PAD_ID, 'Brake pad accessories → Brake Pad Set');
  await patchByCategory('Brake Pad Set', BRAKE_PAD_ID, 'Brake Pad Set (null) → Brake Pad Set');

  // Shoes
  await patchByCategory('Brake Shoe Set', BRAKE_SHOE_ID, 'Brake Shoe Set (null) → Brake Shoe Set');
  await patchByCategory('Shoes', BRAKE_SHOE_ID, 'Shoes → Brake Shoe Set');

  // Drums
  await patchByCategory('Drums', BRAKE_DRUM_ID, 'Drums → Brake Drum');

  // Upgrade kits
  await patchByCategory('UPGRADE GT kit', HP_KIT_ID, 'UPGRADE GT kit → High Performance Brake Kit');
  await patchByCategory('Disc and Pad Kit', HP_KIT_ID, 'Disc and Pad Kit → High Performance Brake Kit');

  // Calipers
  await patchByCategory('Caliper', caliperCatId, 'Caliper → Brake Calipers');
  await patchByCategory('LCV calipers', caliperCatId, 'LCV calipers → Brake Calipers');
  await patchByCategory('LCV caliper bracket', caliperCatId, 'LCV caliper bracket → Brake Calipers');

  console.log('\nDone!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
