// Elroco VIN Decoding Code — Code Rule 34G (docs/vin-decoder-rules.md).
// Tesla — Fremont-built (5YJ) and Shanghai-built (LRW) cars delivered in Australia.
// Sources: Tesla Part 565 VIN decoders filed with NHTSA (MY2023 and MY2025, vPIC displayfile
// 7404ccb6… and 6ce6db08…); Australian Government recall VIN lists REC-001587 (Model S/X),
// REC-001653, 001654, 006022 (Fremont Model 3), REC-005875, 006042, 006419 (Shanghai Model 3/Y) —
// about 41,000 Australian VINs, every one with a valid ISO check digit and a real year letter.
//
// Shanghai VINs follow the US layout for positions 4 (model), 9 (check digit), 10 (year) and 11
// (plant) but NOT for positions 5–8: Australian codes (F7E…, HCF…) are absent from the Part 565
// tables, so the US motor table is never applied to them. No Berlin-built (XP7) VIN has been seen
// on an Australian list.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

const MODEL: Record<string, string> = { S: "Model S", X: "Model X", "3": "Model 3", Y: "Model Y" };
// Part 565, position 8 for Model 3 (confirmed in the US decoders; Australian trims not stated on the recall lists).
const M3_MOTOR: Record<string, string> = { A: "Single motor", B: "Dual motor", C: "Dual motor Performance" };
const PLANT: Record<string, [string, boolean]> = { F: ["Fremont, California, USA", false], C: ["Shanghai, China", true] };

export const tesla: MakeRule = {
  id: "tesla", make: "Tesla", wmis: ["5YJ", "LRW"],
  checkDigit: "yes", modelYear: "yes", years: [2008, 2030],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Tesla", fuel: "Electric" };
    const model = MODEL[vin[3]] ?? null;
    s.model = model;
    const fremont = vin.startsWith("5YJ");
    const motor = fremont && vin[3] === "3" ? M3_MOTOR[vin[7]] ?? null : null;
    if (motor) s.engine = motor;
    const y = resolveModelYear(vin[9], 2008, 2030); s.modelYear = y;
    const plant = PLANT[vin[10]] ?? null; s.plant = plant?.[0] ?? null;
    return {
      segments: [
        seg(4, 4, vin, "Model line", model),
        seg(5, 7, vin, "Body / restraint / fuel", null, {
          note: fremont
            ? "Australian right-hand-drive codes (e.g. F7E, B7E) are not in Tesla's US tables — not decoded."
            : "Shanghai-built codes do not follow Tesla's US tables and are not published — not decoded.",
        }),
        seg(8, 8, vin, "Motor / drive unit", motor, {
          note: motor
            ? "Single-sourced: Tesla's US Part 565 table. Australian recall lists do not state the trim to cross-check."
            : "Not decoded — the US motor table does not apply to Shanghai-built cars, and only Model 3 codes A–C are mapped for Fremont.",
        }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", plant?.[0] ?? null, plant?.[1] ? { note: "Single-sourced (C = Shanghai on every Australian LRW VIN; one decoder guide)." } : {}),
      ],
      summary: s,
    };
  },
};
