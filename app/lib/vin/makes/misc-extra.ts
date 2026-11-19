// Elroco VIN Decoding Code — Mahindra (MA1), SsangYong / KGM (KPT, KPA) and Genesis (KMT, KMU).
// Australian-delivered VIN layouts. Every decoded code has two independent agreeing sources; anything with
// one source or none is left undecoded with a note. Source key used in the comments:
//
//  [RAV]  Australian Government Register of Approved Vehicles, rover.infrastructure.gov.au/RAVPublicSearch?vinno=
//         (per-VIN make, model, type-approval number, build month, motive power, kW, seats). Read 2026-11-19 for
//         about 300 Australian VINs. Only covers vehicles entered from mid-2021.
//  [AU]   Australian Government recall VIN lists (vehiclerecalls.gov.au), read from the Wayback copies of
//         /sites/default/files/recall-files/REC-NNNNNN-VIN-List-1.csv and the recall pages:
//         Mahindra REC-005572 (Pik-Up S5 Series 2017-19, 556 VINs; the page lists Mahindra's own variant codes
//         "SINGLE CAB 2WD (RA2VG), (RE2VG), SINGLE CAB 4WD (RA4VG), (RE4VG), DOUBLE CAB 2WD (RC2VG), (RG2VG),
//         DOUBLE CAB 4WD (RC4VG), (RG4VG)" = VIN positions 4-8), REC-005764 (XUV700 AX7 / AX7L 2023, 330 VINs);
//         Genesis REC-005715 (G80 RG3, GV80 JX1, GV60 JW1, GV70 JK1; 1,723 VINs), REC-005574 (G80 EV RG3, 21),
//         REC-005698 (GV60 only, 108), REC-001597 (G80 2018-19, KMH VINs); SsangYong REC-001201 (Korando, Tivoli).
//  [AT]   autotrader.com.au listings (one platform = one source): 98 Mahindra, 46 Genesis, 201 SsangYong / KGM
//         VINs with series, variant, engine, transmission, drive and body, 2026-11-19.
//  [DLR]  Mahindra Australia dealer stock on mahindra.com.au/all-stock/ (Brighton Mahindra, Heartland Motors,
//         Timboon Motors) and drive.com.au/cars-for-sale/car/969692991/ and /970270960/ (Pik-Up single cab).
//  [M565] Mahindra & Mahindra Part 565 VIN letter to NHTSA, 8 Nov 2009, vpic.nhtsa.dot.gov/mid ORG5903 (US layout
//         with WMIs MCU/MCV, which never reached Australia; its plant list "1 Kandivili, 2 Nasik, 3 Zahirabad,
//         4 Igatpuri, 5 Haridwar, 6 Chakan" and "position 12 = A-M month of production (I omitted)" are company-wide).
//  [TBHP] Team-BHP "Find your car's date of manufacture" (team-bhp.com/node/1767) and v3cars.com "How to find
//         Mahindra vehicle manufacturing date with VIN number": 10th character = year, 12th = month, A = January
//         ... M = December.
//  [S565] SsangYong Motor WMI / VIN application to SAE-NHTSA, 15 Feb 1990, vpic.nhtsa.dot.gov/mid 01-22-N11B-3776
//         ("Assembly plant P : Pyeongtaek (city) plant"; 1990 layout otherwise superseded).
//  [WBH]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Hyundai/VIN Codes" (US Part 565 tables; lists
//         KMT = Genesis passenger car, KMU = Genesis MPV, model lines G/H/K/M and Genesis engine letters).
//  [GD]   Hyundai GD shop manual VIN page (already cited in asia.ts): "M : RHD & AT, S : RHD & AT+Transfer".
//  [REV]  Australian model-range reviews used only to tie a per-VIN kW figure to an engine: carexpert.com.au
//         2021-genesis-g80-gains-diesel-option (G80 2.2D 154 kW RWD), carexpert / 4x4australia Mahindra Scorpio
//         (2.2 diesel 129 kW, 6-speed automatic, Z8L / Z8L+), carsguide / mahindra.com.au XUV 3XO launch (1.2 turbo
//         petrol 82 kW, 6-speed automatic only).
//
// Fitment facts the VIN does NOT carry (the app must ask):
//  Mahindra — trim grade (XUV700 AX7 vs AX7L, Scorpio Z8 / Z8L / Z8L+, Pik-Up S6+ / S10+ / S11 share codes);
//             Pik-Up tub vs cab-chassis (positions 5 C/G and A/E are not explained); XUV500 and pre-2017
//             Pik-Up / Scorpio VINs (not two-sourced).
//  SsangYong — transmission (manual / automatic on Musso and older Rexton), driven wheels on petrol / diesel
//             models (2WD vs 4WD Rexton, Musso, Torres; FWD vs AWD Korando), Musso tub length (XLV or standard),
//             Torres vs Actyon (same KPTF codes), engine power tune (2.2 diesel 133 or 149 kW), trim grade,
//             and every pre-2015 line (Stavic, Kyron, Actyon Sports, Rexton Y200/Y290, Korando C200).
//  Genesis  — trim / option pack (position 5 is not published), seat count (GV80 5 or 7 seats), and anything
//             on KMU (US-layout) VINs.

import { seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";
import { HYUNDAI_TRANS } from "./asia";

const NOW = new Date().getFullYear() + 1;

// ═══ Mahindra (MA1) ═══════════════════════════════════════════════════════════════════════════════════
// Layout (Australian VINs): 4-5 model line / cab, 6 driven wheels, 7-8 engine + gearbox, 9 Mahindra code
// (not a check digit), 10 model year, 11 plant, 12 build month letter (or a digit), 13-17 serial.

interface MLine { model: string; series: string; body?: string; from: number; note: string }
const MAH_LINE: Record<string, MLine> = {
  NH: { model: "XUV700", series: "XUV700", body: "5-door SUV, 7 seats", from: 2022, note: "RAV VTA-060924 'XUV 700' (41 VINs) + recall REC-005764 (XUV700-only list, 330 VINs) + Autotrader" },
  NY: { model: "XUV 3XO", series: "XUV 3XO", body: "5-door SUV", from: 2024, note: "RAV VTA-065084 'XUV 3XO' + Autotrader (40 VINs)" },
  TK: { model: "Scorpio", series: "Scorpio-N (sold in Australia as Scorpio)", body: "5-door SUV", from: 2023, note: "RAV VTA-060829 'SCORPIO-N' + Autotrader + mahindra.com.au dealer stock" },
  RA: { model: "Pik-Up", series: "S5 Series", body: "Single cab", from: 2017, note: "Recall REC-005572 variant list 'SINGLE CAB (RA…)' + Autotrader" },
  RE: { model: "Pik-Up", series: "S5 Series", body: "Single cab", from: 2017, note: "Recall REC-005572 'SINGLE CAB (RE…)' + RAV 'S5 SERIES', 2 seats + Autotrader / drive.com.au 'Single Cab'" },
  RC: { model: "Pik-Up", series: "S5 Series", body: "Double cab", from: 2017, note: "Recall REC-005572 'DOUBLE CAB (RC…)' + RAV 'S5 SERIES', 5 seats + Autotrader '4 doors, 5 seats'" },
  RG: { model: "Pik-Up", series: "S5 Series", body: "Double cab", from: 2017, note: "Recall REC-005572 'DOUBLE CAB (RG…)' + RAV 'S5 SERIES', 5 seats + Autotrader '4 doors, 5 seats'" },
};

// Position 6, per line letter (position 4). R: REC-005572 "2WD / 4WD" codes + Autotrader (RE2 rear-wheel
// drive, RE4 / RC4 / RG4 four-wheel drive). N: Autotrader front-wheel drive + mahindra.com.au stock (XUV700
// "Front Wheel Drive"); the XUV 3XO is front-drive only [REV]. T: Autotrader + Heartland / mahindra.com.au "4X4".
const MAH_DRIVE: Record<string, Record<string, string>> = {
  R: { "2": "2WD (rear-wheel drive)", "4": "4WD" },
  N: { "2": "2WD (front-wheel drive)" },
  T: { "4": "4WD" },
};

interface MEng { name: string; litres: string; cyl: string; fuel: string; trans: string; note: string }
// Positions 7-8, keyed by line (position 4) + code.
const MAH_ENGINE: Record<string, MEng> = {
  RVG: { name: "2.2L mHawk 4-cyl turbo-diesel", litres: "2.2", cyl: "4", fuel: "Diesel", trans: "Manual",
    note: "mHawk per carsales.com.au Pik-Up research (engine code mHawk CRDe) and Autotrader listing titles; REC-005572 (all 2017-19 Pik-Ups, manual only then) + Autotrader 'Manual, 2.2 L diesel' (7 VINs) + drive.com.au '2179 cc, Manual'" },
  RXW: { name: "2.2L mHawk 4-cyl turbo-diesel", litres: "2.2", cyl: "4", fuel: "Diesel", trans: "Automatic",
    note: "Autotrader 'Automatic, 2.2 L diesel' (6 VINs) + mahindra.com.au / Timboon Motors 'Spts Auto 6sp 4x4 2.2DT'" },
  NZF: { name: "2.0L 4-cyl turbo petrol, 149 kW", litres: "2.0", cyl: "4", fuel: "Petrol", trans: "Automatic",
    note: "RAV 'ICE petrol, 149 kW' (41 VINs) + Autotrader '4 cyl, 2 L, unleaded, automatic' + mahindra.com.au stock" },
  NNW: { name: "1.2L 3-cyl turbo petrol, 82 kW", litres: "1.2", cyl: "3", fuel: "Petrol", trans: "Automatic (6-speed)",
    note: "RAV 'ICE petrol, 82 kW' + Autotrader '3 cyl, 1.2 L, automatic' (40 VINs); one engine and gearbox in Australia [REV]" },
  TYG: { name: "2.2L 4-cyl turbo-diesel, 129 kW", litres: "2.2", cyl: "4", fuel: "Diesel", trans: "Automatic (6-speed)",
    note: "RAV 'ICE diesel, 129 kW' + Autotrader '2.2 L diesel, automatic' (15 VINs) + Heartland Motors stock" },
};

// Position 11 — [M565] plant list; agrees with the plant that builds each model on Australian VINs:
// 6 on every XUV700 (Chakan per Wikipedia "Mahindra XUV700"), 2 on every XUV 3XO and Pik-Up (Nashik).
const MAH_PLANT: Record<string, string> = { "2": "Nashik, India", "6": "Chakan, India" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_LETTERS = "ABCDEFGHJKLM";

export const mahindra: MakeRule = {
  id: "mahindra", make: "Mahindra", wmis: ["MA1"],
  checkDigit: "no", modelYear: "yes", years: [2006, NOW],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Mahindra" };
    const y = resolveModelYear(vin[9], 2006, NOW); s.modelYear = y;
    const l0 = MAH_LINE[vin.slice(3, 5)];
    const line = l0 && (y == null || y >= l0.from) ? l0 : null;
    if (line) { s.model = line.model; s.series = line.series; if (line.body) s.body = line.body; }
    const drive = line ? MAH_DRIVE[vin[3]]?.[vin[5]] ?? null : null;
    if (drive) s.drive = drive;
    const e = line ? MAH_ENGINE[vin[3] + vin.slice(6, 8)] ?? null : null;
    if (e) { s.engine = e.name; s.engineLitres = e.litres; s.engineCylinders = e.cyl; s.fuel = e.fuel; s.transmission = e.trans; }
    const plant = MAH_PLANT[vin[10]] ?? null; s.plant = plant;
    const mi = MONTH_LETTERS.indexOf(vin[11]);
    const segs: VinSegment[] = [
      seg(4, 5, vin, "Model line / cab", line ? `${line.model}${line.body ? ` — ${line.body}` : ""}` : null, {
        note: line ? line.note : vin.slice(3, 5) === "YV" || vin[3] === "Y"
          ? "Seen on XUV500 listings from one platform only — not decoded."
          : "This model code is not confirmed by two sources (older Pik-Up, Scorpio and XUV500 VINs are not yet mapped).",
      }),
      seg(6, 6, vin, "Driven wheels", drive, { note: drive ? undefined : "Not confirmed for this model." }),
      seg(7, 8, vin, "Engine and gearbox", e ? `${e.name}, ${e.trans}` : null, { note: e ? e.note : "Engine / gearbox code not confirmed for this model." }),
      seg(9, 9, vin, "Mahindra code", null, {
        note: "Not a check digit on Australian Mahindras (50 of 996 recall and listing VINs pass — chance level). It is always the same for a given engine code, but Mahindra has not published its meaning — not decoded.",
      }),
      seg(10, 10, vin, "Model year", y ? String(y) : null, {
        note: "Model year, not build year: Mahindra starts the next model year mid-year (e.g. year R = 2024 on XUV700s the RAV lists as built 09–12/2023).",
      }),
      seg(11, 11, vin, "Assembly plant", plant, { note: plant ? "Mahindra's 2009 NHTSA VIN letter (plant list) + the plant that builds each model." : "Plant code not confirmed." }),
    ];
    if (mi >= 0) {
      segs.push(seg(12, 12, vin, "Month of production", MONTHS[mi], {
        note: "A = January … M = December, I omitted (Mahindra 2009 NHTSA VIN letter + Team-BHP / v3cars; matches the RAV build month on Australian VINs).",
      }));
      segs.push({ from: 13, to: 17, chars: vin.slice(12), label: "Production sequence number", value: vin.slice(12), status: "standard" });
      s.serial = vin.slice(12);
    } else {
      segs.push({ from: 12, to: 17, chars: vin.slice(11), label: "Production sequence number", value: vin.slice(11), status: "standard",
        note: "Position 12 is a digit here, so the build month is not encoded (seen on many 2022–2025 Australian VINs)." });
      s.serial = vin.slice(11);
    }
    return { segments: segs, summary: s };
  },
};

// ═══ Genesis (KMT; KMU = US-layout MPV) ════════════════════════════════════════════════════════════════
// Australian Genesis VINs use Hyundai's rest-of-world layout (asia.ts koreanDecode): 4 model line,
// 5 version (not published), 6 body, 7 restraint, 8 engine, 9 gearbox / driven wheels, 10 model year, 11 plant.
// Position 4 lines: [WBH] (G = G70 / G80, H = GV80, K = GV60, M = GV70) + [RAV] model codes per VIN.
// G70 and G80 share G: every G70 (RAV "IK") has a digit at position 5, every G80 (RAV "RG3") a letter.
interface GLine { model: string; series: string; note: string }
function genesisLine(vin: string): GLine | null {
  const l = vin[3], p5 = vin[4];
  if (l === "G") return /[0-9]/.test(p5)
    ? { model: "G70", series: "IK", note: "RAV model 'IK' (VTA-049012) + Autotrader G70 + Wikibooks G = G70" }
    : { model: "G80", series: "RG3", note: "RAV model 'RG3' (VTA-050814) + recalls REC-005715 / REC-005574 + Autotrader G80 + Wikibooks G = G80 2021-" };
  if (l === "H") return { model: "GV80", series: "JX1", note: "RAV model 'JX1' (VTA-050818) + Autotrader GV80 + Wikibooks H = GV80" };
  if (l === "K") return { model: "GV60", series: "JW1", note: "RAV model 'JW1' (VTA-060077) + recall REC-005698 (GV60-only list) + Wikibooks K = GV60" };
  if (l === "M") return { model: "GV70", series: "JK1", note: "RAV model 'JK1' (VTA-051321) + Autotrader GV70 + Wikibooks M = GV70" };
  return null;
}

// Position 6 body: Hyundai table (Hyundai VIN guide + [WBH]); 4 / 8 / 6 seen on Australian Genesis VINs and
// matching the RAV model / Autotrader body (8 = every GV60 / GV70 / GV80 SUV, 6 = GV80 Coupe).
const GEN_BODY: Record<string, string> = { "4": "4-door sedan", "8": "5-door SUV", "6": "Coupe-style SUV (GV80 Coupe)" };

interface GEng { name: string; litres: string; cyl: string; fuel: string; drive?: string; note: string }
const GE = (name: string, litres: string, cyl: string, fuel: string, note: string, drive?: string): GEng => ({ name, litres, cyl, fuel, note, drive });
// Position 8 engine — per model, two sources each: [RAV] kW per VIN + [WBH] engine letter (or [AT] / [REV]).
function genesisEngine(model: string, c: string): GEng | null {
  const t: Record<string, Record<string, GEng>> = {
    G70: {
      A: GE("2.0L 4-cyl turbo petrol (2.0T), 179 kW", "2.0", "4", "Petrol", "RAV 179 kW + Wikibooks A = 2.0T G70 + Autotrader 2.0T"),
      E: GE("3.3L V6 twin-turbo petrol (3.3T), 274 kW", "3.3", "6", "Petrol", "RAV 274 kW + Wikibooks E = 3.3T G70 + Autotrader 3.3T"),
    },
    G80: {
      B: GE("2.2L 4-cyl turbo-diesel (2.2D), 154 kW", "2.2", "4", "Diesel", "RAV 154 kW + carexpert G80 2.2D (154 kW, the only 154 kW G80)"),
      C: GE("2.5L 4-cyl turbo petrol (2.5T), 224 kW", "2.5", "4", "Petrol", "RAV 224 kW + Wikibooks C = 2.5T G80 21-"),
      D: GE("3.5L V6 twin-turbo petrol (3.5T), 279 kW", "3.5", "6", "Petrol", "RAV 279 kW + Wikibooks D = 3.5T G80 21- + Autotrader 3.5T"),
      "1": GE("Twin electric motors (Electrified G80), 272 kW", "", "", "Electric", "RAV 272 kW + recall REC-005574 (G80 EV list) + Wikibooks 1 = Electrified G80 AWD", "AWD"),
    },
    GV80: {
      B: GE("2.5L 4-cyl turbo petrol (2.5T), 224 kW", "2.5", "4", "Petrol", "RAV 224 kW + Wikibooks B = 2.5T GV80"),
      C: GE("3.5L V6 twin-turbo petrol (3.5T), 279 kW", "3.5", "6", "Petrol", "RAV 279 kW + Wikibooks C = 3.5T GV80 + Autotrader 3.5T"),
      D: GE("3.0L 6-cyl turbo-diesel (3.0D), 204 kW", "3.0", "6", "Diesel", "RAV 204 kW + Autotrader 'GV80 3.0D, diesel' (3 VINs); not in the US table"),
    },
    GV70: {
      A: GE("2.2L 4-cyl turbo-diesel (2.2D), 154 kW", "2.2", "4", "Diesel", "RAV 154 kW (5 VINs) + carexpert GV70 2.2D (154 kW, AWD)"),
      B: GE("2.5L 4-cyl turbo petrol (2.5T), 224 kW", "2.5", "4", "Petrol", "RAV 224 kW + Wikibooks B = 2.5T GV70 + Autotrader 2.5T"),
      C: GE("3.5L V6 twin-turbo petrol (3.5T), 279 kW", "3.5", "6", "Petrol", "RAV 279 kW + Wikibooks C = 3.5T GV70 + Autotrader 3.5T"),
      "1": GE("Twin electric motors (Electrified GV70), 360 kW boost", "", "", "Electric", "RAV 360 kW + Wikibooks 1 = Electrified GV70 AWD + Autotrader 'Electrified, AWD'", "AWD"),
    },
    GV60: {
      B: GE("Twin electric motors (Performance AWD), 360 kW boost", "", "", "Electric", "RAV 360 kW + Wikibooks B = GV60 Performance AWD", "AWD"),
      C: GE("Twin electric motors (AWD), 234 kW", "", "", "Electric", "RAV 234 kW + Wikibooks C = GV60 AWD", "AWD"),
    },
  };
  return t[model]?.[c] ?? null;
}

export const genesis: MakeRule = {
  id: "genesis", make: "Genesis", wmis: ["KMT", "KMU"],
  checkDigit: "mixed", modelYear: "yes", years: [2016, NOW],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Genesis" };
    const y = resolveModelYear(vin[9], 2016, NOW); s.modelYear = y;
    if (vin.startsWith("KMU")) {
      // KMU = Genesis MPV on US-built-for-market VINs [WBH]; none seen on Australian-delivered vehicles.
      return {
        segments: [
          seg(4, 8, vin, "Vehicle descriptor", null, { note: "KMU is Genesis's US-market SUV code (Wikibooks); no Australian-delivered KMU VIN has been seen, so the US tables are not applied — not decoded." }),
          seg(9, 9, vin, "Check digit", null, { note: "US-layout VINs carry an ISO check digit here." }),
          seg(10, 10, vin, "Model year", y ? String(y) : null),
          seg(11, 11, vin, "Assembly plant", vin[10] === "U" ? "Ulsan, Korea" : null),
        ],
        summary: s,
      };
    }
    const line = genesisLine(vin);
    if (line) { s.model = line.model; s.series = line.series; }
    const body = GEN_BODY[vin[5]] ?? null; if (body) s.body = body;
    const e = line ? genesisEngine(line.model, vin[7]) : null;
    if (e) { s.engine = e.name; s.fuel = e.fuel; if (e.litres) s.engineLitres = e.litres; if (e.cyl) s.engineCylinders = e.cyl; }
    // Position 9: Hyundai rest-of-world gearbox / drive letter ([GD] + [AT] Genesis drive types: M = RWD,
    // S = AWD on every Australian Genesis). R appears only on the electric models (G80 EV, GV60, Electrified GV70)
    // — Hyundai has not published it, so R itself is not decoded; their AWD comes from the motor code.
    const tr = vin[8] === "M" || vin[8] === "S" ? HYUNDAI_TRANS[vin[8]] : undefined;
    if (tr) { s.transmission = "Automatic"; s.drive = vin[8] === "M" ? "RWD" : "AWD"; }
    if (e?.drive) s.drive = e.drive;
    if (e?.fuel === "Electric") s.transmission = "Single-speed reduction gear (electric)";
    const plant = vin[10] === "U" ? "Ulsan, Korea" : null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Model line", line ? `${line.model} (${line.series})` : null, { note: line ? line.note : "Model line not confirmed." }),
        seg(5, 5, vin, "Version", null, { note: "Varies with engine and pack; Genesis has not published this table — not decoded." }),
        seg(6, 6, vin, "Body type", body),
        seg(7, 7, vin, "Restraint system", vin[6] === "1" ? "Active 3-point belts (Hyundai code 1)" : null, {
          note: vin[6] === "1" ? "Hyundai VIN guide + Wikibooks; 1 on every Australian Genesis." : "Restraint code not confirmed.",
        }),
        seg(8, 8, vin, "Engine / motor", e?.name ?? null, { note: e ? e.note : "This engine letter is not confirmed for this model." }),
        tr
          ? seg(9, 9, vin, "Transmission / drive", vin[8] === "M" ? "Automatic, rear-wheel drive" : "Automatic, all-wheel drive", {
            note: "Hyundai rest-of-world code (M = RHD automatic, S = RHD automatic + transfer case); not a check digit..",
          })
          : seg(9, 9, vin, "Transmission / drive", null, {
            note: vin[8] === "R" ? "R appears only on electric Genesis models; its exact meaning is not published — not decoded (drive comes from the motor code)." : "Not confirmed.",
          }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant, { note: plant ? "Hyundai plant table (Wikibooks) — every Australian Genesis." : "Plant not confirmed." }),
      ],
      summary: s,
    };
  },
};

