// Elroco VIN Decoding Code — Code Rules 17–19 (docs/vin-decoder-rules.md).
// Ford Australia (6FP), Ford Thailand (MNA/MNB), and North-American FCA (Jeep, Chrysler).
// Sources: Elroco VIN research 2026-09-29 — AU-series Falcon VIN table (digi-ron "AU Falcon SPUD"
// project), BA Falcon workshop manual (Elroco folder) body-style codes, classic.com listings with
// VIN (2008 FG XR8 ute, 2002 AU III XR6), NHTSA vPIC decodes of the Jeep and Chrysler VINs.

import { filler, seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear, yearCandidates } from "../modelYear";

// ── Ford Australia 6FP (Falcon, Fairlane, LTD, Territory; built Broadmeadows / Geelong) ──
// 4–6 AAA filler · 7 product source (J) · 8 plant (G = Broadmeadows) · 9–10 body style ·
// 11 build-year code · 12 build-month code · 13–17 serial. No check digit, no model-year field.
const FORD_BODY: Record<string, [body: string, model: string]> = {
  SW: ["Sedan (short wheelbase)", "Falcon"],
  WA: ["Wagon", "Falcon"],
  CM: ["Utility / cab chassis", "Falcon"],
  LW: ["Sedan (long wheelbase)", "Fairlane / LTD"],
};
// Two month-letter sets are both in use on real VINs; they do not overlap.
const FORD_MONTH: Record<string, string> = {
  C: "January", K: "February", D: "March", E: "April", L: "May", Y: "June",
  M: "July", P: "August", B: "September", R: "October", A: "November", G: "December",
  S: "July", T: "August", J: "September", U: "October",
};

export const fordAustralia: MakeRule = {
  id: "ford-australia", make: "Ford", wmis: ["6FP"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ford" };
    const body = FORD_BODY[vin.slice(8, 10)];
    if (body) { s.body = body[0]; s.model = body[1]; }
    const plant = vin[7] === "G" ? "Broadmeadows, Victoria" : null;
    s.plant = plant;
    // Build year: the ISO year cycle; Ford Australia 17-digit VINs span 1989–2016.
    const cands = yearCandidates(vin[10]).filter((y) => y >= 1989 && y <= 2016);
    const year = cands.length === 1 ? cands[0] : null;
    s.modelYear = year;
    const month = FORD_MONTH[vin[11]] ?? null;
    return {
      segments: [
        filler(4, 6, vin, "Filler (AAA) on every Ford Australia VIN."),
        seg(7, 7, vin, "Product source", vin[6] === "J" ? "Ford Australia" : null),
        seg(8, 8, vin, "Assembly plant", plant),
        seg(9, 10, vin, "Body style", body ? `${body[0]} — ${body[1]}` : null, {
          note: body ? "Ford Australia VINs use positions 9–10 for the body, so there is no check digit." : "Body code not in the confirmed table (SW, WA, CM, LW). AT is thought to be Territory but no source confirms it.",
        }),
        seg(11, 11, vin, "Build year", year ? String(year) : null, { note: "Build year, not a model year." }),
        seg(12, 12, vin, "Build month", month, { note: "Month letters confirmed on 1998–2002 and FG-era VINs; Ford rotated letter sets between years." }),
        seg(13, 17, vin, "Production sequence number", vin.slice(12), { status: "standard" }),
      ],
      summary: { ...s, serial: vin.slice(12) },
    };
  },
};

// ── Ford Thailand (MNA: Ranger / Everest built by AutoAlliance Thailand) ───────────
export const fordThailand: MakeRule = {
  id: "ford-thailand", make: "Ford", wmis: ["MNA", "MNB", "MPB"],
  checkDigit: "no", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ford" };
    if (vin.startsWith("MNA") || vin.startsWith("MPB")) { s.model = "Ranger / Everest"; s.series = "Thai-built (AutoAlliance / FTM)"; }
    const y = resolveModelYear(vin[9], 1998); s.modelYear = y;
    return {
      segments: [
        seg(4, 8, vin, "Model / cab / engine", s.model ? `${s.model} — detail not decoded` : null, {
          note: "MNA identifies Ford's Thai ute plant; the exact cab and engine block is not yet mapped.",
        }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
      ],
      summary: s,
    };
  },
};

