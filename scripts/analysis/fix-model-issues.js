#!/usr/bin/env node
// Fix model column issues across the vehicles table:
//
//  1. Capitalisation: 329 vehicles with ALL-UPPERCASE model names → Title Case
//  2. BMW chassis codes: E23/E30/.../F30 → proper series names (e.g. "3 Series"),
//     chassis code moved to series column
//  3. Hyundai I30CW → "i30 CW"
//  4. Delete 26 orphaned shell records (model=DRUM/AUTO/COUPE/HYBRID/CDI/SEDAN/MY01,
//     zero fitments, zero engine/series data) — cannot be corrected without knowing the actual model
//
// Usage: node scripts/analysis/fix-model-issues.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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
      `${SUPABASE_URL}/rest/v1/vehicles?select=id,make,model,series,chassis,year_from,year_to,engine_config,fuel_type&order=make.asc,model.asc&limit=${PAGE}&offset=${offset}`,
      { headers }
    );
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function patch(id, body) {
  if (DRY_RUN) return { ok: true, status: 'DRY' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text() };
}

async function del(id) {
  if (DRY_RUN) return { ok: true, status: 'DRY' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  });
  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text() };
}

// ─── 1. Capitalisation map ─────────────────────────────────────────────────────
const CAP_MAP = {
  'Chevrolet':  { BLAZER:'Blazer', CAMARO:'Camaro', COBALT:'Cobalt', IMPALA:'Impala' },
  'Chrysler':   { NEON:'Neon', VIPER:'Viper' },
  'Daewoo':     { KALOS:'Kalos', NUBIRA:'Nubira', TACUMA:'Tacuma' },
  'Daihatsu':   { ALTIS:'Altis', COPEN:'Copen', FEROZA:'Feroza', MOVE:'Move', SIRION:'Sirion', TERIOS:'Terios', YRV:'YRV' },
  'Dodge':      { MAGNUM:'Magnum', NEON:'Neon', NITRO:'Nitro', RAM:'Ram', VIPER:'Viper' },
  'Fiat':       { BRAVO:'Bravo', CROMA:'Croma', DOBLO:'Doblo', DUCATO:'Ducato', MAREA:'Marea', PANDA:'Panda', SCUDO:'Scudo' },
  'Holden HSV': { MALIBU:'Malibu', MONARO:'Monaro', NOVA:'Nova', PIAZZA:'Piazza' },
  'Isuzu':      { RODEO:'Rodeo' },
  'Kia':        { CERATO:'Cerato', CREDOS:'Credos', MENTOR:'Mentor', OPTIMA:'Optima', PREGIO:'Pregio', RONDO:'Rondo', SEDONA:'Sedona', SOUL:'Soul' },
  'Lexus':      { SOARER:'Soarer' },
  'Lotus':      { EVORA:'Evora', EXIGE:'Exige' },
  'Mitsubishi': { COUPE:'Coupe' },
  'Nissan':     { STANZA:'Stanza', TERANO:'Terrano', XTERRA:'Xterra' },
  'Opel':       { ASTRA:'Astra', CORSA:'Corsa', ZAFIRA:'Zafira' },
  'Pontiac':    { VIBE:'Vibe' },
  'Porsche':    { CAYMAN:'Cayman' },
  'Renault':    { CAPTUR:'Captur', CLIO:'Clio', KANGOO:'Kangoo', KOLEOS:'Koleos', MASTER:'Master', MEGANE:'Megane', SCENIC:'Scenic', TRAFIC:'Trafic' },
  'Skoda':      { ATECA:'Ateca', FABIA:'Fabia', KODIAQ:'Kodiaq', RAPID:'Rapid', SUPERB:'Superb' },
  'Smart':      { FORTWO:'fortwo' },
  'SsangYong':  { ACTYON:'Actyon', KYRON:'Kyron', MUSSO:'Musso', REXTON:'Rexton' },
  'Suzuki':     { ALTO:'Alto', BALENO:'Baleno', LIANA:'Liana', SWIFT:'Swift', VITARA:'Vitara' },
  'Toyota':     { ESTIMA:'Estima', MIRA:'Mira', SECA:'Seca' },
  'Volkswagen': { AMAROK:'Amarok', ARTEON:'Arteon', BORA:'Bora', EOS:'Eos', KOMBI:'Kombi', PASSAT:'Passat', POLO:'Polo', TIGUAN:'Tiguan', VENTO:'Vento' },
};

