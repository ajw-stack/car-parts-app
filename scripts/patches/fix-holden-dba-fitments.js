#!/usr/bin/env node
// Migrate DBA fitments from messy DBA-created Holden vehicles to the
// correct pre-existing vehicle records, then delete the duplicates.
//
// Problem: import-dba-catalogue.js created ALL-CAPS / descriptive-named
// Holden vehicles because the DBA CSV uses heading="HOLDEN" for most rows,
// forcing fallback to model_text (e.g. "VE / VEII V8 BERLINA, SS Inc V & VF V8").
// These DBA vehicles are separate records from the clean pre-existing
// "Commodore", "Gemini", "Astra" etc. records, so fitments don't show.
//
// Usage: node scripts/fix-holden-dba-fitments.js [--dry-run]

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
const H    = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: H, ...opts });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

async function getAll(urlPath) {
  const all = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const res = await fetch(`${BASE}/rest/v1${urlPath}`, {
      headers: { ...H, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ─── Move fitments from one vehicle to another, then delete the source ────────
async function mergeVehicle(fromId, toId, label) {
  const fitments = await api(`/vehicle_part_fitments?vehicle_id=eq.${fromId}&select=vehicle_id,part_id,position,qty`);
  if (!fitments.length) {
    if (!DRY_RUN) await api(`/vehicles?id=eq.${fromId}`, { method: 'DELETE' });
    console.log(`  ${label}: 0 fitments, deleted empty vehicle`);
    return 0;
  }

  const newFit = fitments.map(f => ({ ...f, vehicle_id: toId }));

  if (!DRY_RUN) {
    // Fetch existing fitments for target to avoid dupes
    const existing = await api(`/vehicle_part_fitments?vehicle_id=eq.${toId}&select=part_id,position`);
    const existSet = new Set(existing.map(f => `${f.part_id}|${f.position ?? ''}`));
    const toInsert = newFit.filter(f => !existSet.has(`${f.part_id}|${f.position ?? ''}`));

    if (toInsert.length) {
      await api('/vehicle_part_fitments', {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(toInsert),
      });
    }
    // Delete old fitments and old vehicle
    await api(`/vehicle_part_fitments?vehicle_id=eq.${fromId}`, { method: 'DELETE' });
    await api(`/vehicles?id=eq.${fromId}`, { method: 'DELETE' });
    console.log(`  ${label}: moved ${toInsert.length}/${fitments.length} fitments → deleted source`);
  } else {
    console.log(`  (dry) ${label}: would move ${fitments.length} fitments`);
  }
  return fitments.length;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== FIX HOLDEN DBA FITMENTS ===');

  const allHolden = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to,engine_litres,engine_kw,notes');
  console.log(`Total Holden vehicles: ${allHolden.length}`);

  // ── 1. Simple case-insensitive model merges ──────────────────────────────
  // e.g. "GEMINI" → "Gemini", "ASTRA" → "Astra"
  console.log('\n--- Step 1: Case-insensitive model merges ---');

  // Group by normalised model name
  const byNorm = new Map(); // normalisedModel → [vehicle, ...]
  for (const v of allHolden) {
    const k = v.model.trim().toUpperCase();
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(v);
  }

  for (const [, group] of byNorm) {
    if (group.length < 2) continue;
    // Find the "canonical" record: prefer title-case (has mixed case), shorter model name, or has series
    const canonical = group.find(v => v.series) || group.find(v => v.model !== v.model.toUpperCase()) || group[0];
    const duplicates = group.filter(v => v !== canonical && v.model === v.model.toUpperCase());
    if (!duplicates.length) continue;

    for (const dup of duplicates) {
      // Only merge if year ranges overlap or are compatible
      const fromYr = dup.year_from ?? 0;
      const toYr   = dup.year_to   ?? 9999;

      // Find the best matching canonical vehicle (year overlap)
      const match = group.find(v =>
        v !== dup &&
        v.model !== v.model.toUpperCase() && // prefer title-case
        (v.year_from == null || v.year_from <= toYr) &&
        (v.year_to   == null || v.year_to   >= fromYr)
      ) || canonical;

      await mergeVehicle(dup.id, match.id,
        `${dup.model} ${dup.year_from}→ ${match.model} ${match.year_from}`);
    }
  }

  // ── 2. Commodore descriptive-name merges ──────────────────────────────────
  // The DBA CSV creates vehicles like "VE / VEII V8 BERLINA, SS Inc V & VF V8"
  // These need to map to Commodore vehicles filtered by series + engine.
  console.log('\n--- Step 2: Commodore descriptive-name merges ---');

  // Reload after deletions
  const holden = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to,engine_litres,engine_kw,notes');
  const commodores = holden.filter(v => v.model === 'Commodore');

  const COMMODORE_RULES = [
    // DBA model name           → filter function on existing Commodore records
    {
      model: 'VB, VC, VH, VK, VL VN, VP, VR, VS Inc UTE Except IRS 6, 8 Cyl',
      match: v => ['VB','VC','VH','VK','VL','VN','VP','VR','VS'].includes(v.series),
    },
    {
      model: 'VL 6 Cyl TURBO VL V8 CALAIS',
      match: v => v.series === 'VL',
    },
    {
      model: 'VT, VX, VY, VZ, V6 & V8',
      match: v => ['VT','VX','VY','VZ'].includes(v.series),
    },
    {
      model: 'VZ SSZ COMMODORE Inc UTE',
      match: v => v.series === 'VZ',
    },
    {
      model: 'VZ SSZ 1 TONNER',
      match: v => v.series === 'VZ',
    },
    {
      model: 'VE / VEII V8 BERLINA, SS Inc V & VF V8',
      match: v => ['VE','VE II','VF','VF II'].includes(v.series) && (v.engine_litres == null || v.engine_litres >= 5),
    },
    {
      model: 'VE / VEII V6 OMEGA & VF V6 BERLINA SV6, CALAIS Inc V,',
      match: v => ['VE','VE II','VF','VF II'].includes(v.series) && (v.engine_litres == null || v.engine_litres < 5),
    },
    {
      model: 'VE / VF SS-V REDLINE EDITION',
      match: v => ['VE','VE II','VF','VF II'].includes(v.series) && (v.year_from == null || v.year_from >= 2010),
    },
    {
      model: 'VE REDLINE OPTION',
      match: v => ['VE','VE II'].includes(v.series) && (v.year_from == null || v.year_from >= 2010),
    },
    {
      model: 'Plus VT, VX, VU, VZ UTE WH, WK, WL STATESMAN',
      match: v => ['VT','VX','VU','VZ'].includes(v.series),
    },
    {
      model: 'VP 6 Cyl Inc UTE Chassis 569903-on Limited Run – Without ABS',
      match: v => v.series === 'VP',
    },
    {
      model: 'VP V8 Inc UTE Chassis 570557-on',
      match: v => v.series === 'VP',
    },
    {
      model: 'VP, IRS VQ STATESMAN IRS',
      match: v => v.series === 'VP',
    },
    {
      model: 'VR, VS Inc ABS Inc UTE',
      match: v => ['VR','VS'].includes(v.series),
    },
    {
      model: 'VR, VS IRS',
      match: v => ['VR','VS'].includes(v.series),
    },
    {
      model: 'VR, VS IRS 10 HOLE STUD PATTERN',
      match: v => ['VR','VS'].includes(v.series),
    },
    {
      model: 'VS 10 HOLE STUD PATTERN',
      match: v => v.series === 'VS',
    },
    {
      model: 'VL 6 Cyl TURBO VL V8 CALAIS',
      match: v => v.series === 'VL',
    },
    {
      model: 'From Chassis BB000001',
      match: v => ['VT','VX','VU','VY','VZ'].includes(v.series),
    },
  ];

  // Also handle "Inc UTE" row which is a continuation row for VE/VF SS-V rear
  const INC_UTE_RULES = [
    {
      model: 'Inc UTE',
      match: v => ['VE','VE II','VF','VF II'].includes(v.series) && (v.year_from == null || v.year_from >= 2010),
    },
  ];

  for (const rule of [...COMMODORE_RULES, ...INC_UTE_RULES]) {
    const dbaDups = holden.filter(v => v.model === rule.model);
    if (!dbaDups.length) continue;

    const targets = commodores.filter(rule.match);
    if (!targets.length) {
      console.log(`  No target vehicles for: "${rule.model}"`);
      continue;
    }

    console.log(`\n  DBA "${rule.model}" (${dbaDups.length} records) → ${targets.length} target Commodores`);

    for (const dup of dbaDups) {
      const fitments = await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}&select=vehicle_id,part_id,position,qty`);
      if (!fitments.length) {
        if (!DRY_RUN) await api(`/vehicles?id=eq.${dup.id}`, { method: 'DELETE' });
        console.log(`    ${dup.model} ${dup.year_from}: 0 fitments → deleted`);
        continue;
      }

      console.log(`    ${dup.year_from}: ${fitments.length} fitments → ${targets.length} vehicles`);
      if (!DRY_RUN) {
        for (const target of targets) {
          const newFit = fitments.map(f => ({ vehicle_id: target.id, part_id: f.part_id, position: f.position, qty: f.qty }));
          const existing = await api(`/vehicle_part_fitments?vehicle_id=eq.${target.id}&select=part_id,position`);
          const existSet = new Set(existing.map(f => `${f.part_id}|${f.position ?? ''}`));
          const toInsert = newFit.filter(f => !existSet.has(`${f.part_id}|${f.position ?? ''}`));
          if (toInsert.length) {
            await api('/vehicle_part_fitments', {
              method: 'POST',
              headers: { ...H, Prefer: 'resolution=ignore-duplicates' },
              body: JSON.stringify(toInsert),
            });
          }
        }
        await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}`, { method: 'DELETE' });
        await api(`/vehicles?id=eq.${dup.id}`, { method: 'DELETE' });
      }
    }
  }

  // ── 3. Handle COMMODORE UPGRADE OPTIONS ───────────────────────────────────
  console.log('\n--- Step 3: Commodore Upgrade Options ---');
  const upgradeRules = [
    { notes: 'VR, VS',         match: v => ['VR','VS'].includes(v.series) },
    { notes: 'VT – VZ',        match: v => ['VT','VX','VY','VZ'].includes(v.series) },
    { notes: 'PBR M Series UPGRADE FLAT ROTOR', match: v => ['VT','VX','VY','VZ'].includes(v.series) },
    { notes: /VE SS-V/,        match: v => ['VE','VE II'].includes(v.series) },
    { notes: /VF SS-V/,        match: v => ['VF','VF II'].includes(v.series) },
    { notes: /POLICE CHASER/,  match: v => ['VF','VF II'].includes(v.series) },
  ];

  const holden2 = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to,engine_litres,engine_kw,notes');
  const comm2   = holden2.filter(v => v.model === 'Commodore');
  const upgVehs = holden2.filter(v => v.model === 'COMMODORE UPGRADE OPTIONS');

  for (const upg of upgVehs) {
    const rule = upgradeRules.find(r => {
      if (typeof r.notes === 'string') return upg.notes?.includes(r.notes);
      return r.notes.test(upg.notes ?? '');
    });
    if (!rule) { console.log(`  No rule for upgrade: ${upg.notes}`); continue; }

    const targets = comm2.filter(rule.match);
    if (!targets.length) { console.log(`  No targets for: ${upg.notes}`); continue; }

    const fitments = await api(`/vehicle_part_fitments?vehicle_id=eq.${upg.id}&select=vehicle_id,part_id,position,qty`);
    console.log(`  UPGRADE ${upg.notes}: ${fitments.length} fitments → ${targets.length} Commodores`);

    if (!DRY_RUN && fitments.length) {
      for (const target of targets) {
        const newFit = fitments.map(f => ({ vehicle_id: target.id, part_id: f.part_id, position: f.position, qty: f.qty }));
        const existing = await api(`/vehicle_part_fitments?vehicle_id=eq.${target.id}&select=part_id,position`);
        const existSet = new Set(existing.map(f => `${f.part_id}|${f.position ?? ''}`));
        const toInsert = newFit.filter(f => !existSet.has(`${f.part_id}|${f.position ?? ''}`));
        if (toInsert.length) {
          await api('/vehicle_part_fitments', {
            method: 'POST',
            headers: { ...H, Prefer: 'resolution=ignore-duplicates' },
            body: JSON.stringify(toInsert),
          });
        }
      }
      await api(`/vehicle_part_fitments?vehicle_id=eq.${upg.id}`, { method: 'DELETE' });
      await api(`/vehicles?id=eq.${upg.id}`, { method: 'DELETE' });
    }
  }

  // ── 4. Handle Statesman + Calais descriptive names ────────────────────────
  console.log('\n--- Step 4: Statesman / Calais ---');
  const holden3   = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to,engine_litres,engine_kw,notes');
  const statesman = holden3.filter(v => v.model === 'Statesman');
  const calais    = holden3.filter(v => v.model === 'Calais');

  const SC_RULES = [
    { model: 'WM STATESMAN', targets: statesman },
    {
      model: 'CALAIS Inc V, WM STATESMAN',
      targets: [...calais.filter(v => ['VE','VE II','VF'].includes(v.series)), ...statesman],
    },
  ];

  for (const rule of SC_RULES) {
    const dups = holden3.filter(v => v.model === rule.model);
    for (const dup of dups) {
      const fitments = await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}&select=vehicle_id,part_id,position,qty`);
      console.log(`  "${dup.model}" ${dup.year_from}: ${fitments.length} fitments → ${rule.targets.length} vehicles`);
      if (!DRY_RUN) {
        for (const target of rule.targets) {
          const newFit = fitments.map(f => ({ vehicle_id: target.id, part_id: f.part_id, position: f.position, qty: f.qty }));
          const existing = await api(`/vehicle_part_fitments?vehicle_id=eq.${target.id}&select=part_id,position`);
          const existSet = new Set(existing.map(f => `${f.part_id}|${f.position ?? ''}`));
          const toInsert = newFit.filter(f => !existSet.has(`${f.part_id}|${f.position ?? ''}`));
          if (toInsert.length) {
            await api('/vehicle_part_fitments', { method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(toInsert) });
          }
        }
        await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}`, { method: 'DELETE' });
        await api(`/vehicles?id=eq.${dup.id}`, { method: 'DELETE' });
      }
    }
  }

  // ── 5. Handle HSV descriptive vehicles → Holden HSV or just keep them ────
  // These are genuine separate vehicles (HSV CLUBSPORT, HSV AWD etc.) — keep as-is

  // ── 6. Handle WALKINSHAW UPGRADE → appropriate Commodore vehicles ─────────
  console.log('\n--- Step 5: Walkinshaw Upgrade ---');
  const holden4 = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to,engine_litres,engine_kw,notes');
  const comm4   = holden4.filter(v => v.model === 'Commodore' && ['VE','VE II','VF'].includes(v.series));
  const wlk     = holden4.filter(v => v.model === 'WALKINSHAW UPGRADE');

  for (const dup of wlk) {
    const fitments = await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}&select=vehicle_id,part_id,position,qty`);
    console.log(`  Walkinshaw ${dup.notes ?? ''} ${dup.year_from}: ${fitments.length} fitments → ${comm4.length} VE/VF Commodores`);
    if (!DRY_RUN && fitments.length) {
      for (const target of comm4) {
        const newFit = fitments.map(f => ({ vehicle_id: target.id, part_id: f.part_id, position: f.position, qty: f.qty }));
        const existing = await api(`/vehicle_part_fitments?vehicle_id=eq.${target.id}&select=part_id,position`);
        const existSet = new Set(existing.map(f => `${f.part_id}|${f.position ?? ''}`));
        const toInsert = newFit.filter(f => !existSet.has(`${f.part_id}|${f.position ?? ''}`));
        if (toInsert.length) {
          await api('/vehicle_part_fitments', { method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(toInsert) });
        }
      }
      await api(`/vehicle_part_fitments?vehicle_id=eq.${dup.id}`, { method: 'DELETE' });
      await api(`/vehicles?id=eq.${dup.id}`, { method: 'DELETE' });
    }
  }

  // ── 7. Handle remaining ALL-CAPS models with no title-case match ──────────
  // These become permanent records (e.g. DRUM MJ Series which has no other match)
  console.log('\n--- Step 6: Remaining ALL-CAPS with no title-case match ---');
  const finalHolden = await getAll('/vehicles?make=eq.Holden&select=id,model,series,year_from,year_to');
  const modelSet    = new Set(finalHolden.map(v => v.model.trim().toUpperCase()));
  const capsOnly    = finalHolden.filter(v => {
    const isAllCaps = v.model === v.model.toUpperCase() && /[A-Z]/.test(v.model);
    const hasMatch  = finalHolden.some(w => w !== v && w.model.toUpperCase() === v.model.toUpperCase() && w.model !== w.model.toUpperCase());
    return isAllCaps && !hasMatch;
  });
  if (capsOnly.length) {
    console.log(`  ${capsOnly.length} ALL-CAPS models with no title-case match (kept as-is):`);
    capsOnly.forEach(v => console.log(`    ${v.model} (${v.year_from})`));
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
