#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

async function deleteVehicle(id) {
  const url = `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  return res.status;
}

async function patchModel(make, wrongModel, correctModel) {
  const encodedMake = encodeURIComponent(make);
  const encodedWrong = encodeURIComponent(wrongModel);
  const url = `${SUPABASE_URL}/rest/v1/vehicles?make=eq.${encodedMake}&model=eq.${encodedWrong}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ model: correctModel }),
  });
  return res.status;
}

const fixes = [
  // Toyota
  { make: 'Toyota', wrong: 'CAMRY', correct: 'Camry' },
  { make: 'Toyota', wrong: 'CELICA', correct: 'Celica' },
  { make: 'Toyota', wrong: 'CORONA', correct: 'Corona' },
  { make: 'Toyota', wrong: 'COASTER', correct: 'Coaster' },
  { make: 'Toyota', wrong: 'PRIUS', correct: 'Prius' },
  { make: 'Toyota', wrong: 'TUNDRA', correct: 'Tundra' },
  { make: 'Toyota', wrong: 'AVALON', correct: 'Avalon' },
  { make: 'Toyota', wrong: 'LEXCEN', correct: 'Lexcen' },
  { make: 'Toyota', wrong: '4 RUNNER', correct: '4 Runner' },
  { make: 'Toyota', wrong: 'AVENSIS VERSO', correct: 'Avensis Verso' },
  { make: 'Toyota', wrong: 'FJ CRUISER', correct: 'FJ Cruiser' },
  { make: 'Toyota', wrong: 'SUPRA', correct: 'Supra' },
  { make: 'Toyota', wrong: 'CROWN', correct: 'Crown' },
  { make: 'Toyota', wrong: 'CRESSIDA', correct: 'Cressida' },
  { make: 'Toyota', wrong: 'CHASER', correct: 'Chaser' },
  { make: 'Toyota', wrong: 'SOARER', correct: 'Soarer' },
  { make: 'Toyota', wrong: 'STARLET', correct: 'Starlet' },
  { make: 'Toyota', wrong: 'RAV 4', correct: 'Rav 4' },
  { make: 'Toyota', wrong: 'SERA', correct: 'Sera' },
  { make: 'Toyota', wrong: 'RUKUS', correct: 'Rukus' },

  // Ford
  { make: 'Ford', wrong: 'MUSTANG', correct: 'Mustang' },
  { make: 'Ford', wrong: 'TRANSIT', correct: 'Transit' },
  { make: 'Ford', wrong: 'FOCUS', correct: 'Focus' },
  { make: 'Ford', wrong: 'RANGER', correct: 'Ranger' },
  { make: 'Ford', wrong: 'TERRITORY', correct: 'Territory' },
  { make: 'Ford', wrong: 'CAPRI', correct: 'Capri' },
  { make: 'Ford', wrong: 'FIESTA', correct: 'Fiesta' },
  { make: 'Ford', wrong: 'ESCORT', correct: 'Escort' },
  { make: 'Ford', wrong: 'LTD', correct: 'LTD' },
  { make: 'Ford', wrong: 'Ltd', correct: 'LTD' },
  { make: 'Ford', wrong: 'KUGA', correct: 'Kuga' },
  { make: 'Ford', wrong: 'EVEREST', correct: 'Everest' },
  { make: 'Ford', wrong: 'COUGAR', correct: 'Cougar' },
  { make: 'Ford', wrong: 'TAURUS', correct: 'Taurus' },
  { make: 'Ford', wrong: 'MAVERICK', correct: 'Maverick' },
  { make: 'Ford', wrong: 'TELSTAR', correct: 'Telstar' },
  { make: 'Ford', wrong: 'CORTINA', correct: 'Cortina' },
  { make: 'Ford', wrong: 'MONDEO', correct: 'Mondeo' },
  { make: 'Ford', wrong: 'ESCAPE', correct: 'Escape' },
  { make: 'Ford', wrong: 'CORSAIR', correct: 'Corsair' },
  { make: 'Ford', wrong: 'FESTIVA', correct: 'Festiva' },

  // Nissan
  { make: 'Nissan', wrong: 'X-TRAIL', correct: 'X-Trail' },
  { make: 'Nissan', wrong: 'SKYLINE', correct: 'Skyline' },
  { make: 'Nissan', wrong: 'SILVIA', correct: 'Silvia' },
  { make: 'Nissan', wrong: 'ELGRAND', correct: 'Elgrand' },
  { make: 'Nissan', wrong: 'STAGEA', correct: 'Stagea' },
  { make: 'Nissan', wrong: 'JUKE', correct: 'Juke' },
  { make: 'Nissan', wrong: 'CUBE', correct: 'Cube' },
  { make: 'Nissan', wrong: 'DUALIS', correct: 'Dualis' },
  { make: 'Nissan', wrong: 'QASHQAI', correct: 'Qashqai' },
  { make: 'Nissan', wrong: 'NAVARA NP300', correct: 'Navara NP300' },
  { make: 'Nissan', wrong: 'NOMAD', correct: 'Nomad' },
  { make: 'Nissan', wrong: 'ALTIMA', correct: 'Altima' },
  { make: 'Nissan', wrong: 'MURANO', correct: 'Murano' },
  { make: 'Nissan', wrong: 'ALMERA', correct: 'Almera' },
  { make: 'Nissan', wrong: 'TIIDA', correct: 'Tiida' },
  { make: 'Nissan', wrong: 'URVAN', correct: 'Urvan' },

  // Mitsubishi
  { make: 'Mitsubishi', wrong: 'TRITON', correct: 'Triton' },
  { make: 'Mitsubishi', wrong: 'LANCER', correct: 'Lancer' },
  { make: 'Mitsubishi', wrong: 'EXPRESS', correct: 'Express' },
  { make: 'Mitsubishi', wrong: 'COLT', correct: 'Colt' },
  { make: 'Mitsubishi', wrong: 'GALANT', correct: 'Galant' },
  { make: 'Mitsubishi', wrong: 'MAGNA', correct: 'Magna' },
  { make: 'Mitsubishi', wrong: 'Asx', correct: 'ASX' },
  { make: 'Mitsubishi', wrong: 'MIRAGE', correct: 'Mirage' },
  { make: 'Mitsubishi', wrong: 'CHALLENGER', correct: 'Challenger' },
  { make: 'Mitsubishi', wrong: 'ECLIPSE CROSS', correct: 'Eclipse Cross' },
  { make: 'Mitsubishi', wrong: 'SIGMA', correct: 'Sigma' },
  { make: 'Mitsubishi', wrong: 'GRANDIS', correct: 'Grandis' },

  // Honda
  { make: 'Honda', wrong: 'ACCORD', correct: 'Accord' },
  { make: 'Honda', wrong: 'CIVIC', correct: 'Civic' },
  { make: 'Honda', wrong: 'JAZZ', correct: 'Jazz' },
  { make: 'Honda', wrong: 'LEGEND', correct: 'Legend' },
  { make: 'Honda', wrong: 'INTEGRA', correct: 'Integra' },
  { make: 'Honda', wrong: 'ODYSSEY', correct: 'Odyssey' },
  { make: 'Honda', wrong: 'PRELUDE', correct: 'Prelude' },
  { make: 'Honda', wrong: 'CITY', correct: 'City' },
  { make: 'Honda', wrong: 'INSIGHT', correct: 'Insight' },
  { make: 'Honda', wrong: 'CONCERTO', correct: 'Concerto' },

  // Hyundai
  { make: 'Hyundai', wrong: 'SANTA FE', correct: 'Santa Fe' },
  { make: 'Hyundai', wrong: 'TUCSON', correct: 'Tucson' },
  { make: 'Hyundai', wrong: 'ACCENT', correct: 'Accent' },
  { make: 'Hyundai', wrong: 'SONATA', correct: 'Sonata' },
  { make: 'Hyundai', wrong: 'VELOSTER', correct: 'Veloster' },
  { make: 'Hyundai', wrong: 'EXCEL', correct: 'Excel' },
  { make: 'Hyundai', wrong: 'TIBURON', correct: 'Tiburon' },
  { make: 'Hyundai', wrong: 'COUPE', correct: 'Coupe' },
  { make: 'Hyundai', wrong: 'TRAJET', correct: 'Trajet' },
  { make: 'Hyundai', wrong: 'I30', correct: 'i30' },
  { make: 'Hyundai', wrong: 'I20', correct: 'i20' },
  { make: 'Hyundai', wrong: 'I40', correct: 'i40' },
  { make: 'Hyundai', wrong: 'I45', correct: 'i45' },
  { make: 'Hyundai', wrong: 'IX35', correct: 'ix35' },

  // Subaru
  { make: 'Subaru', wrong: 'IMPREZA', correct: 'Impreza' },
  { make: 'Subaru', wrong: 'LIBERTY', correct: 'Liberty' },
  { make: 'Subaru', wrong: 'FORESTER', correct: 'Forester' },
  { make: 'Subaru', wrong: 'OUTBACK', correct: 'Outback' },
  { make: 'Subaru', wrong: 'LEVORG', correct: 'Levorg' },
  { make: 'Subaru', wrong: 'VORTEX', correct: 'Vortex' },
  { make: 'Subaru', wrong: 'TRIBECA', correct: 'Tribeca' },

  // Alfa Romeo
  { make: 'Alfa Romeo', wrong: 'BRERA', correct: 'Brera' },
  { make: 'Alfa Romeo', wrong: 'SPIDER', correct: 'Spider' },
  { make: 'Alfa Romeo', wrong: 'MITO', correct: 'Mito' },
  { make: 'Alfa Romeo', wrong: 'MONTREAL', correct: 'Montreal' },

  // Acura
  { make: 'Acura', wrong: 'INTEGRA', correct: 'Integra' },
  { make: 'Acura', wrong: 'LEGEND', correct: 'Legend' },

  // Audi
  { make: 'Audi', wrong: 'ALLROAD', correct: 'Allroad' },

  // Mazda
  { make: 'Mazda', wrong: 'TRIBUTE', correct: 'Tribute' },
  { make: 'Mazda', wrong: 'Mpv', correct: 'MPV' },

  // Mercedes-Benz
  { make: 'Mercedes-Benz', wrong: 'V-CLASS', correct: 'V-Class' },
  { make: 'Mercedes-Benz', wrong: 'CDi SPORT PACK', correct: 'CDI SPORT PACK' },
];

