// Elroco VIN Decoding Code — Ford Thailand / South Africa Ranger & Everest (positions 4–12),
// plus North-American and European Ford, RAM, Chevrolet and Dodge rules (added 2026-11-13).
//
// ── Sources ──────────────────────────────────────────────────────────────────────────────
// [FWM] Ford Ranger 2011.50MY Workshop Repair Manual, section 100-01 Identification Codes, pages
//       100-01-10 to 100-01-12 "Unique VIN – Manufactured in AutoAlliance Thailand (AAT)" (Elroco
//       folder: Desktop\Elroco\Vehicle Resources\Ford\383428323-313055460-FORD-RANGER-Workshop-Manual.pdf,
//       PDF pages 82–84 — local file; the file name carries Scribd document numbers 383428323 / 313055460).
//       It gives: 1–3 MNA = Australia (RHD)/New Zealand (RHD), MNB = Thailand + RHD Asia,
//       4 airbags (B, D, L, U, W), 5 production source (M = Thailand), 6 body style (A, B, E, F, 1, 2),
//       7 GVM (E, F), 8 engine (3, 0, 2, 8, 5), 9 constant 0, 10 PRODUCTION year for Australia,
//       11 plant (W = AutoAlliance Thailand), 12–17 serial. Pages 100-01-5/-8 give AFA (Silverton,
//       South Africa) with plant J = Silverton Assembly Plant.
// [CG]  carsguide.com.au used-car listings with VIN + series + variant + engine + body + drive,
//       harvested 2026-11-12 (Ranger 532, Everest 201 listings). Each code below lists example listing
//       URLs; every one of the listed codes was seen on at least two independent dealers' listings.
// [SPEC] Ford Australia "Ranger 2026MY Specifications" (Elroco folder 2026my-ranger-specifications-final.pdf,
//       https://www.ford.com.au/ spec PDF): XL 4x2 Hi-Rider = 2.0L Single Turbo 125 kW; XLT 4x2 Hi-Rider
//       and 4x4 = 2.0L Bi-Turbo 154 kW; 3.0L V6.
//
// What these VINs do NOT carry (the app must ask): drive (4x2 / 4x4 — Hi-Rider 4x2 and 4x4 share
// every VIN character), transmission (manual / automatic), trim (XL/XLS/XLT/Wildtrak/Raptor share codes),
// engine power version (2.2 PX vs PX MkII), and on the Everest the engine itself.

import { filler, seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear, yearCandidates } from "../modelYear";

// ── Ranger / Everest: Thai (MNA, MPB) and South African (AFA) Australian-market layout ───────────

// Position 4 — airbags [FWM]. Next-Gen Rangers (2022+) all carry C, which is not in the 2011 table.
const RG_AIRBAG: Record<string, string> = {
  B: "Seat belts only",
  D: "Driver airbag",
  L: "Driver and passenger airbags",
  U: "Driver, passenger, side and side-curtain airbags",
  W: "Driver, passenger and side-curtain airbags",
};
// Position 6 — body style [FWM]; same letters on Next-Gen VINs, matched by listing body/doors/seats [CG].
const RG_BODY: Record<string, [body: string, cab: string]> = {
  A: ["Single cab-chassis", "Single cab"],
  B: ["Single cab pick-up", "Single cab"],
  E: ["Double cab-chassis", "Double cab"],
  F: ["Double cab pick-up", "Double cab"],
  "1": ["Super cab-chassis (Ford: RAP cab)", "Super cab"],
  "2": ["Super cab pick-up (Ford: RAP cab)", "Super cab"],
};
// Position 7 — GVM class [FWM] (PX-family layout only).
const RG_GVM: Record<string, string> = { E: "GVM 2,722–3,175 kg", F: "GVM 3,176–3,629 kg" };

