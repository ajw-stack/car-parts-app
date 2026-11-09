// Elroco VIN Decoding Code — Code Rules 28–30 (docs/vin-decoder-rules.md).
// Subaru, Honda and Land Rover — positions 4–5 carry the manufacturer's own chassis code.
// Sources: Elroco VIN research 2026-09-29 — 24 real Australian VINs from grays.com.au listings
// and user-supplied plates; cars101.com (Subaru platform letters); JLR VIN reference (Elroco folder).

import { seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

type Chassis = Record<string, [model: string, series: string]>;

function chassisDecode(
  make: string, table: Chassis, plants: (vin: string) => string | null, pos6to8Label: string,
  detail?: (vin: string, s: Partial<VinSummary>) => VinSegment[],
) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const c = table[vin.slice(3, 5)];
    if (c) { s.model = c[0]; s.series = c[1]; }
    const y = resolveModelYear(vin[9], 1981);
    s.modelYear = y;
    const plant = plants(vin);
    s.plant = plant;
    return {
      segments: [
        seg(4, 5, vin, "Chassis code (model / generation)", c ? `${c[0]} (${c[1]})` : null),
        ...(detail ? detail(vin, s) : [seg(6, 8, vin, pos6to8Label, null, { note: "Grade and engine block — no published table; not decoded." })]),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "Cars built late in a calendar year often carry the next year's code." }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  };
}

// ── Subaru (JF1 cars, JF2 SUVs; all Australian samples built in Gunma, Japan) ──
const SUBARU: Chassis = {
  GC: ["Impreza", "GC (1st gen sedan/coupe)"], GF: ["Impreza", "GF (1st gen wagon)"],
  GD: ["Impreza", "GD (2nd gen sedan)"], GG: ["Impreza", "GG (2nd gen hatch)"],
  GE: ["Impreza", "GE (3rd gen sedan)"], GH: ["Impreza", "GH (3rd gen hatch)"],
  GJ: ["Impreza", "GJ (4th gen sedan)"], GP: ["XV / Impreza", "GP (4th gen hatch / XV)"],
  GK: ["Impreza", "GK (5th gen sedan)"], GT: ["XV / Impreza", "GT (5th gen hatch / XV)"],
  VA: ["WRX", "VA"], VB: ["WRX", "VB"],
  SF: ["Forester", "SF"], SG: ["Forester", "SG"], SH: ["Forester", "SH"], SJ: ["Forester", "SJ"], SK: ["Forester", "SK"],
  BD: ["Liberty", "BD (2nd gen sedan)"], BG: ["Liberty / Outback", "BG (2nd gen wagon)"],
  BE: ["Liberty", "BE (3rd gen sedan)"], BH: ["Liberty / Outback", "BH (3rd gen wagon)"],
  BL: ["Liberty", "BL (4th gen sedan)"], BP: ["Liberty / Outback", "BP (4th gen wagon)"],
  BM: ["Liberty", "BM (5th gen sedan)"], BR: ["Outback", "BR (4th gen)"],
  BN: ["Liberty", "BN (6th gen sedan)"], BS: ["Outback", "BS (5th gen)"], BT: ["Outback", "BT (6th gen)"],
  ZC: ["BRZ", "ZC (1st gen)"], ZD: ["BRZ", "ZD (2nd gen)"],
};

