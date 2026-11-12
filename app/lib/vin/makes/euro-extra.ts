// Elroco VIN Decoding Code — extra European makes: Volvo, Polestar, MINI, Jaguar.
// Rest-of-world (Australian) VIN layouts. Every code below has two agreeing sources; codes with only one
// source are left undecoded with a note. Source key used in the comments:
//
//  [AU]   Australian Government recall VIN lists, vehiclerecalls.gov.au/recalls/rec-NNNNNN. Each list names the
//         model; files read from the Wayback copies of /sites/default/files/recall-files/REC-NNNNNN-VIN-List-1.csv
//         (about 56,000 VINs for these four makes, 2026-11-13). Lists used: Volvo REC-001436 (V40), REC-001437
//         (XC60), REC-001439 / 001627 / 005861 (XC90), REC-001441 / 005877 (XC40), REC-004833 (V70),
//         REC-005553 (XC60 / XC90 Recharge), REC-005727 / 006080 (XC40 and C40), REC-005968 / 006524 / 006551
//         (EX30), REC-006319 (T8 PHEV); Polestar REC-005743 / 006078 / 006363 (Polestar 2), REC-006379
//         (Polestar 3); MINI REC-005964 / 005966 / 006074 (Cooper SE high-voltage battery), REC-006091, REC-006442;
//         Jaguar REC-001628 / 001657 / 005955 / 006392 (E-Pace), REC-005491 / 006002 (F-Pace), REC-005700 /
//         005744 (I-Pace), REC-005493 (F-Type, F-Pace, XE, XF).
//  [VOC]  Volvo Owners' Club (UK) VIN plate pages, volvoclub.org.uk/vin_40.shtml, vin_60.shtml, vin_70.shtml,
//         vin_80.shtml, vin_xc90.shtml (European layout: 4 vehicle type, 5 doors/type, 6-7 engine, 8 emission,
//         9 gearbox, 10 model year, 11 factory).
//  [ARU]  auto.ru "Как расшифровать VIN Volvo", auto.ru/mag/article/kak-rasshifrovat-vin-volvo/ (same layout;
//         worked example YV1MS384972123456 = S40 sedan, 2.4 petrol "38", Euro 4 "4", gearbox "9", Ghent "2").
//  [WBV]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Volvo/VIN Codes" (pre-2010 tables = the
//         rest-of-world order; its note says US/Canada VINs from MY2010 move positions 4-5 to 7-8 and 6-8 to 4-6,
//         so the engine code table is shared; "Position 9 … elsewhere used for gearbox").
//  [V565] Volvo Part 565 VIN filings, NHTSA vPIC Manufacturer Information Database (vpic.nhtsa.dot.gov/mid):
//         ORG12525 MY2016, ORG22700 MY2017, ORG15446 MY2018, ORG16358 MY2019, ORG18763 MY2021, ORG20318 MY2023,
//         ORG21669 MY2024, ORG23126 MY2025 (engine/motor code tables, plant codes, WMIs).
//  [P565] Polestar Part 565 VIN filings, vpic.nhtsa.dot.gov/mid: ORG21987 MY2023, ORG22013 MY2024,
//         ORG22903 MY2025, ORG24624 MY2026 (motor code tables, plants).
//  [WBP]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Polestar/VIN Codes".
//  [J565] Jaguar Land Rover Part 565 VIN filings, vpic.nhtsa.dot.gov/mid: XE MY2020 (d005e45b-0db1-4a64-b79e-
//         d882c2cc3c7b), XF MY2024 (482f1514-dc06-4f02-867a-0501cdbb184b), F-Pace MY2024 (01a5f0ef-2a6f-4214-
//         b335-5c6f0f05d347), F-Type MY2018 (26d59981-484d-4e66-80dd-9cbbda889364) and MY2024 (38c7e8fc-0b8f-
//         43f9-a277-b74c229b7a7d), E-Pace MY2024 (418f5a05-7056-408f-9a91-52f655e98b5d), I-Pace MY2024
//         (812932fd-640a-4bc4-929c-c114db8f56e2), Land Rover MY2025 ORG23859 (JLR-wide engine letters).
//  [WBJ]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Jaguar/VIN Codes" (2016-on template).
//  [CBT]  carsbat.com / easyauto123.com.au VIN records naming the model (e.g. LYVUZL5A2SB058627 XC60,
//         LYVUZL129RB817525 XC60, LYVXZAKACNL732924 XC40, YV12ZEL92RS070357 EX30, YSMVSEDE1PL127971 Polestar 2,
//         YSMYKEAE9SB024992 Polestar 3); epicvin.com/vin-decoder/volvo/v40 (YV1MV4851F2234961 = 2015 V40 T4).
//
// Fitment facts the VIN does NOT carry (the app must ask):
//  Volvo   — trim/grade on any year; body/seat count on 2013-on models (position 5 not published); gearbox
//            from about 2010 to 2022 (position 9 is a Volvo code with no published table); diesel engine codes
//            (no second source); drive type unless the engine code is AWD-only.
//  Polestar — trim/packs (position 8); motor for codes EF and FC (one or no source).
//  MINI    — everything except the Cooper SE type 12DJ: BMW does not publish the type-code table, so model,
//            body, engine, gearbox and drive need the user (or a BMW/MINI parts catalogue).
//  Jaguar  — trim and power level (position 7 is A on Australian cars), gearbox, drive (FWD/AWD on E-Pace,
//            RWD/AWD on XE/XF/F-Type/F-Pace).

import { seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

const NOW = new Date().getFullYear() + 1;

// ─── Volvo / Polestar shared engine & motor codes (positions 6–7 on rest-of-world VINs) ──────────────────
interface Eng { name: string; litres?: string; cyl?: string; fuel?: string; drive?: string; years: [number, number] }

// Every entry: [V565] filing table + [WBV] engine-code table agree; all codes are seen on Australian VINs [AU]
// unless noted. Year windows keep re-used numbers apart.
const VOLVO_ENGINE: Record<string, Eng[]> = {
  // 1996–2012 (rest-of-world codes; [VOC] + [WBV] agree)
  "25": [{ name: "B4204T2 1.9L turbo petrol", years: [1996, 2004] }],
  "27": [{ name: "B4204T4 1.9L turbo petrol", years: [1996, 2004] }],
  "29": [{ name: "B4204T3 1.9L turbo petrol", years: [1996, 2004] }],
  "38": [{ name: "B5244S4 2.4L 5-cyl petrol", litres: "2.4", cyl: "5", fuel: "Petrol", years: [2004, 2012] }],
  "39": [{ name: "B5244S7 2.4L 5-cyl petrol", litres: "2.4", cyl: "5", fuel: "Petrol", years: [2004, 2012] }],
  "50": [{ name: "B5234T4", years: [1995, 2000] }],
  "51": [{ name: "B5252S", years: [1995, 2000] }],
  "52": [{ name: "B5254T4 2.5L turbo petrol (R)", years: [2003, 2009] }],
  "53": [{ name: "B5234T3 2.3L turbo petrol (T5)", years: [1998, 2004] }],
  "68": [{ name: "B5254T3 (T5)", years: [2004, 2010] }],
  "70": [{ name: "D4192T3", years: [1996, 2004] }],
  "72": [{ name: "D5252T 2.5 TDi diesel", fuel: "Diesel", years: [1996, 2001] }],
  "73": [{ name: "D4192T2", years: [1996, 2004] }],
  "74": [{ name: "D5244T2", years: [2001, 2009] }],
  "75": [{ name: "D4204T 2.0 diesel", fuel: "Diesel", years: [2004, 2012] }],
  "78": [{ name: "D4192T4", years: [1996, 2004] }],
  "79": [{ name: "D5244T (D5)", years: [2001, 2009] }],
  "91": [{ name: "B6294T 2.9 (T6)", years: [1999, 2006] }],
  "94": [{ name: "B6294S 2.9", years: [1999, 2006] }],
  // 2015 on ([V565] + [WBV])
  "10": [{ name: "B4204T (T5) 2.0L 4-cyl turbo petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2015, 2023] }],
  "16": [{ name: "B4204T (T5) 2.0L 4-cyl turbo petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2018, 2023] }],
  "26": [{ name: "B4204T12 (T5) 2.0L 4-cyl turbo petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2015, 2018] }],
  "40": [{ name: "B4204T11 (T5) 2.0L 4-cyl turbo petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2015, 2018] }],
  "A0": [{ name: "B4204TS (Polestar) 2.0L 4-cyl twincharged petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2016, 2019] }],
  "A2": [{ name: "B4204TS (T6) 2.0L 4-cyl twincharged petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2015, 2023] }],
  "AC": [{ name: "B4204T (T4) 2.0L 4-cyl turbo petrol", litres: "2.0", cyl: "4", fuel: "Petrol", years: [2018, 2023] }],
  "K9": [{ name: "B4204T (B4) 2.0L 4-cyl turbo petrol mild hybrid", litres: "2.0", cyl: "4", fuel: "Petrol (mild hybrid)", years: [2021, NOW] }],
  "L1": [{ name: "B4204T (B5) 2.0L 4-cyl turbo petrol mild hybrid", litres: "2.0", cyl: "4", fuel: "Petrol (mild hybrid)", years: [2021, NOW] }],
  "M1": [{ name: "BM1 (B5) 2.0L 4-cyl turbo petrol mild hybrid", litres: "2.0", cyl: "4", fuel: "Petrol (mild hybrid)", drive: "AWD", years: [2024, NOW] }],
  "06": [{ name: "B4204TE (B6) 2.0L 4-cyl petrol mild hybrid", litres: "2.0", cyl: "4", fuel: "Petrol (mild hybrid)", drive: "AWD", years: [2021, NOW] }],
  "BC": [{ name: "B4204TSH (T8) 2.0L petrol plug-in hybrid", litres: "2.0", cyl: "4", fuel: "Plug-in hybrid", drive: "AWD", years: [2015, 2019] }],
  "BR": [{ name: "B4204TSH (T8) 2.0L petrol plug-in hybrid", litres: "2.0", cyl: "4", fuel: "Plug-in hybrid", drive: "AWD", years: [2017, 2023] }],
  "BK": [{ name: "B4204TSH (T8 Polestar Engineered) 2.0L petrol plug-in hybrid", litres: "2.0", cyl: "4", fuel: "Plug-in hybrid", drive: "AWD", years: [2019, 2023] }],
  "H6": [{ name: "B4204TH (T8) 2.0L petrol plug-in hybrid", litres: "2.0", cyl: "4", fuel: "Plug-in hybrid", drive: "AWD", years: [2021, NOW] }],
  "ED": [{ name: "E400V6 twin electric motors, 300 kW", fuel: "Electric", drive: "AWD", years: [2020, 2024] }],
  "EH": [{ name: "E400V8 single electric motor, 185 kW", fuel: "Electric", drive: "RWD", years: [2023, NOW] }],
  "ER": [{ name: "E400V12 twin electric motors, 300 kW", fuel: "Electric", drive: "AWD", years: [2023, NOW] }],
  "EK": [{ name: "E400V14 twin electric motors, 315 kW", fuel: "Electric", drive: "AWD", years: [2023, NOW] }],
  "EL": [{ name: "E400V18 single electric motor, 200 kW", fuel: "Electric", drive: "RWD", years: [2023, NOW] }],
  "EV": [{ name: "E400V3 twin electric motors, 300 kW", fuel: "Electric", drive: "AWD", years: [2024, NOW] }],
  "E2": [{ name: "E400V13 twin electric motors (Performance), 370 kW", fuel: "Electric", drive: "AWD", years: [2024, NOW] }],
};
// Seen on Australian Volvos but NOT decoded (one source or none): 68 on 2015-on cars (WBV's 68 is the old
// B5254T3; 2018 XC60 use is unexplained), A8 and A4 (WBV only — diesel D4/D5, no filing), BA / BU / H2 (only
// the T8 recalls REC-006319 / REC-005553 — engine family known, code not published), L5, EP, EF (one source).
// Pre-2010 codes 49, 59, 61, 90 are re-used with different meanings in later filings and are not decoded.
// Engine numbers that appear in both eras are kept apart by the year windows above.

function pickEngine(table: Record<string, Eng[]>, code: string, year: number | null): Eng | null {
  const list = table[code];
  if (!list) return null;
  if (year == null) return list.length === 1 ? list[0] : null;
  return list.find((e) => year >= e.years[0] && year <= e.years[1]) ?? null;
}

// ─── Volvo ──────────────────────────────────────────────────────────────────────────────────────────
interface VModel { model: string; series: string; years: [number, number]; note: string }
const VOLVO_MODEL: Record<string, VModel[]> = {
  // Older letters: [VOC] + [WBV] agree.
  V: [{ model: "S40 / V40", series: "First generation", years: [1996, 2004], note: "VOC + Wikibooks" }],
  N: [{ model: "C70", series: "First generation", years: [1997, 2005], note: "VOC + Wikibooks" }],
  L: [
    { model: "S70 / V70", series: "S70 / V70 / V70 XC (1997–2000)", years: [1997, 2000], note: "VOC + Wikibooks" },
    { model: "XC90", series: "Second generation (2015 on)", years: [2015, NOW], note: "AU recalls REC-001439, REC-001627, REC-005861 (XC90-only lists)" },
  ],
  S: [{ model: "V70 / XC70", series: "Second generation V70 / XC70 (2001–2007)", years: [2000, 2008], note: "VOC + Wikibooks; AU REC-004833 (V70)" }],
  T: [{ model: "S80", series: "First generation", years: [1998, 2006], note: "VOC + Wikibooks" }],
  R: [{ model: "S60", series: "First generation", years: [2000, 2009], note: "VOC + Wikibooks" }],
  C: [{ model: "XC90", series: "First generation", years: [2002, 2014], note: "VOC + Wikibooks" }],
  M: [
    { model: "S40 / V50 / C30 / C70", series: "S40 second generation / V50 / C30 / C70 (2004–2012)", years: [2004, 2012], note: "VOC + Wikibooks + ARU" },
    { model: "V40", series: "Second generation (2013–2019)", years: [2013, 2020], note: "AU REC-001436 (V40-only list) + epicvin V40 VIN" },
  ],
  // Newer letters: [AU] single-model recall lists + [CBT] VIN records.
  U: [{ model: "XC60", series: "Second generation (2017 on)", years: [2017, NOW], note: "AU REC-001437 (XC60-only list) + carsbat/easyauto123 XC60 VINs" }],
  X: [{ model: "XC40", series: "XC40 (2018 on)", years: [2018, NOW], note: "AU REC-001441, REC-005877 (XC40-only lists) + carsbat XC40 VIN" }],
  "2": [{ model: "EX30", series: "EX30 (2024 on)", years: [2023, NOW], note: "AU REC-005968, REC-006524, REC-006551 (EX30-only lists) + carsbat EX30 VINs" }],
};

// Position 5 on pre-2013 cars ([VOC] + [WBV] agree).
function volvoBody(model: string, c: string): { body: string; drive?: string; seats?: string } | null {
  if (model === "XC90") {
    const t: Record<string, { body: string; drive?: string; seats?: string }> = {
      M: { body: "5-door SUV, 5 seats", drive: "AWD" }, N: { body: "5-door SUV, 5 seats", drive: "FWD" },
      Y: { body: "5-door SUV, 7 seats", drive: "FWD" }, Z: { body: "5-door SUV, 7 seats", drive: "AWD" },
    };
    return t[c] ?? null;
  }
  const g: Record<string, { body: string; drive?: string }> = {
    S: { body: "4-door sedan" }, W: { body: "5-door wagon" },
    Z: { body: "5-door wagon, Cross Country (XC)", drive: "AWD" },
  };
  if (model === "C70") return c === "C" ? { body: "2-door convertible" } : c === "K" ? { body: "2-door coupe" } : null;
  return g[c] ?? null;
}

// Position 9 gearbox on 1996–2012 cars — only the codes on which [VOC] and [WBV] agree.
const VOLVO_GEARBOX: Record<string, { name: string; trans: string; drive?: string }> = {
  "2": { name: "M56 5-speed manual", trans: "Manual" },
  "3": { name: "M58 manual", trans: "Manual" },
  "4": { name: "M66 6-speed manual", trans: "Manual" },
  "7": { name: "AW50 AWD automatic", trans: "Automatic", drive: "AWD" },
  "9": { name: "AW55-50SN automatic", trans: "Automatic" },
};

// Position 11. [WBV] + [VOC] (older plants) or [V565] (newer plants); L Luqiao [WBV] + [P565].
const VOLVO_PLANT: Record<string, string> = {
  "0": "Kalmar, Sweden", "1": "Torslanda (Gothenburg), Sweden", "2": "Ghent, Belgium", "6": "Australia",
  F: "Born (NedCar), Netherlands", J: "Uddevalla, Sweden", B: "Chengdu, China", P: "Daqing, China",
  G: "Ridgeville, South Carolina, USA", S: "Zhangjiakou, China", L: "Luqiao (Taizhou), China",
};

function volvoDecode(vin: string) {
  const s: Partial<VinSummary> = { make: "Volvo" };
  const y = resolveModelYear(vin[9], 1981, NOW);
  s.modelYear = y;
  const m = (VOLVO_MODEL[vin[3]] ?? []).find((x) => y != null && y >= x.years[0] && y <= x.years[1]) ?? null;
  if (m) { s.model = m.model; s.series = m.series; }
  const old = y != null && y <= 2012;
  const segs: VinSegment[] = [
    seg(4, 4, vin, "Model", m ? `${m.model} (${m.series})` : null, { note: m ? m.note : "Model letter not confirmed for this year." }),
  ];
  // 5 — body / type
  const b = old && m ? volvoBody(m.model.startsWith("XC90") ? "XC90" : m.model, vin[4]) : null;
  if (b) { s.body = b.body; if (b.drive) s.drive = b.drive; }
  segs.push(seg(5, 5, vin, "Body / type", b ? b.body + (b.drive ? `, ${b.drive}` : "") : null, {
    note: b ? undefined : old ? "This body letter is not confirmed." : "Volvo has not published the body/type letters for 2013-on models — not decoded.",
  }));
  // 6–7 — engine
  const e = pickEngine(VOLVO_ENGINE, vin.slice(5, 7), y);
  if (e) {
    s.engine = e.name;
    if (e.litres) s.engineLitres = e.litres;
    if (e.cyl) s.engineCylinders = e.cyl;
    if (e.fuel) s.fuel = e.fuel;
    if (e.drive) s.drive = e.drive;
  }
  segs.push(seg(6, 7, vin, "Engine / motor", e?.name ?? null, { note: e ? undefined : "This engine code is not confirmed by two sources." }));
  // 8 — emission code
  const euro4 = old && vin[7] === "4" && (y ?? 0) >= 2004;
  segs.push(seg(8, 8, vin, "Emission class", euro4 ? "Euro 4" : null, { note: euro4 ? undefined : "Emission code — not decoded (no fitment effect)." }));
  // 9 — gearbox (older) or check digit (MY2023 on: 100% of 11,000 Australian recall VINs pass the ISO check)
  if ((y ?? 0) >= 2023 || vin[3] === "2") {
    segs.push(seg(9, 9, vin, "Check digit", "Real check digit (Volvo from model year 2023)", { status: "standard" }));
  } else if (old) {
    const g = VOLVO_GEARBOX[vin[8]] ?? null;
    if (g) { s.transmission = g.name; if (g.drive) s.drive = g.drive; }
    segs.push(seg(9, 9, vin, "Gearbox", g?.name ?? null, { note: g ? "Not a check digit on these Volvos." : "Gearbox code not confirmed — not decoded." }));
  } else {
    segs.push(seg(9, 9, vin, "Volvo code (gearbox / version)", null, { note: "Not a check digit on 2013–2022 Volvos (0% pass); Volvo has not published this table — not decoded." }));
  }
  segs.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
  const plant = VOLVO_PLANT[vin[10]] ?? null; s.plant = plant;
  segs.push(seg(11, 11, vin, "Assembly plant", plant));
  return { segments: segs, summary: s };
}

export const volvo: MakeRule = {
  id: "volvo", make: "Volvo", wmis: ["YV1", "YV4", "LYV", "LVY", "7JR", "7JD"],
  checkDigit: "mixed", modelYear: "yes", years: [1981, NOW],
  decode: volvoDecode,
};

// ─── Polestar ───────────────────────────────────────────────────────────────────────────────────────
// Positions 4–5 = vehicle ([AU] single-model recalls + [CBT]); 6–7 = motor ([P565] + [WBP] agree);
// 8 = version (not published); 9 = check digit (100% of 237 Australian recall VINs pass); 10 = year; 11 = plant.
const POLESTAR_MODEL: Record<string, [string, string]> = {
  VS: ["Polestar 2", "Polestar 2 (2021 on)"],
  YK: ["Polestar 3", "Polestar 3 (2024 on)"],
};
const POLESTAR_MOTOR: Record<string, Eng> = {
  ED: { name: "E400V6 twin electric motors, 300 kW (Long range Dual motor)", fuel: "Electric", drive: "AWD", years: [2020, 2023] },
  EG: { name: "E400V9 single electric motor, 170 kW (Long range Single motor)", fuel: "Electric", drive: "FWD", years: [2021, 2023] },
  FD: { name: "E400V26 twin electric motors, 320 kW (Long range Dual motor)", fuel: "Electric", drive: "AWD", years: [2024, NOW] },
  FE: { name: "E400V20 single electric motor, 200 kW (Long range Single motor)", fuel: "Electric", drive: "RWD", years: [2024, NOW] },
  FF: { name: "E400V36 twin electric motors, 340 kW (Performance Pack)", fuel: "Electric", drive: "AWD", years: [2025, NOW] },
  FG: { name: "E400V36 twin electric motors, 340 kW (Performance Pack)", fuel: "Electric", drive: "AWD", years: [2024, NOW] },
  EA: { name: "E400V30 twin electric motors, 360 kW (Long range Dual motor)", fuel: "Electric", drive: "AWD", years: [2024, NOW] },
  EE: { name: "E400V11 twin electric motors, 380 kW (Performance)", fuel: "Electric", drive: "AWD", years: [2024, NOW] },
  PA: { name: "E400P01 twin electric motors, 400 kW", fuel: "Electric", drive: "AWD", years: [2025, NOW] },
  PB: { name: "E400P02 single electric motor, 200 kW", fuel: "Electric", drive: "RWD", years: [2025, NOW] },
};
const POLESTAR_PLANT: Record<string, string> = { L: "Luqiao (Taizhou), China", B: "Chengdu, China", G: "Ridgeville, South Carolina, USA" };

export const polestar: MakeRule = {
  id: "polestar", make: "Polestar", wmis: ["YSM", "YSR", "LPS", "7SY"],
  checkDigit: "yes", modelYear: "yes", years: [2019, NOW],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Polestar" };
    const y = resolveModelYear(vin[9], 2019, NOW); s.modelYear = y;
    const m = POLESTAR_MODEL[vin.slice(3, 5)] ?? null;
    if (m) { s.model = m[0]; s.series = m[1]; s.fuel = "Electric"; }
    const mo = POLESTAR_MOTOR[vin.slice(5, 7)];
    const e = mo && (y == null || (y >= mo.years[0] && y <= mo.years[1])) ? mo : null;
    if (e) { s.engine = e.name; s.fuel = "Electric"; if (e.drive) s.drive = e.drive; }
    const plant = POLESTAR_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 5, vin, "Model", m ? `${m[0]}` : null, { note: m ? "Australian recall lists naming only this model + VIN sale records." : "Model code not confirmed." }),
        seg(6, 7, vin, "Electric motor(s)", e?.name ?? null, { note: e ? undefined : "This motor code is not in the Polestar filings (EF and FC are seen on Australian Polestar 2s) — not decoded." }),
        seg(8, 8, vin, "Version", null, { note: "Polestar has not published the rest-of-world version letter — not decoded." }),
        seg(9, 9, vin, "Check digit", "Real check digit", { status: "standard" }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ─── MINI (WMW / WMZ) ───────────────────────────────────────────────────────────────────────────────
// BMW-group layout: positions 4–7 type code, 8 = 0, 9 check digit, 10 = 0 (no year), 11 plant.
// Position 8 and 10 are 0 on all 1,529 Australian MINI recall VINs, and every one passes the check digit.
const MINI_TYPE: Record<string, [string, string, string]> = {
  // [AU] REC-006074 "MINI Cooper SE" + REC-005964 / REC-005966 (high-voltage battery recalls, only fitted to the SE).
  "12DJ": ["Cooper SE", "F56 Electric 3-door hatch", "Electric"],
};

export const mini: MakeRule = {
  id: "mini", make: "MINI", wmis: ["WMW", "WMZ"],
  checkDigit: "yes", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "MINI" };
    const t = MINI_TYPE[vin.slice(3, 7)];
    if (t) { s.model = t[0]; s.series = t[1]; s.fuel = t[2]; s.body = "3-door hatch"; }
    return {
      segments: [
        seg(4, 7, vin, "Type code", t ? `${t[0]} (${t[1]})` : `Type ${vin.slice(3, 7)}`, {
          status: t ? "decoded" : "not-decoded",
          note: t ? "Two separate Australian recall lists." : "BMW does not publish the MINI type-code table — look this code up in the MINI parts catalogue.",
        }),
        seg(8, 8, vin, "Type code extension", null, { status: "filler", note: "Always 0 on Australian MINIs (1,529 of 1,529 recall VINs), as on Australian BMWs." }),
        seg(9, 9, vin, "Check digit", "Real check digit", { status: "standard" }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "MINI does not encode the model year on Australian VINs (0)." }),
        seg(11, 11, vin, "Assembly plant (start of 7-character short VIN)", null, { note: "Plant letter not two-sourced for MINI — not decoded." }),
      ],
      summary: s,
    };
  },
};

// ─── Jaguar (SAJ cars, SAD SUVs) — 2016-on rest-of-world layout ────────────────────────────────────
// 4 model line, 5 = A (not decoded), 6 body, 7 = A (power level on US cars only), 8 engine, 9 check digit,
// 10 model year, 11 plant. All tables: [J565] + [WBJ] agree, and match [AU] recall lists.
const JAG_MODEL: Record<string, [string, number]> = {
  A: ["XE", 2016], B: ["XF", 2016], C: ["F-Pace", 2016], D: ["F-Type", 2018], F: ["E-Pace", 2017], H: ["I-Pace", 2018],
};
const JAG_BODY: Record<string, string> = { "1": "2-door coupe", "2": "5-door (SUV, or XF Sportbrake wagon)", "4": "4-door sedan", "5": "2-door convertible" };
const JAG_ENGINE: Record<string, { name: string; litres: string | null; cyl: string | null; fuel: string }> = {
  X: { name: "2.0L Ingenium 4-cyl turbo petrol (AJ20P4)", litres: "2.0", cyl: "4", fuel: "Petrol" },
  N: { name: "2.0L Ingenium 4-cyl turbo diesel (AJ20D4)", litres: "2.0", cyl: "4", fuel: "Diesel" },
  U: { name: "3.0L Ingenium 6-cyl turbo petrol mild hybrid (AJ20P6)", litres: "3.0", cyl: "6", fuel: "Petrol (mild hybrid)" },
  V: { name: "3.0L V6 supercharged petrol (AJ126)", litres: "3.0", cyl: "6", fuel: "Petrol" },
  E: { name: "5.0L V8 supercharged petrol (AJ133)", litres: "5.0", cyl: "8", fuel: "Petrol" },
  "1": { name: "Twin electric motors (I-Pace EV400)", litres: null, cyl: null, fuel: "Electric" },
};
const JAG_PLANT: Record<string, string> = { A: "Solihull, UK", C: "Castle Bromwich, UK", "1": "Graz, Austria (Magna Steyr)" };

export const jaguar: MakeRule = {
  id: "jaguar", make: "Jaguar", wmis: ["SAJ", "SAD"],
  checkDigit: "yes", modelYear: "yes", years: [1981, NOW],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Jaguar" };
    const y = resolveModelYear(vin[9], 1981, NOW); s.modelYear = y;
    const ml = JAG_MODEL[vin[3]];
    const modern = !!ml && y != null && y >= ml[1];
    if (!modern) {
      return {
        segments: [seg(4, 8, vin, "Vehicle descriptor", null, { note: "Pre-2016 Jaguar rest-of-world layout not yet two-sourced — not decoded." })],
        summary: s,
      };
    }
    s.model = ml[0]; s.series = `${ml[0]} (2016-on VIN layout)`;
    const body = vin[5] === "2" ? (vin[3] === "B" ? "5-door Sportbrake wagon" : "5-door SUV") : JAG_BODY[vin[5]] ?? null;
    if (body) s.body = body;
    const e = JAG_ENGINE[vin[7]] ?? null;
    if (e) {
      s.engine = e.name; s.fuel = e.fuel;
      if (e.litres) s.engineLitres = e.litres;
      if (e.cyl) s.engineCylinders = e.cyl;
    }
    if (vin[7] === "1") s.drive = "AWD";
    const plant = JAG_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Model line", ml[0]),
        seg(5, 5, vin, "Trim / drive / restraint", null, { note: "Always A on Australian Jaguars; the US trim table does not apply — not decoded." }),
        seg(6, 6, vin, "Body", body),
        seg(7, 7, vin, "Power level", null, { note: "Always A on Australian Jaguars; the US power-level table does not apply — not decoded." }),
        seg(8, 8, vin, "Engine", e?.name ?? null, { note: e ? undefined : "This engine letter is not confirmed by two sources (W is seen on 2024 F-Pace)." }),
        seg(9, 9, vin, "Check digit", "Real check digit", { status: "standard" }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

export const EURO_EXTRA_RULES: MakeRule[] = [volvo, polestar, mini, jaguar];
