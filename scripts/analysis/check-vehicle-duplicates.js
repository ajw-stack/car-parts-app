// check-vehicle-duplicates.js
// Fetches all vehicles from Supabase and reports:
//   1. Exact duplicates (by key fields)
//   2. Capitalization issues in make/model

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
  const columns = 'id,make,model,series,year_from,year_to,engine_litres,engine_kw,engine_config,fuel_type,trim_code,engine_code,notes';
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

// --- Duplicate detection ---
function findDuplicates(vehicles) {
  const groups = {};

  for (const v of vehicles) {
    const key = [
      v.make       ?? '',
      v.model      ?? '',
      v.series     ?? '',
      v.year_from  ?? '',
      v.year_to    ?? '',
      v.engine_litres ?? '',
      v.engine_kw  ?? '',
      v.trim_code  ?? '',
      v.fuel_type  ?? '',
    ].join('|');

    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }

  return Object.entries(groups)
    .filter(([, members]) => members.length >= 2)
    .sort((a, b) => b[1].length - a[1].length); // most dupes first
}

// --- Capitalization checks ---
// Hyundai i-series (and similar) that correctly start with lowercase
const KNOWN_LOWERCASE_MODELS = new Set([
  'i10', 'i20', 'i30', 'i40', 'i45', 'i30n',
  'i20n', 'iLoad', 'iMax',
]);

function isExpectedLowercase(model) {
  if (!model) return false;
  // Allow any model starting with lowercase "i" followed by digit (e.g. i30, i20)
  if (/^i\d/.test(model)) return true;
  // Allow iLoad / iMax
  if (/^i[A-Z]/.test(model)) return true;
  return false;
}

function findCapitalizationIssues(vehicles) {
  const issues = [];

  // --- Makes ---
  const makeSet = new Set(vehicles.map(v => v.make).filter(Boolean));
  for (const make of makeSet) {
    if (make[0] !== make[0].toUpperCase()) {
      issues.push({ type: 'MAKE_LOWERCASE', value: make });
    }
  }

  // --- Models: group by make ---
  // Build: makeModelMap[make] = Set of model strings
  const makeModelMap = {};
  for (const v of vehicles) {
    if (!v.make || !v.model) continue;
    if (!makeModelMap[v.make]) makeModelMap[v.make] = new Set();
    makeModelMap[v.make].add(v.model);
  }

  // Check for models that start with unexpected lowercase
  for (const [make, modelSet] of Object.entries(makeModelMap)) {
    for (const model of modelSet) {
      if (!model) continue;
      const firstChar = model[0];
      if (firstChar !== firstChar.toUpperCase() && !isExpectedLowercase(model)) {
        issues.push({ type: 'MODEL_UNEXPECTED_LOWERCASE', make, value: model });
      }
    }
  }

  // Check for inconsistent capitalization: same model name (case-insensitive) appearing with different cases within same make
  for (const [make, modelSet] of Object.entries(makeModelMap)) {
    const normalized = {}; // lower -> [original variants]
    for (const model of modelSet) {
      const lower = model.toLowerCase();
      if (!normalized[lower]) normalized[lower] = [];
      normalized[lower].push(model);
    }
    for (const [, variants] of Object.entries(normalized)) {
      if (variants.length > 1) {
        issues.push({ type: 'MODEL_INCONSISTENT_CASE', make, variants });
      }
    }
  }

  return issues;
}

// --- Main ---
async function main() {
  console.log('Fetching all vehicles...\n');
  const vehicles = await fetchAllVehicles();
  console.log(`\nTotal vehicles fetched: ${vehicles.length}\n`);

  // ==================
  // SECTION 1: DUPLICATES
  // ==================
  const dupGroups = findDuplicates(vehicles);

  console.log('='.repeat(70));
  console.log('SECTION 1: EXACT DUPLICATES');
  console.log('='.repeat(70));

  if (dupGroups.length === 0) {
    console.log('No exact duplicates found.\n');
  } else {
    let totalDupRows = 0;
    for (const [key, members] of dupGroups) {
      totalDupRows += members.length;
      const first = members[0];
      console.log(`\nGroup (${members.length} rows) — Key: ${key}`);
      console.log(`  Make: ${first.make}  Model: ${first.model}  Series: ${first.series ?? '(null)'}  Years: ${first.year_from ?? '?'}-${first.year_to ?? '?'}  KW: ${first.engine_kw ?? '?'}  Fuel: ${first.fuel_type ?? '?'}  Trim: ${first.trim_code ?? '?'}`);
      for (const v of members) {
        console.log(`    ID: ${v.id}  engine_litres: ${v.engine_litres ?? 'null'}  engine_config: ${v.engine_config ?? 'null'}  engine_code: ${v.engine_code ?? 'null'}  notes: ${v.notes ?? 'null'}`);
      }
    }
    console.log(`\nTOTAL DUPLICATE GROUPS: ${dupGroups.length}  (${totalDupRows} total rows involved)`);
  }

  // ==================
  // SECTION 2: CAPITALIZATION ISSUES
  // ==================
  const capIssues = findCapitalizationIssues(vehicles);

  console.log('\n' + '='.repeat(70));
  console.log('SECTION 2: CAPITALIZATION ISSUES');
  console.log('='.repeat(70));

  const makeIssues = capIssues.filter(i => i.type === 'MAKE_LOWERCASE');
  const modelLowerIssues = capIssues.filter(i => i.type === 'MODEL_UNEXPECTED_LOWERCASE');
  const modelInconsistentIssues = capIssues.filter(i => i.type === 'MODEL_INCONSISTENT_CASE');

  if (makeIssues.length === 0 && modelLowerIssues.length === 0 && modelInconsistentIssues.length === 0) {
    console.log('No capitalization issues found.\n');
  } else {
    if (makeIssues.length > 0) {
      console.log('\n-- Makes starting with lowercase --');
      for (const issue of makeIssues) {
        console.log(`  "${issue.value}"`);
      }
    }

    if (modelLowerIssues.length > 0) {
      console.log('\n-- Models with unexpected lowercase first letter --');
      for (const issue of modelLowerIssues) {
        console.log(`  Make: ${issue.make}  Model: "${issue.value}"`);
      }
    }

    if (modelInconsistentIssues.length > 0) {
      console.log('\n-- Models with inconsistent capitalization (same make, different case) --');
      for (const issue of modelInconsistentIssues) {
        console.log(`  Make: ${issue.make}  Variants: ${issue.variants.map(v => `"${v}"`).join(' vs ')}`);
      }
    }

    console.log(`\nTOTAL CAPITALIZATION ISSUES: ${capIssues.length}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
