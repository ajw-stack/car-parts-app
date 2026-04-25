#!/usr/bin/env node
// Patch chassis for Holden models where body type is unambiguous —
// the model only ever came in one body style.
// Excludes Colorado and Rodeo (multiple cab variants — needs per-row review).
// Usage: node scripts/patches/patch-holden-chassis-obvious.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
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

// model → chassis (only models where every variant shares the same body type)
const MODEL_CHASSIS = {
  'Calibra':           'Coupe',        // YE — only ever produced as a coupe
  'Captiva 5':         'SUV',          // CG — 5-seat SUV, same body as Captiva 7
  'Captiva 7':         'SUV',          // CG — 7-seat SUV
  'Cascada':           'Convertible',  // CJ — only ever a convertible
  'Crewman':           'Crew Cab Ute', // VY/VZ — only ever a crew cab ute
  'Jackaroo':          'SUV',          // UBS — only ever an SUV
  'Jackaroo Monterey': 'SUV',          // UBS — only ever an SUV
  'One Tonner':        'Cab Chassis',  // VY/VZ — cab chassis (no factory tray)
  'Volt':              'Hatchback',    // EV — only ever a hatchback
};

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH HOLDEN CHASSIS (OBVIOUS) ===');

  // Fetch all matching rows in one call
  const models = Object.keys(MODEL_CHASSIS);
  const rows = await api(
    `/vehicles?make=eq.Holden&chassis=is.null&model=in.(${models.join(',')})&select=id,model,series,year_from,year_to,engine_kw,fuel_type&order=model,series,year_from`
  );

  console.log(`Rows to patch: ${rows.length}\n`);

  let ok = 0;
  for (const v of rows) {
    const chassis = MODEL_CHASSIS[v.model];
    const label = `${v.model} ${v.series ?? ''} ${v.year_from}-${v.year_to ?? 'on'} → chassis="${chassis}"`;

    if (DRY_RUN) {
      console.log(`  Would patch: ${label}`);
    } else {
      await api(`/vehicles?id=eq.${v.id}`, {
        method: 'PATCH',
        headers: { ...hdrs, Prefer: 'return=minimal' },
        body: JSON.stringify({ chassis }),
      });
      console.log(`  ✓ ${label}`);
      ok++;
    }
  }

  console.log(`\n${DRY_RUN ? 'Dry-run complete.' : `Patched ${ok} rows.`}`);
}

main().catch(err => { console.error(err); process.exit(1); });
