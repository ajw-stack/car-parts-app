// VIN decoder test harness.
//   node --import ./scripts/vin/register.mjs scripts/vin/run-tests.ts [--verbose]
// 1) Every VIN in user-vins.txt must decode: valid, country, manufacturer, make, and a model/series.
// 2) Every VIN in fixtures.json (researched, with a known description) must also match the
//    expected make, model/series keyword and model year where the fixture states them.
import { readFileSync, existsSync } from "node:fs";
import { decodeVinPositions } from "../../app/lib/vin/engine.ts";

const verbose = process.argv.includes("--verbose");
const here = new URL(".", import.meta.url);
type Fx = { vin: string; make?: string; model?: string; series?: string; year?: number | string; source?: string };

const userVins = readFileSync(new URL("user-vins.txt", here), "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const fixtures: Fx[] = existsSync(new URL("fixtures.json", here)) ? JSON.parse(readFileSync(new URL("fixtures.json", here), "utf8")) : [];

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
let pass = 0, fail = 0;
const byMake: Record<string, { pass: number; fail: number }> = {};
const failures: string[] = [];

function check(vin: string, fx?: Fx) {
  const r = decodeVinPositions(vin);
  const s = r.summary;
  const problems: string[] = [];
  if (!r.valid) problems.push(r.error ?? "invalid");
  if (!s.country) problems.push("no country");
  if (!s.manufacturer) problems.push("WMI not recognised");
  if (!s.make) problems.push("no make rule");
  if (!s.model && !s.series) problems.push("model/series not decoded");
  if (fx) {
    if (fx.make && norm(s.make) !== norm(fx.make)) problems.push(`make ${s.make} ≠ ${fx.make}`);
    // Model check: the first word of the listing's model name must appear in the decoded model/series.
    const want = norm(String(fx.model ?? "").split(/[\s/(-]/)[0]);
    if (want && !norm(`${s.model} ${s.series}`).includes(want)) problems.push(`model "${s.model} ${s.series ?? ""}" ≠ ${fx.model}`);
    const y = fx.year ? parseInt(String(fx.year), 10) : NaN;
    // Year check allows ±1: listings often give the build or compliance year, VINs the model year.
    if (!Number.isNaN(y) && s.modelYear && Math.abs(s.modelYear - y) > 1) problems.push(`year ${s.modelYear} ≠ ${y}`);
  }
  const key = s.make ?? s.manufacturer ?? vin.slice(0, 3);
  byMake[key] ??= { pass: 0, fail: 0 };
  if (problems.length) { fail++; byMake[key].fail++; failures.push(`${vin}  [${r.rule ?? "no rule"}]  ${problems.join("; ")}`); }
  else { pass++; byMake[key].pass++; }
  if (verbose) {
    console.log(`\n${vin}  rule=${r.rule}  ${problems.length ? "FAIL: " + problems.join("; ") : "ok"}`);
    for (const g of r.segments) console.log(`   ${String(g.from).padStart(2)}${g.to !== g.from ? "-" + String(g.to).padEnd(2) : "   "} ${g.chars.padEnd(6)} ${g.label.padEnd(44)} ${g.value ?? "—"}`);
  }
}

for (const v of userVins) check(v);
const seen = new Set(userVins);
for (const f of fixtures) if (!seen.has(f.vin)) { seen.add(f.vin); check(f.vin, f); }

console.log(`\nVINs tested: ${pass + fail}   decoded: ${pass}   not fully decoded: ${fail}`);
console.log("\nBy make:");
for (const [m, c] of Object.entries(byMake).sort((a, b) => (b[1].pass + b[1].fail) - (a[1].pass + a[1].fail))) console.log(`  ${m.padEnd(40)} ${c.pass}/${c.pass + c.fail}`);
if (failures.length) { console.log("\nNot fully decoded:"); for (const f of failures) console.log("  " + f); }
process.exitCode = fail ? 1 : 0;
