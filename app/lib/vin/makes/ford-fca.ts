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
  // AT = Territory SX/SY/SZ (added 2026-11-12: Venus & Mars Autos 2016 Territory 6FPAAAJGATGG99756,
  // Got It Motors 2010 Territory 6FPAAAJGATAR59602, Machter fitment "6FPAAAJGAT … Territory").
  AT: ["Wagon / SUV", "Territory"],
};
// Position 8 plant: G Broadmeadows main line, L Broadmeadows secondary line (Wikibooks Ford "Australian
// production location" + the archived Capri VIN page "always L = Broadmeadows").
const FORD_AU_PLANT: Record<string, string> = { G: "Broadmeadows, Victoria", L: "Broadmeadows, Victoria (secondary line)" };
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
    const plant = FORD_AU_PLANT[vin[7]] ?? null;
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
          note: body ? "Ford Australia VINs use positions 9–10 for the body, so there is no check digit." : "Body code not in the confirmed table (SW, WA, CM, LW, AT).",
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

// ── Ford Brazil (9BF): F-250 sold in Australia 2001–2007 (added 2026-11-12) ────────────
// Sources: Grays auction lots with VIN + spec (9BFJW21F… 7.3 diesel dual cab 4WD; 9BFJX20Z… 5.4 V8),
// NHTSA vPIC ("Ford Motor Company Brasil"), Drive (Brazil-built F-250 sold 2001–07), Wikibooks Ford
// Super Duty tables (W2x crew cab, X2x Super Cab; F 7.3 Power Stroke, Z 5.4 Triton). Position 6 = 1
// is 4WD (Grays + Wikibooks); 0 = 2WD has the US table only, so it is not decoded.
const F250_ENGINE: Record<string, [name: string, litres: string, fuel: string]> = {
  F: ["7.3L V8 turbo diesel (Power Stroke)", "7.3", "Diesel"], Z: ["5.4L V8 petrol (Triton)", "5.4", "Petrol"],
};
export const fordBrazil: MakeRule = {
  id: "ford-brazil", make: "Ford", wmis: ["9BF"],
  checkDigit: "yes", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ford" };
    const f250 = vin[3] === "J" && (vin[4] === "W" || vin[4] === "X") && vin[5] === "2";
    if (f250) { s.model = "F-250"; s.series = "Brazil-built"; }
    const cab = f250 && vin[4] === "W" ? "Crew (dual) cab" : null;
    if (cab) s.body = cab;
    const drive = f250 && vin[6] === "1" ? "4WD" : null; if (drive) s.drive = drive;
    const e = f250 ? F250_ENGINE[vin[7]] : undefined;
    if (e) Object.assign(s, { engine: e[0], engineLitres: e[1], fuel: e[2] });
    const y = resolveModelYear(vin[9], 1998, 2012); s.modelYear = y;
    return {
      segments: [
        seg(4, 4, vin, "Vehicle line", f250 ? "Ford truck (Super Duty)" : null, f250 ? {} : { note: "Not yet confirmed." }),
        seg(5, 6, vin, "Model / cab", f250 ? (cab ? `F-250, ${cab}` : "F-250") : null, f250 ? {} : { note: "Not yet confirmed." }),
        seg(7, 7, vin, "Drive", drive, drive ? {} : { note: "Not yet confirmed." }),
        seg(8, 8, vin, "Engine", e?.[0] ?? null, e ? {} : { note: "Not yet confirmed." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", null, { note: "Brazilian plant letter not yet confirmed." }),
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
