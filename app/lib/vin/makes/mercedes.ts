// Elroco VIN Decoding Code — Code Rule 32 (docs/vin-decoder-rules.md).
// Mercedes-Benz — rest-of-world VIN layout used on Australian-delivered cars.
// Positions 4–9 spell the factory type designation NNN.NNN (series.variant),
// e.g. W1N 253964 → 253.964 = X253 GLC; WDD 205042 → 205.042 = W205 C-Class.
// Position 10 is NOT a model-year code on these VINs (every Australian sample carries "2");
// position 11 is a plant letter; 12–17 serial.
// Sources: Elroco VIN research 2026-09-29 (four user-supplied AU VINs + Pickles listings,
// each matching its known chassis series); Mercedes-Benz chassis-series designations.

import { seg, type MakeRule, type VinSummary } from "../engine";

// Chassis series (first three digits of the type designation) → model line.
const SERIES: Record<string, string> = {
  "168": "A-Class (W168)", "169": "A-Class (W169)", "176": "A-Class (W176)", "177": "A-Class (W177)",
  "245": "B-Class (W245)", "246": "B-Class (W246)", "247": "B-Class / GLB / GLA (247 platform)",
  "117": "CLA (C117)", "118": "CLA (C118)", "156": "GLA (X156)",
  "202": "C-Class (W202)", "203": "C-Class (W203)", "204": "C-Class / GLK (W204 / X204)",
  "205": "C-Class (W205)", "206": "C-Class (W206)",
  "208": "CLK (C208)", "209": "CLK (C209)",
  "210": "E-Class (W210)", "211": "E-Class (W211)", "212": "E-Class (W212)", "213": "E-Class (W213)", "214": "E-Class (W214)",
  "207": "E-Class coupé / cabriolet (C207)", "238": "E-Class coupé / cabriolet (C238)",
  "219": "CLS (C219)", "218": "CLS (C218)", "257": "CLS (C257)",
  "220": "S-Class (W220)", "221": "S-Class (W221)", "222": "S-Class (W222)", "223": "S-Class (W223)",
  "163": "M-Class (W163)", "164": "M-Class (W164)", "166": "M-Class / GLE (W166)", "167": "GLE (V167)",
  "292": "GLE coupé (C292)", "251": "R-Class (W251)", "253": "GLC (X253)", "254": "GLC (X254)",
  "463": "G-Class (W463)", "171": "SLK (R171)", "172": "SLK / SLC (R172)", "230": "SL (R230)", "231": "SL (R231)",
  "190": "AMG GT (C190)", "197": "SLS AMG (C197)",
  "906": "Sprinter (NCV3)", "907": "Sprinter (VS30)", "910": "Sprinter (VS30, FWD)",
  "639": "Vito / Valente (W639)", "447": "Vito / Valente / V-Class (W447)", "415": "Citan (W415)", "470": "X-Class (470)",
  "243": "EQA (H243)", "293": "EQC (N293)",
};

function decode(vin: string) {
  const s: Partial<VinSummary> = { make: "Mercedes-Benz" };
  const type = `${vin.slice(3, 6)}.${vin.slice(6, 9)}`;
  const line = SERIES[vin.slice(3, 6)] ?? null;
  if (line) {
    s.model = line.replace(/\s*\(.*\)$/, "");
    s.series = line.match(/\(([^)]+)\)/)?.[1] ?? null;
  }
  return {
    segments: [
      seg(4, 6, vin, "Chassis series", line),
      seg(7, 9, vin, "Type variant (body / engine)", `Type ${type}`, {
        note: "Full type designation — use it to look up the exact model and engine in the Mercedes-Benz parts catalogue.",
      }),
      seg(10, 10, vin, "Steering / market code", vin[9] === "2" ? "Right-hand drive (code 2)" : null, {
        note: "Not a model year on rest-of-world Mercedes-Benz VINs. Every Australian sample checked carries 2.",
      }),
      seg(11, 11, vin, "Assembly plant", null, { note: "Mercedes-Benz plant letters are not yet confirmed for Australian-delivered cars." }),
    ],
    summary: s,
  };
}

export const mercedes: MakeRule = {
  id: "mercedes-benz", make: "Mercedes-Benz",
  wmis: ["WDB", "WDD", "WDC", "WDF", "W1K", "W1N", "W1V", "W1W", "WMX", "VSA"],
  checkDigit: "mixed", modelYear: "no",
  decode,
};