// Subaru positions 6-9 (added 2026-11-09). Source: Subaru's own "Meaning of V.I.N." table for
// "Europe, Australia and general markets" (2004 Impreza manual, ID-4): 6 engine/drive, 7 steering,
// 8 engine + transmission, 9 drive type (NOT a check digit), 11 plant G = Gunma. Checked against
// 400,430 VINs from 45 Subaru Australia recall VIN lists (vehiclerecalls.gov.au) and 310 AU VIN +
// variant pairs (CarsGuide, Cars24, Grays). Position 6 means different engines on different
// chassis, so it is keyed by chassis. Only codes with two agreeing sources are listed.
const SUBARU_ENGINE: Record<string, Record<string, string>> = {
  GC: { "8": "2.0L petrol (EJ20)" },
  GD: { "9": "2.0L petrol", A: "2.0L turbo petrol (WRX)", B: "2.0L turbo petrol (WRX STI)", E: "2.5L petrol (RS)" },
  GG: { "9": "2.0L petrol", A: "2.0L turbo petrol (WRX)", B: "2.0L turbo petrol (WRX STI)", E: "2.5L petrol (RS)" },
  GE: { "7": "2.0L petrol", E: "2.5L turbo petrol (WRX)" },
  GH: { "7": "2.0L petrol", E: "2.5L turbo petrol (WRX)" },
  GJ: { "7": "2.0L petrol (FB20)" }, GP: { "7": "2.0L petrol (FB20)" },
  GK: { "7": "2.0L petrol" }, GT: { "7": "2.0L petrol" }, GU: { "7": "2.0L petrol" },
  VA: { G: "2.0L turbo petrol (FA20 DIT)", F: "2.5L turbo petrol (WRX STI)" },
  VB: { H: "2.4L turbo petrol (FA24 DIT)" }, VN: { H: "2.4L turbo petrol (FA24 DIT)" },
  VM: { G: "2.0L turbo petrol (FA20 DIT)", "4": "1.6L turbo petrol (FB16 DIT)" },
  SJ: { "5": "2.0L petrol (FB20)", "9": "2.5L petrol", G: "2.0L turbo petrol (XT)", D: "2.0L turbo diesel" },
  SK: { "9": "2.5L petrol", E: "2.0L petrol hybrid (e-Boxer)" },
  BL: { "9": "2.5L petrol (naturally aspirated or GT turbo)" }, BP: { "9": "2.5L petrol (naturally aspirated or GT turbo)" },
  BM: { "9": "2.5L petrol (EJ25, naturally aspirated or GT turbo)", M: "2.5L petrol (FB25)", F: "3.6L petrol (EZ36)", D: "2.0L turbo diesel" },
  BR: { "9": "2.5L petrol (EJ25, naturally aspirated or GT turbo)", M: "2.5L petrol (FB25)", F: "3.6L petrol (EZ36)", D: "2.0L turbo diesel" },
  BN: { "9": "2.5L petrol", F: "3.6L petrol", D: "2.0L turbo diesel" },
  BS: { "9": "2.5L petrol", F: "3.6L petrol", D: "2.0L turbo diesel" },
  BT: { "9": "2.5L petrol", A: "2.4L turbo petrol (XT)" },
  ZC: { "6": "2.0L petrol (FA20)" }, ZD: { "8": "2.4L petrol (FA24)" },
};
// Positions 8+9 together = engine-transmission pair.
const SUBARU_TRANS: Record<string, string> = {
  J3: "5-speed manual", R5: "4-speed automatic", D3: "5-speed manual", H3: "6-speed manual", S5: "4-speed automatic",
  V5: "5-speed automatic", V3: "5-speed automatic", U3: "5-speed automatic", U6: "5-speed automatic",
  "92": "CVT", C2: "CVT", C5: "CVT", A3: "6-speed manual", Z3: "6-speed manual", Z4: "6-speed manual",
  Y5: "CVT", Y2: "CVT", "85": "CVT", "63": "6-speed manual", "81": "6-speed manual", "72": "6-speed automatic", L3: "CVT",
};
const SUBARU_CVT_ERA = new Set(["GT", "GK", "GU", "SK", "SL", "BT"]);   // L5 = CVT on these, 4-speed auto on older chassis