// ═══ SsangYong / KGM (KPT SUVs, KPA utes) ══════════════════════════════════════════════════════════════
// Make name: vehicles were badged SsangYong in Australia until the 2024 KGM rebrand. The VIN does not say which
// badge a 2025-on vehicle wears, and the RAV records 2025-26 vehicles under both makes (Musso / Rexton
// "SSANGYONG", Musso EV / Actyon / Torres hybrid "KGM", depending on the type approval), so model years up to
// 2024 decode as "SsangYong" and 2025 on as "KGM / SsangYong".
// Layout on Australian VINs (2015 on): 4 model line, 5-7 SsangYong codes (not published), 8 engine / motor,
// 9 always S (not a check digit: 0 of 202 Australian VINs pass), 10 model year, 11 plant, 12-17 serial.
interface SLine { model: string; series: string; from: number; note: string }
const SY_LINE: Record<string, SLine> = {
  KPT5: { model: "Rexton", series: "Y400 family (Y400 / Y450 / Y461 / Y470)", from: 2017, note: "RAV model 'Y400' (VTA-048879) + Autotrader Rexton (40 VINs)" },
  KPT7: { model: "Korando", series: "C300", from: 2019, note: "RAV model 'C300' (VTA-050361) + recall REC-001201 (Korando / Tivoli list) + Autotrader Korando" },
  KPT3: { model: "Tivoli", series: "X100", from: 2015, note: "Recall REC-001201 (Korando / Tivoli list: only KPT7… and KPT3… VINs) + Autotrader Tivoli" },
  KPTF: { model: "Torres / Actyon", series: "J100 Torres or J120 Actyon (same VIN codes)", from: 2024, note: "RAV (VTA-050361 / VTA-064724) + Autotrader: Torres and Actyon both carry KPTF0A1…" },
  KPT1: { model: "Torres EVX", series: "U100", from: 2025, note: "RAV model 'UK' (VTA-064204, electric) + Autotrader Torres EVX" },
  KPAY: { model: "Musso", series: "Q200 family (Q200 / Q215 / Q250 / Q261 / Q270)", from: 2018, note: "RAV model 'Q200' (VTA-049402) + Autotrader Musso (75 VINs)" },
  KPA1: { model: "Musso EV", series: "O100", from: 2025, note: "RAV model 'OK' (VTA-065524, electric) + Autotrader Musso EV" },
};

