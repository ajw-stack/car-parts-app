#!/usr/bin/env node
// Insert DBA rotor parts for Abarth from DBA Catalogue 2020
// Usage: node scripts/insert-dba-abarth.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
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

// ─── Vehicles ────────────────────────────────────────────────────────────────
// Source: DBA Catalogue 2020 — Abarth section
const VEHICLES = [
  {
    make: 'Abarth', model: '595', series: '312',
    year_from: 2016, year_to: null,
    engine_litres: 1.4, engine_config: 'I4', engine_kw: 103, fuel_type: 'ULP',
    notes: '1.4L x 103kW Turbo; 04/2016-on',
  },
  {
    make: 'Abarth', model: '595C', series: '312',
    year_from: 2016, year_to: null,
    engine_litres: 1.4, engine_config: 'I4', engine_kw: 103, fuel_type: 'ULP',
    notes: '1.4L x 103kW Turbo; 04/2016-on',
  },
  {
    make: 'Abarth', model: '124 Spider', series: null,
    year_from: 2016, year_to: null,
    engine_litres: 1.4, engine_config: 'I4', engine_kw: null, fuel_type: 'ULP',
    notes: '1.4L Turbo; 10/2016-on',
  },
];

// ─── DBA Rotor Parts ─────────────────────────────────────────────────────────
// Columns: A=Diameter, B=Original Height, C=Original Thickness,
//          D=Min Thickness, E=Centre Hole Dia, F=No. of Bolt Holes
// Series: Street OED = DBA Ranged (standard street)
const PARTS = [
  {
    part_number: 'DBA665',
    brand: 'DBA',
    name: 'Street Series Rotor',
    category: 'Brake Rotor',
    position: 'Front',
    specs: { type: 'Vented', diameter_mm: 284, height_mm: 44, thickness_mm: 22, min_thickness_mm: 20.2, centre_hole_dia_mm: 59, bolt_holes: 4, series: 'Street' },
    // Fits: Abarth 595 & 595C 312 1.4T 04/2016-on
    fitModels: ['595', '595C'],
  },
  {
    part_number: 'DBA2405',
    brand: 'DBA',
    name: 'Street Series Rotor',
    category: 'Brake Rotor',
    position: 'Rear',
    specs: { type: 'Solid', diameter_mm: 240, height_mm: 40, thickness_mm: 11, min_thickness_mm: 9.2, centre_hole_dia_mm: 59, bolt_holes: 4, series: 'Street' },
    fitModels: ['595', '595C'],
  },
  {
    part_number: 'DBA2964E',
    brand: 'DBA',
    name: 'Street Series Rotor',
    category: 'Brake Rotor',
    position: 'Front',
    specs: { type: 'Vented', diameter_mm: 280, height_mm: 44, thickness_mm: 22, min_thickness_mm: 20.2, centre_hole_dia_mm: 55, bolt_holes: 4, series: 'Street' },
    fitModels: ['124 Spider'],
  },
  {
    part_number: 'DBA2965E',
    brand: 'DBA',
    name: 'Street Series Rotor',
    category: 'Brake Rotor',
    position: 'Rear',
    specs: { type: 'Solid', diameter_mm: 280, height_mm: 35.6, thickness_mm: 9.5, min_thickness_mm: 7.5, centre_hole_dia_mm: 55, bolt_holes: 4, series: 'Street' },
    fitModels: ['124 Spider'],
  },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== INSERT DBA ABARTH ROTORS ===');

  // ── 1. Upsert vehicles ──────────────────────────────────────────────────────
  console.log('\n--- Vehicles ---');
  const existing = await api('/vehicles?make=eq.Abarth&select=id,model,series,year_from,engine_kw');
  const existingKeys = new Set(existing.map(v => `${v.model}|${v.series ?? ''}|${v.year_from}|${v.engine_kw ?? ''}`));

  const toInsert = VEHICLES.filter(v => {
    const key = `${v.model}|${v.series ?? ''}|${v.year_from}|${v.engine_kw ?? ''}`;
    return !existingKeys.has(key);
  });

  console.log(`Existing Abarth vehicles: ${existing.length} | To insert: ${toInsert.length}`);

  let allVehicles = [...existing];
  if (toInsert.length > 0 && !DRY_RUN) {
    const inserted = await api('/vehicles', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'return=representation' },
      body: JSON.stringify(toInsert),
    });
    for (const v of inserted) console.log(`  ✓ Inserted ${v.id}  Abarth ${v.model} ${v.series ?? ''} ${v.year_from}`);
    allVehicles = [...existing, ...inserted];
  } else if (DRY_RUN) {
    for (const v of toInsert) console.log(`  Would insert: Abarth ${v.model} ${v.series ?? ''} ${v.year_from}`);
  }

  // Re-fetch to get IDs of all Abarth vehicles
  if (!DRY_RUN) {
    allVehicles = await api('/vehicles?make=eq.Abarth&select=id,model,series,year_from');
  }
  console.log(`Total Abarth vehicles: ${allVehicles.length}`);

  // ── 2. Ensure "Brake Rotor" category ───────────────────────────────────────
  console.log('\n--- Categories ---');
  const cats = await api('/part_categories?select=id,name');
  const catMap = {};
  for (const c of cats) catMap[c.name] = c.id;

  if (!catMap['Brake Rotor']) {
    console.log('Creating "Brake Rotor" category...');
    if (!DRY_RUN) {
      const [newCat] = await api('/part_categories', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=representation' },
        body: JSON.stringify({ name: 'Brake Rotor' }),
      });
      catMap['Brake Rotor'] = newCat.id;
      console.log(`  Created id: ${newCat.id}`);
    } else {
      catMap['Brake Rotor'] = '(new)';
    }
  } else {
    console.log(`  "Brake Rotor" category id: ${catMap['Brake Rotor']}`);
  }

  // ── 3. Upsert parts ─────────────────────────────────────────────────────────
  console.log('\n--- Parts ---');
  const partRows = PARTS.map(p => ({
    brand:       p.brand,
    part_number: p.part_number,
    name:        `${p.name} ${p.position} ${p.specs.diameter_mm}mm ${p.specs.type}`,
    category:    p.category,
    category_id: catMap[p.category],
  }));

  let upsertedParts = partRows;
  if (!DRY_RUN) {
    upsertedParts = await api('/parts?on_conflict=brand,part_number', {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(partRows),
    });
    for (const p of upsertedParts) console.log(`  ✓ ${p.brand} ${p.part_number}  id=${p.id}`);
  } else {
    for (const p of partRows) console.log(`  Would upsert: ${p.brand} ${p.part_number} (${p.category})`);
  }

  const partIdMap = {};
  if (!DRY_RUN) {
    for (const p of upsertedParts) partIdMap[p.part_number] = p.id;
  } else {
    for (const p of PARTS) partIdMap[p.part_number] = `(id:${p.part_number})`;
  }

  // ── 4. Build fitments ───────────────────────────────────────────────────────
  console.log('\n--- Fitments ---');
  const fitments = [];

  for (const p of PARTS) {
    const partId = partIdMap[p.part_number];
    const matchingVehicles = allVehicles.filter(v => p.fitModels.includes(v.model));
    if (matchingVehicles.length === 0) {
      console.warn(`  WARNING: No vehicles matched for ${p.part_number} (models: ${p.fitModels.join(', ')})`);
    }
    for (const v of matchingVehicles) {
      fitments.push({ vehicle_id: v.id, part_id: partId, position: p.position, qty: 1 });
    }
  }

  console.log(`Fitments to create: ${fitments.length}`);

  if (!DRY_RUN && fitments.length > 0) {
    // Remove existing fitments first to avoid duplicates
    const partIds = [...new Set(fitments.map(f => f.part_id))];
    const existing = await api(`/vehicle_part_fitments?part_id=in.(${partIds.join(',')})&select=vehicle_id,part_id,position`);
    const existingSet = new Set(existing.map(f => `${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    const newFitments = fitments.filter(f => !existingSet.has(`${f.vehicle_id}|${f.part_id}|${f.position ?? ''}`));
    console.log(`New fitments: ${newFitments.length}`);
    if (newFitments.length > 0) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(newFitments),
      });
      for (const f of newFitments) {
        const v = allVehicles.find(v => v.id === f.vehicle_id);
        console.log(`  ✓ Abarth ${v?.model} ← ${f.part_id} (${f.position})`);
      }
    }
  } else if (DRY_RUN) {
    for (const f of fitments) {
      const v = allVehicles.find(v => v.id === f.vehicle_id);
      console.log(`  Abarth ${v?.model ?? f.vehicle_id} ← ${f.part_id} (${f.position})`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