function subaruDetail(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const chassis = vin.slice(3, 5);
  const eng = SUBARU_ENGINE[chassis]?.[vin[5]] ?? null;
  if (eng) {
    s.engine = eng;
    const m = eng.match(/^(\d\.\d)L/); if (m) s.engineLitres = m[1];
    s.fuel = /diesel/i.test(eng) ? "Diesel" : /hybrid/i.test(eng) ? "Hybrid" : "Petrol";
  }
  const pair = vin.slice(7, 9);
  const trans = pair === "L5" ? (SUBARU_CVT_ERA.has(chassis) ? "CVT" : "4-speed automatic") : SUBARU_TRANS[pair] ?? null;
  if (trans) s.transmission = trans;
  const steer = vin[6] === "K" ? "Right-hand drive" : vin[6] === "L" ? "Left-hand drive" : null;
  return [
    seg(6, 6, vin, "Engine", eng, eng ? {} : { note: "This Subaru engine code is not yet confirmed for this chassis." }),
    seg(7, 7, vin, "Steering", steer),
    seg(8, 9, vin, "Engine / transmission", trans, trans ? { note: "Position 9 is part of this code, not a check digit." } : { note: "Not decoded. Position 9 is part of this code, not a check digit." }),
  ];
}

// ── Honda (JHM/JHL Japan, MRH Thailand). Position 9 is a fixed 0, not a check digit. ──
const HONDA: Chassis = {
  RD: ["CR-V", "RD (1st/2nd gen)"], RE: ["CR-V", "RE (3rd gen)"], RM: ["CR-V", "RM (4th gen)"], RW: ["CR-V", "RW (5th gen)"],
  EU: ["Civic", "EU (7th gen)"], ES: ["Civic", "ES (7th gen sedan)"], FD: ["Civic", "FD (8th gen sedan)"],
  FB: ["Civic", "FB (9th gen sedan)"], FC: ["Civic", "FC (10th gen sedan)"], FK: ["Civic", "FK (hatch)"], FL: ["Civic", "FL (11th gen)"],
  GD: ["Jazz", "GD (1st gen)"], GE: ["Jazz", "GE (2nd gen)"], GK: ["Jazz", "GK (3rd gen)"],
  GM: ["City", "GM"], CL: ["Accord Euro", "CL (7th gen)"], CU: ["Accord Euro", "CU (8th gen)"],
  RA: ["Odyssey", "RA"], RB: ["Odyssey", "RB"], RC: ["Odyssey", "RC"],
  GH: ["HR-V", "GH (1st gen)"], RU: ["HR-V", "RU (2nd gen)"],
};
// Honda plant letters (2026-11-09): P = Ayutthaya (Honda City 3A Thai service manual); C = Sayama,
// S = Suzuka, X = Yorii (Honda NHTSA Part 565 letters). T on MRH VINs is a Thai plant whose
// location is not documented.
function hondaPlant(vin: string): string | null {
  if (vin.startsWith("MRH")) return vin[10] === "P" ? "Ayutthaya, Thailand" : vin[10] === "T" ? "Thailand (Honda Automobile Thailand)" : null;
  if (vin.startsWith("JH")) return ({ C: "Sayama, Japan", S: "Suzuka, Japan", X: "Yorii, Japan" } as Record<string, string>)[vin[10]] ?? null;
  return null;
}