interface SEng { name: string; litres: string; cyl: string; fuel: string; drive?: string; trans?: string; note: string }
// Position 8, valid only on the lines listed (two sources each: RAV motive power / kW + Autotrader engine).
const SY_ENGINE: Record<string, { lines: string[]; e: SEng }> = {
  E: { lines: ["KPT5", "KPAY"], e: { name: "2.2L 4-cyl turbo-diesel", litres: "2.2", cyl: "4", fuel: "Diesel",
    note: "RAV 'ICE diesel' (Musso 133 kW; Rexton 149 kW, some 2025-26 Rextons 133 kW) + Autotrader '4 cyl, 2.2 L, diesel'. The power tune is not in the VIN." } },
  U: { lines: ["KPT7", "KPT3"], e: { name: "1.6L 4-cyl turbo-diesel", litres: "1.6", cyl: "4", fuel: "Diesel",
    note: "RAV 100 kW (Korando) + Autotrader '1.6 L diesel' (Korando and Tivoli) + recall REC-001201 (fuel line, all U)" } },
  Y: { lines: ["KPT7", "KPTF"], e: { name: "1.5L 4-cyl turbo petrol, 120 kW", litres: "1.5", cyl: "4", fuel: "Petrol",
    note: "RAV 'ICE petrol, 120 kW' + Autotrader '4 cyl, 1.5 L, unleaded / premium'" } },
  R: { lines: ["KPTF"], e: { name: "1.5L 4-cyl turbo petrol hybrid", litres: "1.5", cyl: "4", fuel: "Hybrid",
    note: "RAV 'HEV - Petrol, 110 kW' + Autotrader 'HYBRID, 1.5 L'" } },
  "2": { lines: ["KPT1", "KPA1"], e: { name: "Single electric motor, 152 kW", litres: "", cyl: "", fuel: "Electric", drive: "FWD", trans: "Single-speed reduction gear (electric)",
    note: "RAV 'EV, 152 kW' + Autotrader 'Electric, FWD' (Torres EVX, Musso EV 2WD)" } },
  "3": { lines: ["KPA1"], e: { name: "Dual electric motors, 304 kW", litres: "", cyl: "", fuel: "Electric", drive: "AWD", trans: "Single-speed reduction gear (electric)",
    note: "RAV 'EV, 304 kW' + Autotrader 'Musso EV AWD'" } },
};