async function main() {
  let successCount = 0;
  let failCount = 0;
  const failed = [];

  // Step 1: Delete the duplicate
  console.log('\n=== STEP 1: Delete duplicate vehicle ===');
  const deleteId = 'f9d71b56-3721-4078-8574-6c7eadd0df47';
  const deleteStatus = await deleteVehicle(deleteId);
  if (deleteStatus >= 200 && deleteStatus < 300) {
    console.log(`  DELETE id=${deleteId} → HTTP ${deleteStatus} ✓ (Mercedes-Benz SPORT PACK duplicate removed)`);
    successCount++;
  } else {
    console.log(`  DELETE id=${deleteId} → HTTP ${deleteStatus} ✗ FAILED`);
    failCount++;
    failed.push({ op: 'DELETE', id: deleteId, status: deleteStatus });
  }

  // Step 2: Apply all casing fixes
  console.log('\n=== STEP 2: Fix model capitalization ===');
  for (const { make, wrong, correct } of fixes) {
    const status = await patchModel(make, wrong, correct);
    const ok = status >= 200 && status < 300;
    const icon = ok ? '✓' : '✗';
    console.log(`  PATCH [${make}] "${wrong}" → "${correct}" — HTTP ${status} ${icon}`);
    if (ok) {
      successCount++;
    } else {
      failCount++;
      failed.push({ op: 'PATCH', make, wrong, correct, status });
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`  Total operations: ${1 + fixes.length}`);
  console.log(`  Succeeded:        ${successCount}`);
  console.log(`  Failed:           ${failCount}`);
  if (failed.length > 0) {
    console.log('\n  Failed operations:');
    for (const f of failed) {
      if (f.op === 'DELETE') {
        console.log(`    DELETE id=${f.id} — HTTP ${f.status}`);
      } else {
        console.log(`    PATCH [${f.make}] "${f.wrong}" → "${f.correct}" — HTTP ${f.status}`);
      }
    }
  } else {
    console.log('\n  All operations completed successfully.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
