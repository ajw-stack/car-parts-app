#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Models that are clearly wrong content (body types, fuel types, year codes, etc.)
const WRONG_CONTENT = new Set(['AUTO', 'COUPE', 'DRUM', 'HYBRID', 'SEDAN', 'CDI', 'MY01']);

// Known uppercase-only makes that SHOULD be title case
// (determined by checking the data — these come from DBA uppercase import)
const NEEDS_TITLE_CASE = {
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

async function fetchAll() {
  const PAGE = 1000;
  let offset = 0;
  const all = [];
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vehicles?select=id,make,model,series,year_from,year_to,engine_config,fuel_type,chassis&order=make.asc,model.asc&limit=${PAGE}&offset=${offset}`,
      { headers }
    );
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function fmt(v) {
  return `[${v.id}] ${v.make} | model="${v.model}" | series="${v.series || ''}" | chassis="${v.chassis || ''}" | ${v.year_from ?? '?'}-${v.year_to ?? 'ON'} | engine="${v.engine_config || ''}" | ${v.fuel_type || ''}`;
}

async function main() {
  console.log('Fetching all vehicles...');
  const all = await fetchAll();
  console.log(`Total: ${all.length}\n`);

  // 1. Wrong content
  const wrongContent = all.filter(v => WRONG_CONTENT.has((v.model || '').toUpperCase()));
  console.log(`${'='.repeat(60)}`);
  console.log(`WRONG CONTENT IN MODEL COLUMN (${wrongContent.length} vehicles)`);
  console.log(`These are body types, fuel/engine types, or codes — not model names`);
  console.log('='.repeat(60));
  for (const v of wrongContent) console.log('  ' + fmt(v));

  // 2. BMW chassis codes
  const bmwChassis = all.filter(v => v.make === 'BMW' && /^[EF]\d+$/.test(v.model || ''));
  const bmwDistinct = [...new Set(bmwChassis.map(v => v.model))].sort();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BMW: CHASSIS CODES IN MODEL COLUMN (${bmwChassis.length} vehicles)`);
  console.log(`Distinct: ${bmwDistinct.join(', ')}`);
  console.log(`These are chassis/platform codes — the actual model (e.g. "3 Series") may be missing`);
  console.log('='.repeat(60));
  // Show a few examples
  const bmwSample = {};
  for (const v of bmwChassis) {
    if (!bmwSample[v.model]) bmwSample[v.model] = v;
  }
  for (const v of Object.values(bmwSample).sort((a,b) => a.model.localeCompare(b.model))) {
    console.log('  ' + fmt(v));
  }

  // 3. Capitalisation issues
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CAPITALISATION ISSUES — UPPERCASE MODELS SHOULD BE TITLE CASE`);
  console.log('='.repeat(60));
  const capIssues = [];
  for (const v of all) {
    const corrections = NEEDS_TITLE_CASE[v.make];
    if (corrections && corrections[v.model]) {
      capIssues.push({ ...v, correction: corrections[v.model] });
    }
  }
  const byMakeCap = {};
  for (const v of capIssues) {
    const key = `${v.make}/${v.model}`;
    if (!byMakeCap[key]) byMakeCap[key] = { make: v.make, from: v.model, to: v.correction, count: 0 };
    byMakeCap[key].count++;
  }
  for (const [, g] of Object.entries(byMakeCap).sort()) {
    console.log(`  ${g.make}: "${g.from}" → "${g.to}" (${g.count} vehicles)`);
  }
  console.log(`  Total: ${capIssues.length} vehicles`);

  // 4. Hyundai I30CW
  const hyundaiOdd = all.filter(v => v.make === 'Hyundai' && (v.model || '').toUpperCase() === 'I30CW');
  if (hyundaiOdd.length) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`HYUNDAI: I30CW — should this be "i30 CW"? (${hyundaiOdd.length} vehicles)`);
    console.log('='.repeat(60));
    for (const v of hyundaiOdd) console.log('  ' + fmt(v));
  }

  // 5. Mercedes AMG / 200K
  const mercOdd = all.filter(v => v.make === 'Mercedes-Benz' && ['AMG', '200K', 'SEDAN'].includes(v.model || ''));
  if (mercOdd.length) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`MERCEDES-BENZ: Unusual model names — investigate (${mercOdd.length} vehicles)`);
    console.log('='.repeat(60));
    for (const v of mercOdd) console.log('  ' + fmt(v));
  }

  // 6. Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Wrong content in model column: ${wrongContent.length}`);
  console.log(`  BMW chassis codes:             ${bmwChassis.length}`);
  console.log(`  Capitalisation fixes needed:   ${capIssues.length}`);
  console.log(`  Hyundai I30CW:                 ${hyundaiOdd.length}`);
  console.log(`  Mercedes unusual:              ${mercOdd.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
