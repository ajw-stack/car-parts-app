// Elroco VIN Decoding Code — Code Rule 34G (docs/vin-decoder-rules.md).
// Tesla — Fremont-built (5YJ) and Shanghai-built (LRW) cars delivered in Australia.
// Sources: Tesla Part 565 VIN decoders filed with NHTSA (MY2023 and MY2025, vPIC displayfile
// 7404ccb6… and 6ce6db08…); Australian Government recall VIN lists REC-001587 (Model S/X),
// REC-001653, 001654, 006022 (Fremont Model 3), REC-005875, 006042, 006419 (Shanghai Model 3/Y) —
// about 41,000 Australian VINs, every one with a valid ISO check digit and a real year letter.
//
// Corrected 2026-11-09: Tesla's own service-manual VIN pages (Model 3, Model Y, Model S, Model X,
// read via archive.org) cover the Shanghai and right-hand-drive codes, and agree with the Part 565
// tables. Checked against 85 Australian cars24 listings with VIN + variant + kW + build date.
// Shanghai cars put the CALENDAR year of build in position 10, not a model year.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

const MODEL: Record<string, string> = { S: "Model S", X: "Model X", "3": "Model 3", Y: "Model Y" };
const BODY: Record<string, Record<string, string>> = {
  "3": { F: "Sedan, 4-door, right-hand drive" }, Y: { H: "SUV, 5-door, right-hand drive" },
  S: { A: "Hatch, 5-door, left-hand drive", B: "Hatch, 5-door, right-hand drive" },
  X: { C: "SUV, 5-door, left-hand drive", D: "SUV, 5-door, right-hand drive" },
};

// Older Model S / X codes (added 2026-11-12). Two Tesla documents agree on each: the Part 565 VIN
// filings at NHTSA (ORG8047 MY2012-13 S, ORG9130 MY2014 S, ORG10373/11229 MY2015 S, ORG11230 MY2016 X,
// ORG13481/13482 MY2017 S/X) and the year-by-year VIN tables in the Model S and Model X service manuals.
// Restraint codes change meaning by model year, so they are keyed by year.
// Not decoded: Model S restraint 3 on MY2014 (the two documents disagree on knee airbags and seats),
// restraint 6 on MY2014 (service manual lists it from 2015 only).
function sxRestraint(model: string, c: string, y: number): string | null {
  if (model === "S") {
    if (c === "1") return y <= 2013 ? "Dual front, front and rear side, and knee airbags" : "Front, side and front knee airbags";
    if (c === "6" && y >= 2015) return "Front and side airbags (three rear seats)";
    if (c === "7" && y >= 2014) return y <= 2017 ? "Front and side airbags, active bonnet (three rear seats)" : "Front and side airbags (three rear seats)";
    if (c === "8" && y >= 2015 && y <= 2017) return "Front and side airbags, active bonnet (two rear seats)";
    return null;
  }
  if (model === "X") {
    if (c === "C" && y >= 2016) return "Front and side airbags";
    if (c === "D" && y >= 2017) return "Front, side and front knee airbags (five seats)";
  }
  return null;
}
// Model S MY2012-13: position 7 = on-board charger, position 8 = motor + battery size.
const S_EARLY_CHARGER: Record<string, string> = {
  A: "10 kW charger", B: "20 kW charger", C: "10 kW charger with DC fast charge", D: "20 kW charger with DC fast charge",
};
const S_EARLY_MOTOR: Record<string, string> = {
  C: "Single motor (base), 31–40 kWh battery", G: "Single motor (base), 51–60 kWh battery",
  N: "Single motor (base), 81–90 kWh battery", P: "Single motor (Performance), 81–90 kWh battery",
};
const RESTRAINT: Record<string, string> = { "7": "Front and side airbags", C: "Front and side airbags" };
const BATTERY: Record<string, string> = {
  E: "Lithium-ion (NCA / ternary)", F: "Lithium iron phosphate (LFP)",
  H: "High-capacity battery", S: "Standard-capacity battery", V: "Ultra-high-capacity battery",
};
const MOTOR: Record<string, Record<string, string>> = {
  "3": { A: "Single motor", B: "Dual motor, Long Range AWD", C: "Dual motor, Performance", J: "Single motor",
         K: "Dual motor, Long Range AWD", L: "Dual motor, Performance", R: "Single motor", S: "Single motor, rear-wheel drive", T: "Dual motor, Performance" },
  Y: { J: "Single motor", K: "Dual motor, Long Range AWD", L: "Dual motor, Performance", R: "Single motor", S: "Single motor, rear-wheel drive" },
  S: { "1": "Single motor", "2": "Dual motor", "3": "Single motor, Performance", "4": "Dual motor, Performance", "5": "Dual motor", "6": "Tri motor" },
  X: { "2": "Dual motor", "4": "Dual motor, Performance", "5": "Dual motor", "6": "Tri motor" },
};
const PLANT: Record<string, string> = { F: "Fremont, California, USA", C: "Shanghai, China", A: "Austin, Texas, USA", B: "Berlin, Germany" };

export const tesla: MakeRule = {
  id: "tesla", make: "Tesla", wmis: ["5YJ", "LRW", "7SA", "XP7"],
  checkDigit: "yes", modelYear: "yes", years: [2008, 2030],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Tesla", fuel: "Electric" };
    const model = MODEL[vin[3]] ?? null;
    s.model = model;
    const body = BODY[vin[3]]?.[vin[4]] ?? null; if (body) s.body = body;
    const y0 = resolveModelYear(vin[9], 2008, 2030) ?? 0;
    const sx = vin[3] === "S" || vin[3] === "X";
    const early = vin[3] === "S" && y0 <= 2013;
    const restraint = (sx ? sxRestraint(vin[3], vin[5], y0) : RESTRAINT[vin[5]]) ?? null; if (restraint) s.restraint = restraint;
    // On Model S/X, E is a fuel-type code ("Electric"), not a battery chemistry.
    const battery = early ? S_EARLY_CHARGER[vin[6]] ?? null
      : sx && vin[6] === "E" ? "Electric (fuel type code)"
      : sx && vin[6] === "F" ? null
      : BATTERY[vin[6]] ?? null;
    const motor = (early ? S_EARLY_MOTOR[vin[7]] : MOTOR[vin[3]]?.[vin[7]]) ?? null;
    if (motor) { s.engine = motor; s.drive = /Dual|Tri/.test(motor) ? "AWD" : "RWD"; }
    const y = resolveModelYear(vin[9], 2008, 2030); s.modelYear = y;
    const plant = PLANT[vin[10]] ?? null; s.plant = plant;
    const shanghai = vin[10] === "C";
    return {
      segments: [
        seg(4, 4, vin, "Model line", model),
        seg(5, 5, vin, "Body / steering", body, body ? {} : { note: "Not yet confirmed." }),
        seg(6, 6, vin, "Restraint system", restraint, restraint ? {} : { note: "Not yet confirmed for this model and year." }),
        seg(7, 7, vin, early ? "On-board charger" : "Battery", battery, battery ? {} : { note: "Not yet confirmed." }),
        seg(8, 8, vin, "Motor / drive unit", motor, motor ? {} : { note: "Not yet confirmed for this model." }),
        seg(10, 10, vin, shanghai ? "Year built" : "Model year", y ? String(y) : null,
          shanghai ? { status: "standard", note: "Shanghai-built Teslas carry the calendar year of build here, not a model year." } : { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};