type Eng = { name: string; litres: string; cyl: string; fuel: string | null; note: string };
// Position 8 — engine. PX family (airbag letter B/D/L/U/W): codes 3, 0, 2, 8, 5 from [FWM];
// code 6 (2.0 bi-turbo, PX MkIII) from [CG] only (≈60 listings, e.g. carsguide 15097562, 15312541).
const RG_ENGINE_PX: Record<string, Eng> = {
  "3": { name: "2.5L 4-cyl petrol", litres: "2.5", cyl: "4", fuel: "Petrol", note: "Ford workshop manual 100-01-11." },
  "0": { name: "2.2L 4-cyl turbo diesel (low-power version)", litres: "2.2", cyl: "4", fuel: "Diesel", note: "Ford workshop manual 100-01-11." },
  "2": { name: "2.2L 4-cyl turbo diesel (mid-power version)", litres: "2.2", cyl: "4", fuel: "Diesel", note: "Ford workshop manual 100-01-11." },
  "8": { name: "2.2L 4-cyl turbo diesel (high-power version)", litres: "2.2", cyl: "4", fuel: "Diesel", note: "Ford workshop manual 100-01-11; Australian listings agree (e.g. carsguide 15244089, 14869766)." },
  "5": { name: "3.2L 5-cyl turbo diesel", litres: "3.2", cyl: "5", fuel: "Diesel", note: "Ford workshop manual 100-01-11; Australian listings agree (e.g. carsguide 15173346)." },
  // 6: every PX Ranger on the 10R80 transmission recalls REC-000320 / REC-006683 (~19,400 VINs) carries 6, and
  // Ford pairs the 10-speed only with the new 2.0 bi-turbo (Fleet Auto News MY19 Ranger) + listings.
  "6": { name: "2.0L 4-cyl bi-turbo diesel", litres: "2.0", cyl: "4", fuel: "Diesel", note: "10R80 recall VIN lists REC-000320 / REC-006683 + Australian listings." },
};
// HELD BACK 2026-11-13 (lead): carsguide listings are one platform, so codes seen only there need a
// second independent source (recall VIN lists, workshop manual, parts-catalogue VIN prefixes) before use.
// Second sources found 2026-11-13 (Australian recall VIN lists, independent of the listings):
// Next-Gen (airbag letter C, 2022+): all from [CG]; 9 vs 6 split cross-checked with [SPEC]
// (XL Hi-Rider 4x2 listings carry 9 and the spec sheet gives that variant only the single-turbo engine).
// HELD BACK 2026-11-13 (lead): carsguide listings are one platform, so codes seen only there need a
// second independent source (recall VIN lists, workshop manual, parts-catalogue VIN prefixes) before use.
// Next-Gen engines — listings + Australian recall VIN lists (2026-11-13):
// 7: REC-006341 "3.0L Lion engine" — every Next-Gen Ranger on its 13,490-VIN list is 7.
// 6: REC-005759 (2.0 Bi-Turbo e-Shifter software recall) — all 3,532 Next-Gen Rangers are 6.
// 9: REC-006705 (MY26.5, built from 26 Nov 2025) — 6 drops to one vehicle and 9 rises to 1,654 as Ford replaced
//    the bi-turbo with the revised single-turbo (MyNRMA MY26). 9 covers two engine versions (see note).
// 2: REC-006572 (2.3 EcoBoost EGR) — all 44 Rangers are AFA…2 (PHEV, Silverton).
// Held back: 1 (Raptor 3.0 V6 petrol) — only shown by elimination, no recall names it alone.
const RG_ENGINE_NEXTGEN: Record<string, Eng> = {
  "6": { name: "2.0L 4-cyl bi-turbo diesel", litres: "2.0", cyl: "4", fuel: "Diesel", note: "Recall REC-005759 VIN list + Australian listings." },
  "9": { name: "2.0L 4-cyl single-turbo diesel (two versions — check the build date)", litres: "2.0", cyl: "4", fuel: "Diesel",
    note: "Recall REC-006705 VIN list + listings + MyNRMA. Parts warning: from MY26.5 (built from late Nov 2025) this is a revised engine with a timing chain and new fuel injection, replacing the earlier wet-belt single-turbo — engine parts differ, so confirm the build date." },
  "7": { name: "3.0L V6 turbo diesel (Lion)", litres: "3.0", cyl: "6", fuel: "Diesel", note: "Recall REC-006341 (3.0L Lion engine) VIN list + Australian listings." },
  "2": { name: "2.3L 4-cyl petrol plug-in hybrid (Ranger PHEV)", litres: "2.3", cyl: "4", fuel: "Petrol / plug-in hybrid", note: "Recall REC-006572 VIN list (2.3 EcoBoost; all Rangers on it are PHEVs) + listings." },
};
const RG_PLANT: Record<string, string> = {
  W: "AutoAlliance Thailand (Rayong)", // [FWM] 100-01-12
  X: "Ford Thailand Manufacturing (FTM)", // WMI MPB = Ford Thailand Manufacturing (Wikibooks Ford WMI list); X on every MPB listing
  J: "Silverton, South Africa", // [FWM] AFA structure, plant J = Silverton Assembly Plant
};

/** PX-family series from the production-year letter (position 10). Listing evidence [CG]:
 *  C, D, E → only "PX"; F → both "PX" and "PX MkII"; G, H → only "PX MkII"; J → both MkII and MkIII;
 *  K–N → only "PX MkIII". Engine 6 (2.0 bi-turbo) exists only in PX MkIII. */
function pxSeries(year: number | null, eng: string): string | null {
  // ANCAP (PX rating Mar 2014 – Aug 2015; PX II from 09/2015; PX III "introduced in 2018") + listings
  // + the 10R80 recall lists (2.0 bi-turbo = MkIII only, including a few 2017-year builds).
  if (!year) return null;
  if (eng === "6") return "PX MkIII";
  if (year >= 2011 && year <= 2014) return "PX";
  if (year === 2015) return "PX or PX MkII (2015 change-over — check the build plate)";
  if (year === 2016 || year === 2017) return "PX MkII";
  if (year === 2018) return "PX MkII or PX MkIII (2018 change-over — check the build plate)";
  if (year >= 2019 && year <= 2022) return "PX MkIII";
  return null;
}

function isRangerLayout(vin: string): boolean {
  // Ranger PX-family / Next-Gen VINs: production source M in position 5, constant 0 in position 9.
  return vin[4] === "M" && vin[8] === "0" && (vin[3] in RG_AIRBAG || vin[3] === "C");
}
function isEverestLayout(vin: string): boolean {
  return vin.slice(4, 6) === "XX" && vin[6] === "M" && vin[8] === "W";
}

/**
 * Positions 4–8 of an MNA / MPB (and AFA Next-Gen) Ranger or Everest VIN.
 * Fills `summary` with model / series / body / engine where confirmed. Returns [] when the VIN
 * is not in either confirmed layout (e.g. the 2006–2011 PJ/PK Ranger, which uses another layout).
 */
export function decodeRangerThai(vin: string, summary: Partial<VinSummary>): VinSegment[] {
  if (isEverestLayout(vin)) return decodeEverest(vin, summary).filter((s) => s.from >= 4 && s.to <= 8);
  if (!isRangerLayout(vin)) return [];
  return decodeRanger(vin, summary).filter((s) => s.from >= 4 && s.to <= 8);
}