export const ssangyong: MakeRule = {
  id: "ssangyong", make: "SsangYong", wmis: ["KPT", "KPA"],
  checkDigit: "no", modelYear: "yes", years: [1995, NOW],
  decode(vin) {
    const y = resolveModelYear(vin[9], 1995, NOW);
    const s: Partial<VinSummary> = { make: y != null && y >= 2025 ? "KGM / SsangYong" : "SsangYong", modelYear: y };
    const key = vin.slice(0, 4);
    const l0 = SY_LINE[key];
    const line = l0 && (y == null || y >= l0.from) ? l0 : null;
    if (line) { s.model = line.model; s.series = line.series; }
    const ee = SY_ENGINE[vin[7]];
    const e = line && ee && ee.lines.includes(key) ? ee.e : null;
    if (e) {
      s.engine = e.name; s.fuel = e.fuel;
      if (e.litres) s.engineLitres = e.litres;
      if (e.cyl) s.engineCylinders = e.cyl;
      if (e.drive) s.drive = e.drive;
      if (e.trans) s.transmission = e.trans;
    }
    const plant = vin[10] === "P" ? "Pyeongtaek, Korea" : null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Model line", line ? `${line.model} (${line.series})` : null, {
          note: line ? line.note : "This model line is not confirmed by two sources (pre-2015 Rexton, Kyron, Actyon, Stavic and Korando C200 VINs are not yet mapped).",
        }),
        seg(5, 7, vin, "SsangYong specification codes", null, {
          note: "Body / wheelbase / version codes that SsangYong has not published (e.g. Musso 6 vs A does not line up cleanly with XLV vs standard tub in listings) — not decoded.",
        }),
        seg(8, 8, vin, "Engine / motor", e?.name ?? null, { note: e ? e.note : "This engine letter is not confirmed for this model." }),
        seg(9, 9, vin, "SsangYong code", null, { note: "Always S on Australian SsangYong / KGM VINs (202 of 202); not a check digit — not decoded." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "Model year: a Rexton built 11/2021 (RAV) carries M = 2021; a Musso built 11/2025 carries T = 2026." }),
        seg(11, 11, vin, "Assembly plant", plant, { note: plant ? "SsangYong 1990 NHTSA/SAE VIN application ('P : Pyeongtaek plant') + every Australian VIN." : "Plant code not confirmed." }),
      ],
      summary: s,
    };
  },
};