// ── North-American FCA layout (Jeep, Chrysler, Dodge) — full ISO layout with real check digit ──
const FCA_LINE: Record<string, [make: string, model: string, series: string]> = {
  JW: ["Jeep", "Wrangler Unlimited", "JK"],
  JF: ["Jeep", "Grand Cherokee", "WK2"],
  CA: ["Chrysler", "300", "LX"],
};
const FCA_PLANT: Record<string, string> = { L: "Toledo, Ohio", C: "Jefferson North, Detroit", H: "Brampton, Ontario" };
// Added 2026-11-09 from FCA / Chrysler Group NHTSA Part 565 VIN guides (2018 Truck/MPV, 2013 Truck/MPV,
// 2012 Passenger Car) + NHTSA vPIC decodes of the Australian VINs. Codes are model-year specific, so
// they are keyed by vehicle line and only cover the years those guides describe.
const FCA_RESTRAINT: Record<string, string> = {
  JW: "H: hydraulic brakes, GVWR 5,001–6,000 lb, front airbags and front-row side airbags",
  JF: "R: GVWR 6,001–7,000 lb, front airbags and side airbags all rows",
  CA: "C: front airbags and side airbags all rows",
};
const FCA_SERIES: Record<string, string> = {
  JWK: "Wrangler JK Unlimited Sport, 4WD, 4-door, right-hand drive",
  JFE: "Grand Cherokee WK2 Laredo, 4WD, right-hand drive",
  CAT: "300 Limited, RWD, right-hand drive",
  CAL: "300C (to March 2012), right-hand drive",
  CAN: "300 SRT8, right-hand drive",
  CAU: "300C (from March 2012), right-hand drive",
  CAV: "300C Luxury, right-hand drive",
};
const FCA_ENGINE: Record<string, Record<string, string>> = {
  JW: { G: "3.6L V6 petrol (Pentastar)" },
  JF: { M: "3.0L V6 turbo diesel (EXF)" },
  CA: { G: "3.6L V6 petrol (Pentastar, ERB)" },
};

export const fcaNorthAmerica: MakeRule = {
  id: "fca-north-america", make: "Jeep", wmis: ["1C4", "1J4", "1J8", "2C3", "1C3", "1C6", "3C4"],
  checkDigit: "yes", modelYear: "yes",
  decode(vin) {
    const l = FCA_LINE[vin.slice(4, 6)];
    const s: Partial<VinSummary> = { make: l?.[0] ?? (vin.startsWith("2C3") || vin.startsWith("1C3") ? "Chrysler" : "Jeep") };
    if (l) { s.model = l[1]; s.series = l[2]; }
    const plant = FCA_PLANT[vin[10]] ?? null; s.plant = plant;
    const fe = FCA_ENGINE[vin.slice(4, 6)]?.[vin[7]];
    if (fe) { s.engine = fe; s.fuel = /diesel/i.test(fe) ? "Diesel" : "Petrol"; s.engineLitres = fe.slice(0, 3); }
    return {
      segments: [
        seg(4, 4, vin, "Restraint / brake class", vin[3] === FCA_RESTRAINT[vin.slice(4, 6)]?.[0] ? FCA_RESTRAINT[vin.slice(4, 6)].slice(3) : null,
          vin[3] === FCA_RESTRAINT[vin.slice(4, 6)]?.[0] ? {} : { note: "Not yet confirmed for this vehicle line." }),
        seg(5, 6, vin, "Vehicle line", l ? `${l[0]} ${l[1]} (${l[2]})` : null, {
          note: "Line codes confirmed from NHTSA decodes of Australian-delivered VINs.",
        }),
        seg(7, 7, vin, "Series / drive / steering", FCA_SERIES[vin.slice(4, 7)] ?? null,
          FCA_SERIES[vin.slice(4, 7)] ? {} : { note: "Not yet confirmed for this vehicle line." }),
        seg(8, 8, vin, "Engine", FCA_ENGINE[vin.slice(4, 6)]?.[vin[7]] ?? null,
          FCA_ENGINE[vin.slice(4, 6)]?.[vin[7]] ? {} : { note: "Not yet confirmed for this vehicle line." }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};
