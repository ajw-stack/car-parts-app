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
  S: { B: "Hatch, 5-door, right-hand drive" }, X: { D: "SUV, 5-door, right-hand drive" },
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
    const restraint = RESTRAINT[vin[5]] ?? null; if (restraint) s.restraint = restraint;
    const battery = BATTERY[vin[6]] ?? null;
    const motor = MOTOR[vin[3]]?.[vin[7]] ?? null;
    if (motor) { s.engine = motor; s.drive = /Dual|Tri/.test(motor) ? "AWD" : "RWD"; }
    const y = resolveModelYear(vin[9], 2008, 2030); s.modelYear = y;
    const plant = PLANT[vin[10]] ?? null; s.plant = plant;
    const shanghai = vin[10] === "C";
    return {
      segments: [
        seg(4, 4, vin, "Model line", model),
        seg(5, 5, vin, "Body / steering", body, body ? {} : { note: "Not yet confirmed." }),
        seg(6, 6, vin, "Restraint system", restraint),
        seg(7, 7, vin, "Battery", battery, battery ? {} : { note: "Not yet confirmed." }),
        seg(8, 8, vin, "Motor / drive unit", motor, motor ? {} : { note: "Not yet confirmed for this model." }),
        seg(10, 10, vin, shanghai ? "Year built" : "Model year", y ? String(y) : null,
          shanghai ? { status: "standard", note: "Shanghai-built Teslas carry the calendar year of build here, not a model year." } : { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};