function decodeRanger(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const nextGen = vin[3] === "C";
  s.make = "Ford"; s.model = "Ranger";
  const year = (() => { const c = yearCandidates(vin[9]).filter((y) => y >= 2011 && y <= 2035); return c.length === 1 ? c[0] : null; })();
  const engTable = nextGen ? RG_ENGINE_NEXTGEN : RG_ENGINE_PX;
  const eng = engTable[vin[7]];
  if (eng) { s.engine = eng.name; s.engineLitres = eng.litres; s.engineCylinders = eng.cyl; if (eng.fuel) s.fuel = eng.fuel; }
  s.series = nextGen ? "Next-Gen (listed as PY in Australia)" : pxSeries(year, vin[7]);
  const body = RG_BODY[vin[5]];
  if (body) s.body = body[0];
  const airbag = nextGen ? null : RG_AIRBAG[vin[3]] ?? null;
  if (airbag) s.restraint = airbag;
  const gvm = nextGen ? null : RG_GVM[vin[6]] ?? null;
  const plant = RG_PLANT[vin[10]] ?? null;
  if (plant) s.plant = plant;
  if (year) s.modelYear = year;
  return [
    seg(4, 4, vin, nextGen ? "Restraint code (Next-Gen Ranger)" : "Airbags", nextGen ? "Next-Gen Ranger (2022 on)" : airbag, nextGen
      ? { note: "Every Next-Gen Ranger carries C here; the airbag meaning of C is not in a Ford table we hold, so only the generation is decoded." }
      : airbag ? {} : { note: "Not in the Ford table." }),
    seg(5, 5, vin, "Production source", vin.startsWith("AFA") ? null : "Thailand", vin.startsWith("AFA") ? { note: "South African-built Ranger; meaning of this letter on AFA VINs not confirmed." } : {}),
    seg(6, 6, vin, "Body style / cab", body ? body[0] : null, body ? {} : { note: "Not in the Ford table." }),
    seg(7, 7, vin, "GVM class", gvm, nextGen ? { note: "Next-Gen Rangers use E and F here as well; not confirmed as the same GVM bands, so not decoded." } : gvm ? {} : { note: "Not in the Ford table." }),
    seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? { note: eng.note } : { note: "Engine code not confirmed for this Ranger generation." }),
    { from: 9, to: 9, chars: vin[8], label: "Constant", value: "0 (Ford Thailand constant — not a check digit)", status: "standard" },
    seg(10, 10, vin, "Year of production", year ? String(year) : null, { status: "standard", note: "Ford: for Australia this is the PRODUCTION year, not a model year (workshop manual 100-01-12)." }),
    seg(11, 11, vin, "Assembly plant", plant),
    { from: 12, to: 17, chars: vin.slice(11), label: "Production sequence number", value: vin.slice(11), status: "standard" },
  ];
}

// ── Everest (MNA, European-style Ford layout: 4 body, 5–6 XX, 7 source, 8 plant, 9 line, 10 body,
// 11 year, 12 month). Model + generation from the whole code block, confirmed by [CG] listings:
// "AXXMAWA" on every UA / UA II Everest (e.g. carsguide listings of 2015–2022 Everests, and
// https://easyauto123.com.au/buy/used-cars/details/used-car-report/MNAAXXMAWAHU42924),
// "RXXMAWR" on every Next-Gen (UB) Everest (2022 on). Engine and drive are NOT in these VINs
// (2.0 bi-turbo, 3.2 5-cyl, 3.0 V6; RWD/4WD all share the same block).
const EVEREST_BLOCK: Record<string, string> = { AXXMAWA: "UA / UA II", RXXMAWR: "Next-Gen (listed as UB in Australia)" };

function decodeEverest(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const gen = EVEREST_BLOCK[vin.slice(3, 10)] ?? null;
  s.make = "Ford";
  if (gen) { s.model = "Everest"; s.body = "Wagon / SUV"; }
  const year = (() => { const c = yearCandidates(vin[10]).filter((y) => y >= 2014 && y <= 2035); return c.length === 1 ? c[0] : null; })();
  let series = gen;
  if (gen === "UA / UA II" && year) {
    // Listing evidence: F, G, H only "UA"; J both; K–N only "UA II".
    // ANCAP: Everest introduced Oct 2015, updated (UA II) Aug 2018; REC-000320 shows a few 2017-year Everests
    // already on the UA II 10-speed, so 2017 is shown as either.
    series = year <= 2016 ? "UA" : year <= 2018 ? "UA or UA II (change-over — check the build plate)" : "UA II";
  }
  if (series) s.series = series;
  if (year) s.modelYear = year;
  return [
    seg(4, 10, vin, "Model / generation block", gen ? `Everest ${series}` : null, gen
      ? { note: "Decoded as one block (Australian recall VIN lists + listings). Engine and drive are not carried in an Everest VIN." }
      : { note: "Not a confirmed Everest code block." }),
    seg(11, 11, vin, "Year of production", year ? String(year) : null, { status: "standard" }),
    seg(12, 12, vin, "Month of production", null, { note: "Ford month letter; the letter table for these years is not confirmed." }),
    { from: 13, to: 17, chars: vin.slice(12), label: "Production sequence number", value: vin.slice(12), status: "standard" },
  ];
}

/** Full replacement rule for Ford Thailand / South Africa Rangers and Everests (MNA, MPB, AFA). */
export const fordRangerEverest: MakeRule = {
  id: "ford-ranger-everest", make: "Ford", wmis: ["MNA", "MPB", "AFA"],
  // Everest blocks confirmed 2026-11-13: AXXMAWA on every Everest in the 10R80 recalls (UA II), RXXMAWR on
  // every Next-Gen Everest in REC-006341 / 005759 / 006358 / 006748.
  match: (vin) => isRangerLayout(vin) || isEverestLayout(vin),
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ford" };
    const segments = isEverestLayout(vin) ? decodeEverest(vin, s) : decodeRanger(vin, s);
    return { segments, summary: { ...s, serial: vin.slice(isEverestLayout(vin) ? 12 : 11) } };
  },
};