// Honda positions 6-9 (added 2026-11-09). Layout from the Honda City 3A Thai service manual:
// 6 chassis sub-number, 7 body + transmission, 8 grade, 9 fixed code. Grade/engine codes from
// ~1,000 Australian VIN + variant pairs (Autotrader, Pickles, Cars24) and recall REC-000568 (Civic FD
// VIN ranges by grade). Only high-confidence chassis are listed; CR-V RE/RM/RW codes do not
// identify a single trim and are left out.
const HONDA_BODY_TRANS: Record<string, string> = {
  "5": "Sedan, manual", "6": "Sedan, automatic / CVT", "7": "5-door, manual", "8": "5-door, automatic / CVT",
};
const HONDA_GRADE: Record<string, Record<string, [grade: string, engine: string | null]>> = {
  FD: { "155": ["VTi", "1.8L petrol (R18A1)"], "165": ["VTi", "1.8L petrol (R18A1)"], "157": ["VTi-L", "1.8L petrol (R18A1)"],
        "167": ["VTi-L", "1.8L petrol (R18A1)"], "255": ["Sport", "2.0L petrol"], "265": ["Sport", "2.0L petrol"],
        "362": ["Hybrid", "1.3L petrol hybrid"] },
  FK: { "486": ["VTi-L", "1.5L turbo petrol"], "488": ["RS", "1.5L turbo petrol"], "489": ["VTi-LX", "1.5L turbo petrol"],
        "585": ["VTi", "1.8L petrol"], "586": ["VTi-S", "1.8L petrol"] },
  FC: { "166": ["VTi-L", "1.5L turbo petrol"], "168": ["RS", "1.5L turbo petrol"], "169": ["VTi-LX", "1.5L turbo petrol"],
        "665": ["VTi", "1.8L petrol"], "666": ["VTi-S", "1.8L petrol"], "667": ["VTi-S", "1.8L petrol"] },
  GK: { "575": ["VTi", "1.5L petrol"], "585": ["VTi", "1.5L petrol"], "586": ["VTi-S", "1.5L petrol"], "587": ["VTi-L", "1.5L petrol"] },
  RU: { "583": ["VTi", "1.8L petrol"], "585": ["VTi-S", "1.8L petrol"], "587": ["VTi-L / VTi-LX", "1.8L petrol"],
        "588": ["RS", "1.8L petrol"], "589": ["RS", "1.8L petrol"] },
  RS: { "382": ["VTi X", null], "383": ["VTi X7", null], "385": ["VTi L", null], "386": ["VTi L7", null],
        "485": ["VTi L AWD", null], "488": ["VTi LX AWD", null], "588": ["e:HEV RS", null] },
  CU: { "254": ["Accord Euro (base)", "2.4L petrol (K24Z3)"], "264": ["Accord Euro (base)", "2.4L petrol (K24Z3)"],
        "268": ["Luxury", "2.4L petrol (K24Z3)"] },
  RC: { "183": ["VTi (Vi L7 from 2021)", null], "185": ["VTi-L (Vi LX7 from 2021)", null] },
};
// Position 9 became a real ISO check digit on newer lines (verified on recall VIN lists REC-006151,
// REC-006727): CR-V RS, Accord CY, ZR-V RZ from launch; HR-V RV and Civic FL from model year 2025.
function hondaUsesCheckDigit(vin: string, year: number | null): boolean {
  const c = vin.slice(3, 5);
  if (c === "RS" || c === "CY" || c === "RZ") return true;
  return (c === "RV" || c === "FL") && (year ?? 0) >= 2025;
}
function hondaDetail(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const chassis = vin.slice(3, 5);
  const bt = HONDA_BODY_TRANS[vin[6]] ?? null;
  if (bt) s.transmission = /manual/.test(bt) ? "Manual" : "Automatic / CVT";
  const g = HONDA_GRADE[chassis]?.[vin.slice(5, 8)];
  if (g) {
    s.trim = g[0];
    if (g[1]) { s.engine = g[1]; s.engineLitres = g[1].slice(0, 3); s.fuel = /hybrid/i.test(g[1]) ? "Hybrid" : "Petrol"; }
  }
  const y = resolveModelYear(vin[9], 1981);
  const cd = hondaUsesCheckDigit(vin, y);
  return [
    seg(6, 6, vin, "Chassis sub-number", null, { status: "standard", note: "Part of Honda's model code with positions 4, 5, 7 and 8." }),
    seg(7, 7, vin, "Body / transmission", bt),
    seg(8, 8, vin, "Grade", g ? (g[1] ? `${g[0]}, ${g[1]}` : g[0]) : null, g ? {} : { note: "This grade code is not yet confirmed for this model." }),
    cd
      ? seg(9, 9, vin, "Check digit", "Real check digit on this model", { status: "standard" })
      : seg(9, 9, vin, "Fixed code", "0 (not a check digit on this model)", { status: "standard" }),
  ];
}

// ── Land Rover (SAL) ──
const LAND_ROVER: Chassis = {
  CA: ["Discovery Sport", "L550"], RA: ["Discovery", "L462"], LA: ["Discovery", "L319 (Discovery 3/4)"],
  WA: ["Range Rover Sport", "L494"], LS: ["Range Rover Sport", "L320"],
  VA: ["Range Rover Evoque", "L538"], GA: ["Range Rover", "L405"], ZA: ["Range Rover Velar", "L560"],
  FA: ["Freelander 2", "L359"], LD: ["Defender", "Classic 90/110"],
};
const LR_PLANT: Record<string, string> = { A: "Solihull, UK", H: "Halewood, UK" };

