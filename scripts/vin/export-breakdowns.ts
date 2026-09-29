// Runs every test VIN through the decoder and writes the breakdowns as JSON
// (consumed by build-spreadsheet.py). Usage:
//   node --import ./scripts/vin/register.mjs scripts/vin/export-breakdowns.ts out.json
import { readFileSync, writeFileSync } from "node:fs";
import { decodeVinPositions } from "../../app/lib/vin/engine.ts";

const here = new URL(".", import.meta.url);
const user = readFileSync(new URL("user-vins.txt", here), "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const fixtures = JSON.parse(readFileSync(new URL("fixtures.json", here), "utf8")) as Array<Record<string, unknown>>;
const fx = new Map(fixtures.map((f) => [f.vin as string, f]));
const vins = [...user, ...fixtures.map((f) => f.vin as string).filter((v) => !user.includes(v))];

const rows = vins.map((vin) => {
  const r = decodeVinPositions(vin);
  const f = fx.get(vin);
  return {
    vin, group: user.includes(vin) ? "User-supplied" : "Researched listing",
    listing: f ? { make: f.make ?? null, model: f.model ?? null, year: f.year ?? null, description: f.description ?? null, source: f.source ?? null, note: f.expect_note ?? null } : null,
    rule: r.rule, summary: r.summary, checkDigit: r.checkDigit, segments: r.segments,
  };
});
writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
console.log(`${rows.length} breakdowns written`);