// ── Ford USA passenger cars (WMI 1FA): Mustang S550 / S650, Flat Rock ─────────────────────────
// [F565] Ford Part 565 VIN decoders filed with NHTSA (vPIC manufacturer documents, Ford Motor Company):
//        2016 Mustang page (https://vpic.nhtsa.dot.gov/mid/home/displayfile/c7e812c4-d5eb-4c22-b6ec-5f3231b7febb, p.12)
//        and 2020 Mustang page (…/displayfile/87906d32-2802-421f-8c95-0fdb52067a5b, p.9).
// [FSM]  Ford 2024 Mustang workshop manual 100-01 Identification Codes (Ford service manual extract,
//        https://themustangsource.com/forums/attachments/f884/217050d1695513156-2024-mustang-shop-manual-identification-codes-jacking-points-nvh-terms-2024-mustangidentificationcodes.pdf).
// [VPIC] NHTSA vPIC decodes of the Australian VINs (https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/<VIN>).
// [CG]   carsguide.com.au listings of Australian Mustangs with VIN + series + variant + engine.
// Australian (right-hand-drive) cars from model year 2018 carry RHD line codes (N, L, P, E) that are NOT in
// Ford's US filings; those are decoded from Australian listings only (each seen on 2+ independent dealers)
// and say so in the note.
const MUSTANG_LINE_2015_17: Record<string, string> = {
  // [F565 2016] + [VPIC] + [CG] (P8C/P8T as "Fastback GT 5.0 V8" / "Fastback 2.3 GTDi")
  C: "GT Fastback (Ford: GT Coupe)", F: "GT Convertible", T: "EcoBoost 2.3 Fastback (Ford: I4 Coupe)", U: "EcoBoost 2.3 Convertible (Ford: I4 Convertible)",
};
// HELD BACK 2026-11-13 (lead): carsguide listings are one platform, so codes seen only there need a
// second independent source (recall VIN lists, workshop manual, parts-catalogue VIN prefixes) before use.
// Still pending: 2018–23 L (EcoBoost Fastback) and E (Mach 1), 2019 V (Bullitt, by inference only).
// Confirmed 2026-11-13 from Australian recall VIN lists REC-005468 / 006451 / 006471 / 006409 / 006712 / 006572,
// each code always paired with the matching engine letter from Ford's own tables.
const MUSTANG_LINE_RHD_2018_23: Record<string, string> = {
  P: "GT Convertible, right-hand drive", // [VPIC] 1FATP8PF2J5149036 = GT Convertible + [CG] listings
  N: "GT Fastback, right-hand drive", // REC-005468: 1FA6P8NF, restraint 6 (Fastback) + engine F (GT)
};
const MUSTANG_LINE_RHD_2024: Record<string, string> = {
  N: "GT Fastback, right-hand drive", // REC-006712, always engine F (5.0 GT)
  P: "GT Convertible, right-hand drive", // REC-006712, engine F with convertible restraint R
  E: "Dark Horse, right-hand drive", // REC-006712, only ever engine 0 (Ford 2024 shop manual: Dark Horse 5.0)
  L: "EcoBoost 2.3 Fastback, right-hand drive", // ~583 VINs 1FATP8LH; REC-006572 Mustangs are all L/H, "EcoBoost variants"
};
const MUSTANG_ENGINE: Record<string, [string, string, string]> = {
  F: ["5.0L V8 Ti-VCT petrol (Coyote)", "5.0", "8"], // [F565 2016, 2020] + [FSM 2024]
  H: ["2.3L 4-cyl turbo petrol (EcoBoost)", "2.3", "4"], // [F565 2016, 2020] + [FSM 2024]
  D: ["2.3L 4-cyl turbo petrol (EcoBoost)", "2.3", "4"], // [F565 2020] + [CG] "2.3 GTDi" listings
  "0": ["5.0L V8 4V petrol (Mach 1 / Bullitt / Dark Horse version)", "5.0", "8"], // [F565 2020] + [FSM 2024]
};
const MUSTANG_RESTRAINT: Record<string, string> = {
  // [F565 2016, 2020]; same letters on 2015–2023 Australian Fastbacks (6) and Convertibles (T) [CG]
  "6": "Front airbags, front knee airbags, side airbags rows 1 and 2 (Fastback)",
  T: "Front airbags, front knee airbags, side airbags row 1 (Convertible)",
};

