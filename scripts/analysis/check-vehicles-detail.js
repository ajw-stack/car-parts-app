// check-vehicles-detail.js
// Task 1: TRUE duplicates (identical on ALL fields including notes, engine_config, engine_code, chassis)
// Task 2: Full capitalisation issues with counts, grouped by make

const fs = require('fs');
const path = require('path');

// --- Load .env.local manually ---
function loadEnv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    vars[key] = val;
  }
  return vars;
}

const envPath = path.resolve(__dirname, '../../.env.local');
const env = loadEnv(envPath);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// --- Fetch all vehicles in batches of 1000 ---
async function fetchAllVehicles() {
  const columns = 'id,make,model,series,year_from,year_to,month_from,month_to,engine_litres,engine_kw,engine_config,fuel_type,trim_code,engine_code,notes,chassis';
  const batchSize = 1000;
  let allVehicles = [];
  let offset = 0;

  while (true) {
    const rangeStart = offset;
    const rangeEnd = offset + batchSize - 1;
    const url = `${SUPABASE_URL}/rest/v1/vehicles?select=${columns}&order=id.asc`;

    const res = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Range': `${rangeStart}-${rangeEnd}`,
        'Range-Unit': 'items',
        'Prefer': 'count=none',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP ${res.status}: ${text}`);
      process.exit(1);
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    allVehicles = allVehicles.concat(batch);
    console.error(`  Fetched batch ${rangeStart}-${rangeEnd}: got ${batch.length} rows (total so far: ${allVehicles.length})`);

    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return allVehicles;
}

// --- Task 1: TRUE duplicates (all fields identical) ---
function findTrueDuplicates(vehicles) {
  const groups = {};

  for (const v of vehicles) {
    const key = [
      v.make          ?? '',
      v.model         ?? '',
      v.series        ?? '',
      String(v.year_from  ?? ''),
      String(v.year_to    ?? ''),
      String(v.month_from ?? ''),
      String(v.month_to   ?? ''),
      String(v.engine_litres ?? ''),
      String(v.engine_kw   ?? ''),
      v.engine_config ?? '',
      v.fuel_type     ?? '',
      v.trim_code     ?? '',
      v.engine_code   ?? '',
      v.notes         ?? '',
      v.chassis       ?? '',
    ].join('|||');

    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }

  return Object.entries(groups)
    .filter(([, members]) => members.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
}

// --- Task 2: Capitalisation checks ---

// Models where lowercase start is CORRECT
// Format: make (lowercased) -> Set of correct-form model names
const CORRECT_LOWERCASE_MODELS = {
  'hyundai': new Set(['i20', 'i30', 'i40', 'i45', 'ix35', 'i10', 'i30n', 'i20n', 'iLoad', 'iMax']),
  'toyota':  new Set(['bB']),
};

function isKnownCorrectLowercase(make, model) {
  const set = CORRECT_LOWERCASE_MODELS[make.toLowerCase()];
  if (!set) return false;
  return set.has(model);
}

function analyseCapitalisation(vehicles) {
  // --- Makes: check for inconsistent capitalisation across all vehicles ---
  // Build map: make_lower -> [distinct make strings]
  const makeVariants = {};
  for (const v of vehicles) {
    if (!v.make) continue;
    const lower = v.make.toLowerCase();
    if (!makeVariants[lower]) makeVariants[lower] = {};
    makeVariants[lower][v.make] = (makeVariants[lower][v.make] || 0) + 1;
  }

  const makeInconsistencies = [];
  for (const [, variants] of Object.entries(makeVariants)) {
    if (Object.keys(variants).length > 1) {
      makeInconsistencies.push(variants);
    }
  }

  // --- Models: group by make ---
  // Build: makeModelCounts[make][model] = count
  const makeModelCounts = {};
  for (const v of vehicles) {
    if (!v.make || !v.model) continue;
    if (!makeModelCounts[v.make]) makeModelCounts[v.make] = {};
    makeModelCounts[v.make][v.model] = (makeModelCounts[v.make][v.model] || 0) + 1;
  }

  // For each make, find models that collide when lowercased
  // Separate: CORRECT lowercase models vs TRUE inconsistencies
  const modelInconsistencies = {}; // make -> [{variants: {name: count}, isCorrectLower: bool}]
  const correctLowercaseFound = {}; // make -> [{name, count}]

  for (const [make, modelCounts] of Object.entries(makeModelCounts)) {
    const normalized = {}; // lower -> {name: count}
    for (const [model, count] of Object.entries(modelCounts)) {
      const lower = model.toLowerCase();
      if (!normalized[lower]) normalized[lower] = {};
      normalized[lower][model] = count;
    }

    for (const [lower, variants] of Object.entries(normalized)) {
      const variantNames = Object.keys(variants);

      if (variantNames.length === 1) {
        // Only one capitalisation — check if it's a correct-lowercase model
        const [singleName] = variantNames;
        if (isKnownCorrectLowercase(make, singleName)) {
          if (!correctLowercaseFound[make]) correctLowercaseFound[make] = [];
          correctLowercaseFound[make].push({ name: singleName, count: variants[singleName] });
        }
        // Also check: single variant starting with unexpected lowercase (not in known-correct list)
        else if (singleName[0] !== singleName[0].toUpperCase() && !isKnownCorrectLowercase(make, singleName)) {
          if (!modelInconsistencies[make]) modelInconsistencies[make] = [];
          modelInconsistencies[make].push({ variants, note: 'unexpected lowercase' });
        }
        continue;
      }

      // Multiple variants — determine if any is a known-correct lowercase
      const hasKnownCorrect = variantNames.some(n => isKnownCorrectLowercase(make, n));

      if (hasKnownCorrect) {
        // Flag separately as correct-lowercase confirmed
        if (!correctLowercaseFound[make]) correctLowercaseFound[make] = [];
        for (const [name, count] of Object.entries(variants)) {
          correctLowercaseFound[make].push({ name, count, note: 'correct-lowercase variant' });
        }
      } else {
        if (!modelInconsistencies[make]) modelInconsistencies[make] = [];
        modelInconsistencies[make].push({ variants });
      }
    }
  }

  return { makeInconsistencies, modelInconsistencies, correctLowercaseFound };
}

// --- Main ---
async function main() {
  console.error('Fetching all vehicles...');
  const vehicles = await fetchAllVehicles();
  console.error(`\nTotal vehicles fetched: ${vehicles.length}`);

  // ==================
  // TASK 1: TRUE DUPLICATES
  // ==================
  const dupGroups = findTrueDuplicates(vehicles);

  console.log('='.repeat(70));
  console.log('TASK 1: TRUE DUPLICATES (all fields identical)');
  console.log('='.repeat(70));

  if (dupGroups.length === 0) {
    console.log('\nNo true duplicates found.');
  } else {
    let totalDupRows = 0;
    for (const [, members] of dupGroups) {
      totalDupRows += members.length;
      const f = members[0];
      console.log(`\nGroup (${members.length} rows):`);
      console.log(`  Make: ${f.make}  Model: ${f.model}  Series: ${f.series ?? '(null)'}`);
      console.log(`  Years: ${f.year_from ?? '?'}-${f.year_to ?? '?'}  Months: ${f.month_from ?? '?'}-${f.month_to ?? '?'}`);
      console.log(`  Eng: ${f.engine_litres ?? '?'}L  ${f.engine_kw ?? '?'}kW  Config: ${f.engine_config ?? 'null'}  Code: ${f.engine_code ?? 'null'}`);
      console.log(`  Fuel: ${f.fuel_type ?? 'null'}  Trim: ${f.trim_code ?? 'null'}  Chassis: ${f.chassis ?? 'null'}`);
      console.log(`  Notes: ${f.notes ?? '(null)'}`);
      console.log(`  IDs: ${members.map(v => v.id).join(', ')}`);
    }
    console.log(`\nTOTAL TRUE DUPLICATE GROUPS: ${dupGroups.length}  (${totalDupRows} rows involved)`);
  }

  // ==================
  // TASK 2: CAPITALISATION ISSUES
  // ==================
  const { makeInconsistencies, modelInconsistencies, correctLowercaseFound } = analyseCapitalisation(vehicles);

  console.log('\n' + '='.repeat(70));
  console.log('TASK 2: CAPITALISATION ISSUES');
  console.log('='.repeat(70));

  // -- Makes --
  console.log('\n--- MAKES WITH INCONSISTENT CAPITALISATION ---');
  if (makeInconsistencies.length === 0) {
    console.log('  (none)');
  } else {
    for (const variants of makeInconsistencies) {
      const parts = Object.entries(variants).map(([name, count]) => `"${name}" (${count} rows)`);
      console.log(`  ${parts.join(' vs ')}`);
    }
  }

  // -- Models by make --
  console.log('\n--- MODELS WITH INCONSISTENT CAPITALISATION (grouped by make) ---');

  const makesWithIssues = Object.keys(modelInconsistencies).sort();

  if (makesWithIssues.length === 0) {
    console.log('  (none)');
  } else {
    for (const make of makesWithIssues) {
      console.log(`\nMake: ${make}`);
      for (const issue of modelInconsistencies[make]) {
        const parts = Object.entries(issue.variants)
          .sort((a, b) => b[1] - a[1]) // most rows first
          .map(([name, count]) => `"${name}" (${count} rows)`);
        const note = issue.note ? `  [${issue.note}]` : '';
        console.log(`  ${parts.join(' vs ')}${note}`);
      }
    }
  }

  // -- Correct lowercase models (confirmed OK) --
  console.log('\n--- CORRECT LOWERCASE MODELS (not errors, listed for reference) ---');
  const makesWithCorrect = Object.keys(correctLowercaseFound).sort();
  if (makesWithCorrect.length === 0) {
    console.log('  (none found)');
  } else {
    for (const make of makesWithCorrect) {
      console.log(`\nMake: ${make}`);
      // De-duplicate by name
      const seen = {};
      for (const entry of correctLowercaseFound[make]) {
        if (!seen[entry.name]) seen[entry.name] = { count: 0, note: entry.note };
        seen[entry.name].count += entry.count;
      }
      for (const [name, info] of Object.entries(seen)) {
        const note = info.note ? `  [${info.note}]` : '';
        console.log(`  "${name}" (${info.count} rows)${note}`);
      }
    }
  }

  const totalMakeIssues = makeInconsistencies.length;
  const totalModelIssues = makesWithIssues.reduce((sum, make) => sum + modelInconsistencies[make].length, 0);
  console.log(`\nSUMMARY: ${totalMakeIssues} make inconsistency groups, ${totalModelIssues} model inconsistency groups across ${makesWithIssues.length} makes`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