export const subaru: MakeRule = {
  // Position 9 is not a check digit on Australian Subarus (only 8.6% of 400,430 AU recall VINs pass — chance level).
  id: "subaru", make: "Subaru", wmis: ["JF1", "JF2"], checkDigit: "no", modelYear: "yes",
  decode: chassisDecode("Subaru", SUBARU, (v) => (v[10] === "G" ? "Gunma, Japan" : null), "Body / engine / restraint", subaruDetail),
};
export const honda: MakeRule = {
  id: "honda", make: "Honda", wmis: ["JHM", "JHL", "MRH"], checkDigit: "mixed", modelYear: "yes",
  decode: chassisDecode("Honda", HONDA, hondaPlant, "Grade / engine", hondaDetail),
};
// Land Rover positions 6-8 (added 2026-11-09). Modern rest-of-world layout: 6 = doors, 8 = engine.
// Sources: JLR US Part 565 charts (ORG12962, ORG15262, ORG13378) and ~20,000 Australian Land Rover
// recall VINs, incl. engine-specific recalls (REC-001678 AJ21 2.0 diesel = 100% N; REC-001173
// Ingenium 2.0 petrol = 100% X; REC-005703 L462). Position 7 is not decoded.
const LR_ENGINE: Record<string, string> = {
  N: "2.0L Ingenium turbo diesel (AJ20D)", K: "3.0L V6 turbo diesel (TDV6 / Td6)", X: "2.0L Ingenium turbo petrol (AJ20P)",
};
const LR_DOORS: Record<string, string> = { "2": "5-door wagon" };
function landRoverDetail(vin: string, s: Partial<VinSummary>): VinSegment[] {
  if (vin.slice(3, 5) === "LD") {
    // Classic Defender, older rest-of-world layout (lrman.ru Defender 2007 VIN codes + defender2.net):
    // 6 wheelbase (H = 110), 7 body (M = 5-door station wagon), 8 engine (S = 2.4L Td4 EU4),
    // 9 steering + gearbox (7 = RHD 6-speed manual) — not a check digit.
    const wb = vin[5] === "H" ? "110" : null, body = vin[6] === "M" ? "5-door station wagon" : null;
    const eng = vin[7] === "S" ? "2.4L turbo diesel (EU4)" : null;
    const tr = vin[8] === "7" ? "Right-hand drive, 6-speed manual" : null;
    if (body) s.body = body;
    if (eng) Object.assign(s, { engine: eng, engineLitres: "2.4", fuel: "Diesel" });
    if (tr) s.transmission = "6-speed manual";
    return [
      seg(6, 6, vin, "Wheelbase", wb), seg(7, 7, vin, "Body", body), seg(8, 8, vin, "Engine", eng),
      seg(9, 9, vin, "Steering / transmission", tr, { note: "Not a check digit on the classic Defender." }),
    ];
  }
  const doors = LR_DOORS[vin[5]] ?? null; if (doors) s.body = doors;
  const eng = LR_ENGINE[vin[7]] ?? null;
  if (eng) Object.assign(s, { engine: eng, engineLitres: eng.slice(0, 3), fuel: /diesel/i.test(eng) ? "Diesel" : "Petrol" });
  return [
    seg(6, 6, vin, "Body", doors, doors ? {} : { note: "Not yet confirmed." }),
    seg(7, 7, vin, "Descriptor", null, { note: "Not decoded (almost always A on Australian cars)." }),
    seg(8, 8, vin, "Engine", eng, eng ? {} : { note: "This Land Rover engine letter is not yet confirmed." }),
  ];
}

export const landRover: MakeRule = {
  id: "land-rover", make: "Land Rover", wmis: ["SAL"], checkDigit: "mixed", modelYear: "yes",
  decode: chassisDecode("Land Rover", LAND_ROVER, (v) => LR_PLANT[v[10]] ?? null, "Body / engine / restraint", landRoverDetail),
};