export const MISC_EXTRA_RULES: MakeRule[] = [mahindra, ssangyong, genesis];


// ── Genesis G80 (DH), 2017–2020, sold with Hyundai KMH VINs (added 2026-11-20) ─────────────────────────
// Recall REC-001597 (make GENESIS, model G80, 124 units) — every VIN is KMHGN41EM(J|K)U…; Wikibooks Hyundai:
// position 4 "G = … Genesis G80 2017-2019 (KMH)", engine "E = 3.8 Lambda II RS GDI V6 … Genesis G80 17-20";
// Australia sold the G80 with the 3.8 only (carsguide 2018/2019 price pages; GoAuto 2017). Position 9 M =
// automatic RWD (Hyundai GD shop manual). B (3.3 turbo) and D (3.3) were never sold here — not decoded.
export const genesisDH: MakeRule = {
  id: "genesis-dh-hyundai-vin", make: "Genesis", wmis: ["KMH"],
  match: (vin) => vin[3] === "G" && vin[4] === "N" && vin[5] === "4" && (vin[8] === "M" || vin[8] === "S")
    && ["H", "J", "K", "L"].includes(vin[9]),
  checkDigit: "no", modelYear: "yes", years: [2017, 2020],
  decode(vin) {
    const y = resolveModelYear(vin[9], 2017, 2020);
    const s: Partial<VinSummary> = { make: "Genesis", model: "G80", series: "DH", body: "4-door sedan", modelYear: y };
    const e = vin[7] === "E";
    if (e) Object.assign(s, { engine: "3.8L V6 petrol (Lambda II GDI)", engineLitres: "3.8", engineCylinders: "6", fuel: "Petrol" });
    const rwd = vin[8] === "M";
    if (rwd) Object.assign(s, { transmission: "Automatic", drive: "RWD" });
    if (vin[10] === "U") s.plant = "Ulsan, Korea";
    return {
      segments: [
        seg(4, 5, vin, "Model line", "Genesis G80 (DH)", { note: "Sold with a Hyundai VIN (KMH)." }),
        seg(6, 6, vin, "Body type", "4-door sedan"),
        seg(7, 7, vin, "Restraint system", null, { note: "Not decoded." }),
        seg(8, 8, vin, "Engine", e ? "3.8L V6 petrol (Lambda II GDI)" : null, e ? {} : { note: "Not an Australian G80 engine code." }),
        seg(9, 9, vin, "Transmission / drive", rwd ? "Automatic, RWD" : null, rwd ? {} : { note: "Not confirmed for Australia." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { status: "standard" }),
        seg(11, 11, vin, "Assembly plant", s.plant ?? null),
      ],
      summary: s,
    };
  },
};