export const fordUSCar: MakeRule = {
  id: "ford-us-mustang", make: "Ford", wmis: ["1FA"],
  match: (vin) => vin.slice(4, 6) === "P8",
  checkDigit: "yes", modelYear: "yes", years: [2015, 2030],
  decode(vin) {
    const y = resolveModelYear(vin[9], 2015, 2030);
    const s: Partial<VinSummary> = { make: "Ford", model: "Mustang", modelYear: y };
    const c = vin[6];
    let line: string | null = null; let lineNote = "";
    if (y && y <= 2017) { line = MUSTANG_LINE_2015_17[c] ?? null; lineNote = "Ford Part 565 filing (2016) and NHTSA decode."; }
    else if (y && y <= 2023) { line = MUSTANG_LINE_RHD_2018_23[c] ?? null; lineNote = "Australian right-hand-drive code (NHTSA decode + Australian listings)."; }
    else if (y) { line = MUSTANG_LINE_RHD_2024[c] ?? null; lineNote = "Australian right-hand-drive code (Australian recall VIN lists + listings)."; }
    if (y) s.series = y <= 2017 ? "S550 (listed as FM in Australia)" : y <= 2023 ? "S550 update (listed as FN in Australia)" : "S650 (listed as FO in Australia)";
    if (line) { s.trim = line.split(",")[0]; s.body = /Convertible/.test(line) ? "Convertible" : /Fastback/.test(line) ? "Fastback (coupe)" : null; }
    const e = MUSTANG_ENGINE[vin[7]];
    if (e) { s.engine = e[0]; s.engineLitres = e[1]; s.engineCylinders = e[2]; s.fuel = "Petrol"; }
    const restraint = y && y <= 2023 ? MUSTANG_RESTRAINT[vin[3]] ?? null : null;
    if (restraint) s.restraint = restraint;
    s.drive = "RWD"; // every Mustang in these filings is rear-wheel drive (Ford Part 565 + listings)
    if (vin[10] === "5") s.plant = "Flat Rock, Michigan, USA";
    return {
      segments: [
        seg(4, 4, vin, "Restraint system", restraint, restraint ? {} : { note: "Not confirmed for this model year." }),
        seg(5, 6, vin, "Car line", "Ford Mustang"),
        seg(7, 7, vin, "Series / body", line, line ? { note: lineNote } : { note: "Code not confirmed for this model year." }),
        seg(8, 8, vin, "Engine", e?.[0] ?? null, e ? {} : { note: "Engine code not confirmed." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", vin[10] === "5" ? "Flat Rock, Michigan, USA" : null),
      ],
      summary: s,
    };
  },
};

// ── Ford of Europe layout (WF0; same layout on Thai-built MNB/MPB Fiesta/Focus and AFA Focus) ─────
// Positions: 4 body, 5–6 "XX" constant, 7 product source, 8 assembly plant, 9 model line, 10 body,
// 11 year of manufacture, 12 month of manufacture, 13–17 serial.
// [TVM] Ford Transit VM 2006–2013 workshop manual 100-01 Identification Codes (Elroco folder,
//       447138360-Ford-Transit-VM-2006-2013-workshop-manual.pdf): layout above; constant X in 5–6;
//       product source B, C, D, E, F, G, H, T; year 6–A; month letters 2006–2010.
// [FWM] Ford Ranger 2011.50MY workshop manual (6FP/AFA Ford-of-Europe structure): same layout and
//       month letters for 2011–2015.
// [WB]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Ford/VIN Codes" – European VIN format
//       (https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Ford/VIN_Codes).
// Engine, transmission and drive are NOT carried in these VINs (e.g. Kuga FWD/AWD, 1.5/2.0 share codes).
const EU_SOURCE: Record<string, string> = {
  // [TVM] + [WB] agree on these.
  B: "Ford of Britain", E: "Ford of Germany affiliated assembly", G: "Ford of Germany (Ford-Werke)", T: "Turkey (Ford Otosan)",
};
// Month letters: the two Ford manuals give the same 4-year cycle (2007 = 2011 = 2015, 2008 = 2012 …).
// Applied only to 2006–2015, the years those manuals print.
const EU_MONTHS: Record<number, string> = {
  0: "BRAGCKDELYST", // 2008 [TVM], 2012 [FWM]
  1: "JUMPBRAGCKDE", // 2009 [TVM], 2013 [FWM]
  2: "LYSTJUMPBRAG", // 2006, 2010 [TVM], 2014 [FWM]
  3: "CKDELYSTJUMP", // 2007 [TVM], 2011, 2015 [FWM]
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function fordEuropeMonth(yearOfManufacture: number | null, letter: string): string | null {
  if (!yearOfManufacture || yearOfManufacture < 2006 || yearOfManufacture > 2015) return null;
  const i = EU_MONTHS[yearOfManufacture % 4].indexOf(letter);
  return i >= 0 ? MONTH_NAMES[i] : null;
}
// Model from the source + plant + line block (positions 7–9), with body letter (position 4) where the
// block is shared. Each entry was seen on 2+ independent Australian listings [CG] with that model,
// and none contradicted it.
type EuModel = { model: string; series?: (y: number | null) => string | null; body4?: Record<string, string> };
// Kept only where Wikibooks' position-9 model letters (or a recall list) agree with the listings; series
// names came from listings only, so only the model is decoded. Removed as contested: GCB, GCH, GCD, WPC, MXB.
const EU_BLOCK: Record<string, EuModel> = {
  WPM: { model: "Kuga / Escape" },
  GBB: { model: "Mondeo" },
  ERK: { model: "Puma" },
  MXJ: { model: "Fiesta", series: () => "Thai-built" },   // recall REC-000309 "FIESTA & RANGER"
  ARJ: { model: "Fiesta", series: () => "Thai-built" },   // recall REC-000309
  MXC: { model: "Focus", series: () => "Thai-built" },
  MJD: { model: "Focus", series: () => "South African-built" },
  GAJ: { model: "Fiesta" },
  GAH: { model: "Fiesta" },
};

function euYear(c: string): number | null {
  const ys = yearCandidates(c).filter((y) => y >= 2000 && y <= 2030);
  return ys.length === 1 ? ys[0] : null;
}

export const fordEurope: MakeRule = {
  id: "ford-europe", make: "Ford", wmis: ["WF0", "NM0", "MNB", "MPB", "AFA"],
  // MPB / AFA also carry Rangers in another layout; this rule only takes Ford-of-Europe-layout VINs
  // that are not Everests (Everest is decoded by fordRangerEverest).
  match: (vin) => vin.slice(4, 6) === "XX" && !isEverestLayout(vin),
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ford" };
    const blk = EU_BLOCK[vin.slice(6, 9)];
    const y = euYear(vin[10]);
    let model: string | null = null; let series: string | null = null;
    if (blk) {
      if (blk.body4) { const b = blk.body4[vin[3]]; if (b) { model = blk.model; series = b; } }
      else { model = blk.model; series = blk.series?.(y) ?? null; }
    }
    // Transit Custom (Ford Otosan, block TTG) — body letters Y and Z only appear on Transit Custom listings.
    if (!model && vin.slice(6, 9) === "TTG" && (vin[3] === "Y" || vin[3] === "Z")) { model = "Transit Custom"; series = "VN"; }
    if (model) s.model = model; if (series) s.series = series;
    const src = EU_SOURCE[vin[6]] ?? null;
    const plant = vin.slice(6, 8) === "TT" ? "Kocaeli (Gölcük / Izmit), Turkey" : vin.slice(6, 8) === "GB" ? "Genk, Belgium" : null;
    if (plant) s.plant = plant;
    if (y) s.modelYear = y;
    const month = fordEuropeMonth(y, vin[11]);
    return {
      segments: [
        seg(4, 4, vin, "Body type", null, { note: "Ford body letters differ by model line; not decoded." }),
        filler(5, 6, vin, "Constant XX on Ford-of-Europe-layout VINs (Ford workshop manual)."),
        seg(7, 7, vin, "Product source", src, src ? {} : { note: "Not confirmed by two sources." }),
        seg(8, 8, vin, "Assembly plant", plant, plant ? {} : { note: "Plant letter depends on position 7; not confirmed by two sources for this pair." }),
        seg(9, 9, vin, "Model line", model ? `${model}${series ? ` — ${series}` : ""}` : null, model
          ? { note: "Decoded from positions 7–9 (and 4) together, matched against Australian listings." }
          : { note: "Model-line letters are reused between eras; this block is not confirmed." }),
        seg(10, 10, vin, "Body type (repeat)", null, { note: "Repeats position 4; not decoded." }),
        seg(11, 11, vin, "Year of manufacture", y ? String(y) : null, { status: "standard", note: "Year the vehicle was built (Ford manual), not a model year." }),
        seg(12, 12, vin, "Month of manufacture", month, month ? {} : { note: "Ford month letters confirmed for 2006–2015 builds only." }),
        { from: 13, to: 17, chars: vin.slice(12), label: "Production sequence number", value: vin.slice(12), status: "standard" },
      ],
      summary: { ...s, serial: vin.slice(12) },
    };
  },
};

// ── RAM trucks (FCA US / Stellantis; WMIs 1C6 USA, 3C6 / 3C7 Mexico) ──────────────────────────────
// Australian RAMs are remanufactured to right-hand drive in Australia (Ateco / American Special Vehicles)
// and keep the original US VIN: Australian listings carry US-layout VINs with valid check digits that
// NHTSA vPIC decodes cleanly (e.g. carsguide listings below), so the US tables apply.
// [FCA21] FCA US LLC "2021 Truck / MPV Vehicle Identification Number Code Guide", 12 Feb 2021
//         (vPIC manufacturer document ORG18772, https://vpic.nhtsa.dot.gov/mid/home/displayfile/<id> — FCA US LLC 2021).
// [FCA26] FCA US LLC "2026 Vehicle Identification Number Code Guide" (vPIC ORG26092), pages 11–12.
// [VPIC]  NHTSA vPIC decodes of the Australian VINs (https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/<VIN>).
// NOTE for parts: FCA's VIN trim names are US names. Australian badges differ — e.g. the Australian
// DS "Express" decodes as FCA "Tradesman", "Warlock" as Tradesman or SLT. Trim is NOT a reliable fitment
// key here; cab, bed, drive and engine are.
const RAM_GVWR: Record<string, string> = {
  // [FCA21] + [FCA26] agree.
  R: "GVWR 6,001–7,000 lb (2,722–3,175 kg); front and side airbags all rows",
  S: "GVWR 7,001–8,000 lb (3,176–3,628 kg); front and side airbags all rows",
  L: "GVWR 8,001–9,000 lb (3,629–4,082 kg); front and front-row side airbags",
  M: "GVWR 9,001–10,000 lb (4,083–4,535 kg); front and front-row side airbags",
  T: "GVWR 8,001–9,000 lb (3,629–4,082 kg); front and side airbags all rows",
  U: "GVWR 9,001–10,000 lb (4,083–4,535 kg); front and side airbags all rows",
  "3": "GVWR 10,001–14,000 lb (4,536–6,350 kg); active belts",
};
type RamLine = [model: string, series: string, drive: string, cab: string, fcaTrim: string];
// DT Ram 1500 (MY2019 on) — [FCA21] p.2 + [FCA26] p.11; [VPIC] agrees on F, G, H, J, L, M, U for AU VINs.
const RAM_DT: Record<string, [cab: string, fcaTrim: string]> = {
  B: ["Quad Cab", "Big Horn / Lonestar"], C: ["Quad Cab", "Tradesman"],
  F: ["Crew Cab, short bed", "Big Horn / Lonestar"], G: ["Crew Cab, short bed", "Tradesman"],
  H: ["Crew Cab, short bed", "Limited"], J: ["Crew Cab, short bed", "Laramie"], L: ["Crew Cab, short bed", "Rebel"],
  M: ["Crew Cab, long bed", "Big Horn / Lonestar"], N: ["Crew Cab, long bed", "Tradesman"],
  P: ["Crew Cab, long bed", "Limited"], R: ["Crew Cab, long bed", "Laramie"],
};
// DS Ram 1500 Classic (MY2019–2023) — [FCA21] p.2 (right column); [VPIC] agrees on F, K, L for AU VINs.
const RAM_DS: Record<string, [cab: string, fcaTrim: string]> = {
  A: ["Regular Cab, short bed", "Tradesman"], B: ["Regular Cab, short bed", "SLT"],
  D: ["Regular Cab, long bed", "Tradesman"], E: ["Regular Cab, long bed", "SLT"],
  F: ["Quad Cab", "Tradesman"], G: ["Quad Cab", "SLT"],
  K: ["Crew Cab, short bed", "Tradesman"], L: ["Crew Cab, short bed", "SLT"], X: ["Crew Cab, short bed", "SSV"],
  S: ["Crew Cab, long bed", "Tradesman"], T: ["Crew Cab, long bed", "SLT"],
};
// DJ Ram 2500 4WD (R5x) — [FCA21] p.3 + [FCA26] p.12 agree on A–F, H, J, K, R, S; [VPIC] agrees on C, F, J.
const RAM_DJ: Record<string, [cab: string, fcaTrim: string]> = {
  A: ["Regular Cab", "Tradesman"], B: ["Regular Cab", "Big Horn"],
  C: ["Crew Cab, short wheelbase", "Tradesman"], D: ["Crew Cab, short wheelbase", "Big Horn"],
  S: ["Crew Cab, short wheelbase", "Limited"], F: ["Crew Cab, short wheelbase", "Laramie"],
  H: ["Crew Cab, long wheelbase", "Tradesman"], J: ["Crew Cab, long wheelbase", "Big Horn"],
  R: ["Crew Cab, long wheelbase", "Limited"], K: ["Crew Cab, long wheelbase", "Laramie"],
};
// D2 Ram 3500 single rear wheel 4WD (R3x) — [FCA21] p.3; [VPIC] agrees on S (3C63R3SL… = Limited).
const RAM_D2: Record<string, [cab: string, fcaTrim: string]> = {
  A: ["Regular Cab", "Tradesman"], B: ["Regular Cab", "Big Horn"],
  C: ["Crew Cab, short bed", "Tradesman"], D: ["Crew Cab, short bed", "Big Horn"], S: ["Crew Cab, short bed", "Limited"],
  E: ["Crew Cab, short bed", "Laramie"], F: ["Crew Cab, short bed", "Longhorn"],
  G: ["Crew Cab, long bed", "Tradesman"], H: ["Crew Cab, long bed", "Big Horn"], R: ["Crew Cab, long bed", "Limited"],
  J: ["Crew Cab, long bed", "Laramie"], K: ["Crew Cab, long bed", "Longhorn"],
};
const RAM_ENGINE: Record<string, [string, string, string, string]> = {
  T: ["5.7L V8 petrol (HEMI)", "5.7", "8", "Petrol"], // [FCA21] + [FCA26] + [VPIC]
  G: ["3.6L V6 petrol (Pentastar)", "3.6", "6", "Petrol"], // [FCA21] + [FCA26]
  M: ["3.0L V6 turbo diesel (EcoDiesel)", "3.0", "6", "Diesel"], // [FCA21] + [VPIC]
  "9": ["6.2L V8 supercharged petrol (TRX)", "6.2", "8", "Petrol"], // [FCA21] + [VPIC]
  P: ["3.0L 6-cyl twin-turbo petrol (Hurricane)", "3.0", "6", "Petrol"], // [FCA26] + [VPIC]
  J: ["6.4L V8 petrol (HEMI)", "6.4", "8", "Petrol"], // [FCA21] + [FCA26] + [VPIC]
  L: ["6.7L 6-cyl turbo diesel (Cummins)", "6.7", "6", "Diesel"], // [FCA21] + [FCA26] + [VPIC]
};
const RAM_PLANT: Record<string, string> = {
  N: "Sterling Heights, Michigan, USA", G: "Saltillo Truck Assembly, Mexico", // [FCA21] + [FCA26]
  S: "Warren Truck Assembly, Michigan, USA", // [FCA21] + [VPIC]
};

function ramLine(vin: string, y: number | null): RamLine | null {
  const l = vin.slice(4, 6), c = vin[6];
  if (!y || y < 2019) return null;
  if (l === "RF" && RAM_DT[c] && y <= 2026) return ["Ram 1500", "DT", "4WD", ...RAM_DT[c]];
  if (l === "RE" && RAM_DT[c] && y <= 2026) return ["Ram 1500", "DT", "2WD", ...RAM_DT[c]];
  if (l === "RF" && c === "U" && y <= 2024) return ["Ram 1500", "DT", "4WD", "Crew Cab, short bed", "TRX"];
  if (l === "R7" && RAM_DS[c] && y <= 2023) return ["Ram 1500 Classic", "DS", "4WD", ...RAM_DS[c]];
  if (l === "R5" && RAM_DJ[c]) return ["Ram 2500", "DJ", "4WD", ...RAM_DJ[c]];
  if (l === "R3" && RAM_D2[c] && y <= 2023) return ["Ram 3500", "D2", "4WD", ...RAM_D2[c]];
  return null;
}

export const ram: MakeRule = {
  id: "ram", make: "RAM", wmis: ["1C6", "3C6", "3C7"],
  // 1C6 is also listed in fcaNorthAmerica; this rule only takes Ram truck VINs (position 5 = R).
  match: (vin) => vin[4] === "R",
  checkDigit: "yes", modelYear: "yes", years: [2010, 2035],
  decode(vin) {
    const y = resolveModelYear(vin[9], 2010, 2035);
    const s: Partial<VinSummary> = { make: "RAM", modelYear: y };
    const line = ramLine(vin, y);
    if (line) { s.model = line[0]; s.series = line[1]; s.drive = line[2]; s.body = line[3]; s.trim = `${line[4]} (US trim name)`; }
    const gv = RAM_GVWR[vin[3]] ?? null; if (gv) s.restraint = gv;
    const e = RAM_ENGINE[vin[7]];
    if (e && line) { s.engine = e[0]; s.engineLitres = e[1]; s.engineCylinders = e[2]; s.fuel = e[3]; }
    const plant = RAM_PLANT[vin[10]] ?? null; if (plant) s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "GVWR / restraint", gv, gv ? {} : { note: "Not confirmed." }),
        seg(5, 7, vin, "Model / drive / cab / series", line ? `${line[0]} (${line[1]}), ${line[2]}, ${line[3]} — FCA series ${line[4]}` : null, line
          ? { note: "FCA US names. Australian badges (Express, Warlock …) differ from the FCA series." }
          : { note: "Not confirmed for this model year." }),
        seg(8, 8, vin, "Engine", line && e ? e[0] : null, line && e ? {} : { note: "Not confirmed." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ── Chevrolet (GM North America): Silverado 1500 / HD remanufactured for Australia (GMSV / HSV),
// Corvette C8 (factory right-hand drive). AU vehicles keep the US VIN.
// [GM22] General Motors LLC "Vehicle Identification Numbering Standards", MY2022 (vPIC ORG20446),
//        pages 34 (Silverado), 35 (Silverado LTD); [GM24] same, MY2024 (vPIC ORG22099), pages 14 (Corvette),
//        29–30 (Silverado / Silverado HD); MY2019–2023 editions (ORG16929, ORG18718, ORG19096, ORG21907) list the
//        same "Non-US, Non-Canada" chassis/series codes. Body style 43 = "Four (4) Door Crew Cab/Utility" (GM22/GM24).
// [VPIC] NHTSA vPIC decodes of the Australian VINs. [CG] carsguide.com.au listings (VIN + series + variant).
// GM gives every Australian (export) truck one series code "(Non-US, Non-Canada)" — trim (LTZ, ZR2 …)
// is NOT in the VIN.
const GM_ENGINE: Record<string, [string, string, string, string]> = {
  "3GC:L": ["6.2L V8 petrol (L87)", "6.2", "8", "Petrol"], // [GM22] + [VPIC]
  "1GC:Y": ["6.6L V8 turbo diesel (L5P Duramax)", "6.6", "8", "Diesel"], // [GM24] + [VPIC]
  "1G1:4": ["6.2L V8 petrol (LT2)", "6.2", "8", "Petrol"], // [GM24] + [VPIC]
  "1G1:3": ["5.5L V8 petrol (LT6, Z06)", "5.5", "8", "Petrol"], // [GM24] + [VPIC]
};

function silverado(vin: string, y: number | null): { model: string; series: string; drive: string } | null {
  const ch = vin.slice(4, 6);
  if (!y) return null;
  if (vin.startsWith("3GC") && vin[3] === "U") {
    // 1500, MY2019–2024 export codes [GM22, GM24 + 2019–2023 editions]; [VPIC] agrees (Silverado / Silverado LTD).
    if (ch === "Y9" && y >= 2019 && y <= 2024) return { model: "Silverado 1500", series: y >= 2022 ? "T1 (pre-facelift body, sold as Silverado LTD)" : "T1", drive: "4WD" };
    if (ch === "D9" && y >= 2022 && y <= 2024) return { model: "Silverado 1500", series: "T1 facelift (2022 update)", drive: "4WD" };
  }
  if (vin.startsWith("1GC") && "012345".includes(vin[3]) && ch === "Y9" && y >= 2020 && y <= 2024) {
    return { model: "Silverado HD (2500 / 3500)", series: "T1 HD", drive: "4WD" }; // [GM24] p.30 + [VPIC] "Silverado HD"
  }
  return null;
}
const GM_HD_GVWR: Record<string, string> = {
  // [GM24] p.30 (body style 03 regular / 43 crew / 53 extended)
  "0": "Class H 9,001–10,000 lb, regular cab", "1": "Class H 9,001–10,000 lb, crew cab", "2": "Class H 9,001–10,000 lb, extended cab",
  "3": "Class 3 10,001–14,000 lb, regular cab", "4": "Class 3 10,001–14,000 lb, crew cab", "5": "Class 3 10,001–14,000 lb, extended cab",
};

export const chevrolet: MakeRule = {
  id: "chevrolet-gm-na", make: "Chevrolet", wmis: ["1GC", "3GC", "1G1"],
  checkDigit: "yes", modelYear: "yes", years: [2010, 2035],
  decode(vin) {
    const y = resolveModelYear(vin[9], 2010, 2035);
    const s: Partial<VinSummary> = { make: "Chevrolet", modelYear: y };
    const wmi = vin.slice(0, 3);
    const segs: VinSegment[] = [];
    const eng = GM_ENGINE[`${wmi}:${vin[7]}`];
    if (wmi === "1G1") {
      // Corvette C8 [GM24] p.14: 4 line Y, 5 series 9 = Non-US/Non-Canada, 6 body, 7 restraint, 8 engine.
      const c8 = vin[3] === "Y" && vin[4] === "9" && y !== null && y >= 2020 && y <= 2024; // GM editions read: 2020–2024
      const confirmedYear = y !== null && y >= 2020 && y <= 2024;
      if (c8) { s.model = "Corvette"; s.series = "C8"; s.drive = "RWD"; }
      const body = c8 && confirmedYear && vin[5] === "2" ? "Coupe, 2-door (GM body 07)" : null; // [GM24] + [CG] coupe listings
      if (body) s.body = body;
      if (eng && c8) { s.engine = eng[0]; s.engineLitres = eng[1]; s.engineCylinders = eng[2]; s.fuel = eng[3]; }
      if (c8 && vin[10] === "5") s.plant = "Bowling Green, Kentucky, USA";
      segs.push(
        seg(4, 5, vin, "Vehicle line / series", c8 ? "Chevrolet Corvette (C8), export (Non-US, Non-Canada) series" : null, c8
          ? { note: "GM gives export Corvettes one series code; trim (1LT/2LT/3LT, Z06) is not in the VIN — the engine is." }
          : { note: "Not confirmed." }),
        seg(6, 6, vin, "Body style", body, body ? {} : { note: vin[5] === "3" ? "GM lists 3 as convertible; an Australian listing contradicts it, so not decoded." : "Not confirmed." }),
        seg(7, 7, vin, "Restraint system", null, { note: "Not confirmed by two sources." }),
        seg(8, 8, vin, "Engine", c8 && eng ? eng[0] : null, c8 && eng ? {} : { note: "Not confirmed." }),
      );
    } else {
      const sv = silverado(vin, y);
      if (sv) { s.model = sv.model; s.series = sv.series; s.drive = sv.drive; s.trim = null; }
      const gv = wmi === "3GC" && vin[3] === "U" ? "Class F 7,001–8,000 lb GVWR, hydraulic brakes, crew cab" : wmi === "1GC" ? GM_HD_GVWR[vin[3]] ?? null : null;
      if (gv && sv) s.body = /crew cab/.test(gv) ? "Crew cab pick-up" : null;
      if (eng && sv) { s.engine = eng[0]; s.engineLitres = eng[1]; s.engineCylinders = eng[2]; s.fuel = eng[3]; }
      const restraint = sv && vin[6] === "E" ? "Front airbags, front-seat side airbags, roof-side curtain airbags all rows (GM AY0)" : null; // [GM22, GM24] + [VPIC]
      if (restraint) s.restraint = restraint;
      const plant = sv ? ({ G: "Silao, Mexico", F: "Flint, Michigan, USA", Z: "Fort Wayne, Indiana, USA" } as Record<string, string>)[vin[10]] ?? null : null; // [GM22, GM24] + [VPIC]
      if (plant) s.plant = plant;
      segs.push(
        seg(4, 4, vin, "GVWR / brakes / body style", sv ? gv : null, sv && gv ? {} : { note: "Not confirmed." }),
        seg(5, 6, vin, "Chassis / series", sv ? `${sv.model}, ${sv.drive}, export (Non-US, Non-Canada) series` : null, sv
          ? { note: "GM gives export trucks one series code; trim (LTZ, ZR2 …) is not in the VIN." }
          : { note: "Not confirmed for this model year (GM filings read for MY2019–2024)." }),
        seg(7, 7, vin, "Restraint system", restraint, restraint ? {} : { note: "Not confirmed." }),
        seg(8, 8, vin, "Engine", sv && eng ? eng[0] : null, sv && eng ? {} : { note: "Not confirmed." }),
        seg(11, 11, vin, "Assembly plant", plant),
      );
    }
    segs.push(seg(10, 10, vin, "Model year", y ? String(y) : null, { status: "standard" }));
    if (wmi === "1G1") segs.push(seg(11, 11, vin, "Assembly plant", s.plant ?? null));
    return { segments: segs, summary: s };
  },
};