// ─── 2. BMW chassis code → model name ─────────────────────────────────────────
// Each entry: chassisCode → { model, chassis (body hint) }
const BMW_CHASSIS = {
  E23: { model: '7 Series' },
  E30: { model: '3 Series' },
  E31: { model: '8 Series' },
  E32: { model: '7 Series' },
  E34: { model: '5 Series' },
  E36: { model: '3 Series' },
  E39: { model: '5 Series' },
  E46: { model: '3 Series' },
  E81: { model: '1 Series' },
  E87: { model: '1 Series' },
  E90: { model: '3 Series' },
  E91: { model: '3 Series' },
  E92: { model: '3 Series' },
  E93: { model: '3 Series' },
  F30: { model: '3 Series' },
};

// ─── 4. Orphaned junk records to delete ───────────────────────────────────────
// model = body/fuel/brake/drivetrain type, no fitments, no engine data, no series
const JUNK_IDS = [
  // BMW AUTO / COUPE
  '44eb2970-b1e6-49ae-bb2f-ea5851c9644c',
  'ec5bb9d3-5b4c-4ce6-b0f4-d5aa39f89a28',
  // Fiat COUPE (all-uppercase, no data — distinct from title-case Fiat Coupe)
  '90b4d311-3248-4300-84c1-453e52fa4404',
  // Honda HYBRID
  '75b43852-9708-45d2-9737-099316faa753',
  // Mazda DRUM
  'de38013b-c32f-4517-9455-8174e83b870d',
  // Mercedes-Benz CDI (×6)
  '1f1944de-edc4-44f0-9785-72d3c82f79cd',
  'f70e7ac8-85be-4fca-85b3-05a3ce3b185e',
  '7d82ee99-1b63-4cc4-9a20-07f6ee04ab66',
  'ee1d7f0d-41e6-4da4-8c0f-d75fa456ce6a',
  '672b06d4-e196-4ead-9bcf-22daa855aa2d',
  '6ee17cd9-134d-40ce-b304-8c2f66a26e6a',
  // Mercedes-Benz SEDAN
  '8668920d-e6b7-4120-8dc9-10dcddc5b415',
  // Mitsubishi COUPE (×8) — "COUPE" uppercase, no data (different from title-case Mitsubishi Coupe)
  '0addf4f8-292e-432e-a796-b5c23bfcaba7',
  '630eee8e-ba6f-4497-ad90-8487a8341a94',
  '3881bc1e-9240-4259-a1b6-74c77dabf80a',
  'e74a6e95-a9a5-4223-9dae-2a0cb5ce5ad4',
  '3f45fa2d-998e-448c-8f9b-8d7ca7fd8a67',
  '23653d06-082b-4422-a7e0-a6dee7afebb6',
  'ed5b1925-4997-4b7f-99f7-d80d4d274b51',
  '11d53ee9-da27-4ca1-9956-ee951fe47f74',
  // Mitsubishi DRUM (×2)
  'c315f154-d273-47cc-b95a-88e497f2f920',
  'ad42d19a-4923-45df-a956-fb2819d87432',
  // Subaru MY01
  'c8ae297b-1acc-457b-a576-f221d857fac7',
  // Toyota DRUM (×3)
  '33b6b5b6-fe03-4fd8-92e4-d54a014e580d',
  '6e051cac-c8b6-46bb-b9a8-eb3864038bcb',
  'e81d6acb-0245-4b93-a7bf-88d605d562fd',
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== FIX MODEL ISSUES ===');

  const all = await fetchAll();
  console.log(`Total vehicles: ${all.length}\n`);

  let capFixed = 0, capSkipped = 0;
  let bmwFixed = 0;
  let i30Fixed = 0;
  let deleted = 0;
  let errors = 0;

  // ── 1. Capitalisation ────────────────────────────────────────────────────────
  console.log('--- Step 1: Capitalisation fixes ---');
  for (const v of all) {
    const corrections = CAP_MAP[v.make];
    if (!corrections) continue;
    const correct = corrections[v.model];
    if (!correct) continue;

    console.log(`  ${v.make} "${v.model}" → "${correct}" [${v.id}]`);
    const r = await patch(v.id, { model: correct });
    if (r.status === 'DRY' || r.ok) {
      capFixed++;
    } else if (r.status === 409) {
      console.log(`    ↳ 409 conflict (record already exists with correct casing) — skipping`);
      capSkipped++;
    } else {
      console.log(`    ↳ ERROR ${r.status}: ${r.text}`);
      errors++;
    }
  }
  console.log(`Capitalisation: ${capFixed} fixed, ${capSkipped} skipped (already exist), ${errors} errors\n`);

  // ── 2. BMW chassis codes ─────────────────────────────────────────────────────
  console.log('--- Step 2: BMW chassis codes → series names ---');
  errors = 0;
  for (const v of all) {
    if (v.make !== 'BMW') continue;
    const mapping = BMW_CHASSIS[v.model];
    if (!mapping) continue;

    const chassisCode = v.model; // e.g. "E30"
    const newModel    = mapping.model; // e.g. "3 Series"
    const newSeries   = v.series || chassisCode; // put chassis code in series if series is blank

    console.log(`  BMW "${chassisCode}" → model="${newModel}", series="${newSeries}" [${v.id}]`);
    const r = await patch(v.id, { model: newModel, series: newSeries });
    if (r.status === 'DRY' || r.ok) {
      bmwFixed++;
    } else if (r.status === 409) {
      console.log(`    ↳ 409 conflict — "${newModel}" ${newSeries} already exists, skipping`);
    } else {
      console.log(`    ↳ ERROR ${r.status}: ${r.text}`);
      errors++;
    }
  }
  console.log(`BMW chassis codes: ${bmwFixed} fixed, ${errors} errors\n`);

  // ── 3. Hyundai I30CW → "i30 CW" ─────────────────────────────────────────────
  console.log('--- Step 3: Hyundai I30CW → "i30 CW" ---');
  errors = 0;
  for (const v of all) {
    if (v.make !== 'Hyundai') continue;
    if ((v.model || '').toUpperCase() !== 'I30CW') continue;

    console.log(`  Hyundai "I30CW" → "i30 CW" [${v.id}]`);
    const r = await patch(v.id, { model: 'i30 CW' });
    if (r.status === 'DRY' || r.ok) {
      i30Fixed++;
    } else {
      console.log(`    ↳ ERROR ${r.status}: ${r.text}`);
      errors++;
    }
  }
  console.log(`Hyundai I30CW: ${i30Fixed} fixed, ${errors} errors\n`);

  // ── 4. Delete orphaned junk records ──────────────────────────────────────────
  console.log('--- Step 4: Delete orphaned junk records (no fitments, wrong model field) ---');
  console.log('Note: Fiat Coupe (title case) and Hyundai Coupe are real models — kept.');
  errors = 0;
  for (const id of JUNK_IDS) {
    console.log(`  DELETE ${id}`);
    const r = await del(id);
    if (r.status === 'DRY' || r.ok) {
      deleted++;
    } else {
      console.log(`    ↳ ERROR ${r.status}: ${r.text}`);
      errors++;
    }
  }
  console.log(`Deleted: ${deleted}, errors: ${errors}\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Capitalisation fixed:  ${capFixed}`);
  console.log(`  BMW chassis resolved:  ${bmwFixed}`);
  console.log(`  Hyundai I30CW fixed:   ${i30Fixed}`);
  console.log(`  Junk records deleted:  ${deleted}`);
  console.log('='.repeat(50));
  console.log('\nNote: Hyundai "Coupe" (RD series, 1989-2002) was left untouched — it IS the correct model name.');
  console.log('Note: Mercedes-Benz AMG and 200K were left untouched — need manual verification of actual model name.');
}

main().catch(err => { console.error(err); process.exit(1); });
