// Elroco VIN Decoding Code — Code Rules 23–27 (docs/vin-decoder-rules.md).
// Mazda, Mitsubishi, Nissan, Suzuki, Hyundai, Kia — Australian-delivered VIN layouts.
// Sources: Elroco VIN research 2026-09-29 — 75 real AU VINs from manheim.com.au, grays.com.au and
// pickles.com.au listings plus user-supplied plates, cross-checked position by position;
// Wikibooks Hyundai/Kia VIN pages (two-sourced where a real AU VIN matched);
// Hyundai VIN system guide (Elroco folder) for the body and restraint digits.

import { seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

type Hit = [model: string, series: string];

/** Longest-prefix lookup over a table keyed by the start of a VIN slice. */
function prefixLookup(table: Record<string, Hit>, text: string): [string, Hit] | null {
  let best: [string, Hit] | null = null;
  for (const [k, v] of Object.entries(table)) if (text.startsWith(k) && (!best || k.length > best[0].length)) best = [k, v];
  return best;
}

// ── Mazda (JM0 Japan "Oceania export", MM0/MM6/MM7/MM8 Thailand) ────────────────
// Positions 4–5 = Mazda model code; 9 is not a check digit; 10 is "0" (occasionally "1") — not a year.
const MAZDA: Record<string, Hit> = {
  KE: ["CX-5", "KE"], KF: ["CX-5", "KF"], DE: ["Mazda2", "DE"], DJ: ["Mazda2", "DJ"], DK: ["CX-3", "DK"],
  BK: ["Mazda3", "BK"], BL: ["Mazda3", "BL"], BM: ["Mazda3", "BM"], BN: ["Mazda3", "BN"], BP: ["Mazda3", "BP"],
  GG: ["Mazda6", "GG"], GH: ["Mazda6", "GH"], GJ: ["Mazda6", "GJ"], GL: ["Mazda6", "GL"],
  TB: ["CX-9", "TB"], TC: ["CX-9", "TC"], CU: ["Tribute", "CU"],
  NA: ["MX-5", "NA"], NB: ["MX-5", "NB"], NC: ["MX-5", "NC"], ND: ["MX-5", "ND"],
  UR: ["BT-50", "UR"], UN: ["BT-50", "UN (UP/UR family)"],
};

// Mazda descriptor (added 2026-11-09). Two sources agree for each code below:
// [M] Mazda CX-5 KE bodyshop manual VIN section (AU sample "JM0 KE107100": 6 body, 7 dummy,
//     8 engine "7 = 2.0 L SKYACTIV-G, 2 = 2.2 L SKYACTIV-D"; JM8 table "2 = 2WD, 4 = 4WD,
//     W = Station Wagon, 7 = 2.0 L");
// [R] Mazda recall VIN lists on vehiclerecalls.gov.au (REC-000869..899) — e.g. the 2.2 diesel
//     recall REC-894 lists only engine digit 2; the 2.5 petrol recall REC-890 only engine L
//     (KF4WL, BP2HL, BP2SL); [C] parts-catalogue type codes (KF2W7 2.0, KF4WL 2.5 AWD,
//     KF4W2 2.2 D AWD, DK2W7 / DK4W7).
// Newer carlines (KF, TC, DK, BP, ND, DJ, DL) use the JM8-style layout: 6 = drive, 7 = body,
// 8 = engine. Older carlines (KE, GJ, GL, BM, BN) use digit codes with the engine in 8.
// Held back (single source): older-layout 3 = 2.5; S = 1.5 diesel; A = 1.5 petrol; H/S body;
// position 9 transmission; plant letters; BT-50.
const MAZDA_NEW_LAYOUT = new Set(["KF", "TC", "DK", "BP", "ND", "DJ", "DL"]);
const MAZDA_OLD_LAYOUT = new Set(["KE", "GJ", "GL", "BM", "BN"]);
const MAZDA_DRIVE: Record<string, string> = { "2": "2WD", "4": "AWD" };
const MAZDA_BODY: Record<string, string> = { W: "Wagon / SUV", H: "Hatch", S: "Sedan" };   // H/S added 2026-11-09 (recall lists + Cars4Us door counts)
const MAZDA_ENGINE: Record<string, { name: string; litres: string; fuel: string }> = {
  "7": { name: "2.0L SKYACTIV-G petrol (PE)", litres: "2.0", fuel: "Petrol" },
  "2": { name: "2.2L SKYACTIV-D diesel (SH)", litres: "2.2", fuel: "Diesel" },
};
const MAZDA_ENGINE_NEW: Record<string, { name: string; litres: string; fuel: string }> = {
  ...MAZDA_ENGINE,
  L: { name: "2.5L SKYACTIV-G petrol (PY family)", litres: "2.5", fuel: "Petrol" },
  // Added 2026-11-09: S = CX-3 1.5 diesel (recall REC-000882, all 1,627 VINs S, + listing);
  // A = 1.5 petrol (Mazda2 DJ/DL: recall REC-892 + Cars4Us G15 listings).
  S: { name: "1.5L SKYACTIV-D diesel", litres: "1.5", fuel: "Diesel" },
  A: { name: "1.5L SKYACTIV-G petrol", litres: "1.5", fuel: "Petrol" },
};
// Older layout: 3 = 2.5 petrol confirmed on the Mazda3 BM/BN only (recall REC-890 + Cars4Us SP25 listing).
const MAZDA_ENGINE_OLD_BM: Record<string, { name: string; litres: string; fuel: string }> = {
  "3": { name: "2.5L SKYACTIV-G petrol (PY)", litres: "2.5", fuel: "Petrol" },
};
// Older "Australian specs" layout (KE, GJ, GL, BK, DE; added 2026-11-12): two Mazda manuals in the Elroco
// folder (CX-5 KE and Mazda2 DE VIN pages): 6 body (1 = closed body), 7 dummy 0, 9 minor change code.
// KE 3 = 2.5 petrol (Carlins JM0KE103200401861 engine PY…, easyauto123 KE1031 2.5); KE 9: 1 Series 1,
// 2 Series 2 (manual + listing model codes KE1031/KE1032). BK R = 2.0 MZR-CD diesel (recall REC-003069
// diesel VIN range + Carbids JM0BK10R… engine RF…).
const MAZDA_OLD_BODY: Record<string, string> = { "1": "Closed body" };
const MAZDA_KE_EXTRA: Record<string, { name: string; litres: string; fuel: string }> = {
  "3": { name: "2.5L SKYACTIV-G petrol (PY)", litres: "2.5", fuel: "Petrol" },
};
const MAZDA_BK_ENGINE: Record<string, { name: string; litres: string; fuel: string }> = {
  R: { name: "2.0L MZR-CD turbo diesel (RF)", litres: "2.0", fuel: "Diesel" },
};
// Mazda3 BM/BN: the Mazda Australia model code (e.g. BM5438) is VIN positions 4-9. 7 body (4 hatch,
// 2 sedan), 8 engine, 9 transmission (6 manual, 8 automatic). Dealer listings with VIN + body + gearbox
// (Madman Motors, Carlins, Morrow Mazda, Car City, Southern VW) + mazda3revolution forum.
const MAZDA_BM_BODY: Record<string, string> = { "4": "Hatch", "2": "Sedan" };
const MAZDA_BM_TRANS: Record<string, string> = { "6": "Manual (6-speed)", "8": "Automatic (6-speed)" };
// MX-5 NC: F = 2.0 (MX-5 Club of Victoria decoder sheet + MX-5 World registry VIN).
// BT-50 UN: W = 2.5 WL-AT, E = 3.0 WE-AT turbo diesel (wrecker/dealer VINs + parts catalogues).
// Newer layout position 9: A = automatic, 6 = manual (recall REC-884 MX-5 automatic list + listings).
const MAZDA_TRANS_NEW: Record<string, string> = { A: "Automatic", "6": "Manual" };

function mazdaDescriptor(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const code = vin.slice(3, 5);
  const fill = (e?: { name: string; litres: string; fuel: string }) => {
    if (e) Object.assign(s, { engine: e.name, engineLitres: e.litres, engineCylinders: "4", fuel: e.fuel });
  };
  if (MAZDA_NEW_LAYOUT.has(code)) {
    const drive = MAZDA_DRIVE[vin[5]] ?? null; if (drive) s.drive = drive;
    const body = MAZDA_BODY[vin[6]] ?? null; if (body) s.body = body;
    const eng = MAZDA_ENGINE_NEW[vin[7]]; fill(eng);
    const tr = MAZDA_TRANS_NEW[vin[8]]; if (tr) s.transmission = tr;
    return [
      seg(6, 6, vin, "Drive", drive),
      seg(7, 7, vin, "Body", body, body ? {} : { note: "This Mazda body letter is not yet confirmed." }),
      seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This Mazda engine code is not yet confirmed." }),
    ];
  }
  if (code === "BM" || code === "BN") {
    const eng = MAZDA_ENGINE[vin[7]] ?? MAZDA_ENGINE_OLD_BM[vin[7]]; fill(eng);
    const body = MAZDA_BM_BODY[vin[6]] ?? null; if (body) s.body = body;
    const tr = MAZDA_BM_TRANS[vin[8]] ?? null; if (tr) s.transmission = tr;
    return [
      seg(6, 6, vin, "Descriptor", null, { note: "Always 5 on Australian Mazda3 BM/BN; meaning not published." }),
      seg(7, 7, vin, "Body", body, body ? {} : { note: "Not yet confirmed." }),
      seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This Mazda engine code is not yet confirmed." }),
      seg(9, 9, vin, "Transmission", tr, tr ? { note: "Not a check digit on Mazdas." } : { note: "Not yet confirmed." }),
    ];
  }
  if (MAZDA_OLD_LAYOUT.has(code) || code === "BK" || code === "DE") {
    const eng = code === "BK" ? MAZDA_BK_ENGINE[vin[7]] : MAZDA_ENGINE[vin[7]] ?? (code === "KE" ? MAZDA_KE_EXTRA[vin[7]] : undefined); fill(eng);
    const body = MAZDA_OLD_BODY[vin[5]] ?? null;
    const minor = code === "KE" ? ({ "1": "KE Series 1", "2": "KE Series 2" } as Record<string, string>)[vin[8]] ?? null : null;
    if (minor) s.series = minor;
    return [
      seg(6, 6, vin, "Body", body, body ? {} : { note: "Not yet confirmed." }),
      seg(7, 7, vin, "Dummy", null, { status: "filler", note: "Always 0 on Australian-spec Mazdas (Mazda workshop manual)." }),
      seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This Mazda engine code is not yet confirmed." }),
      seg(9, 9, vin, "Minor change code", minor ?? vin[8], { status: minor ? undefined : "standard", note: "Mazda's facelift / update counter, not a check digit." }),
    ];
  }
  if (code === "NC" && vin[7] === "F") {
    Object.assign(s, { engine: "2.0L petrol (LF)", engineLitres: "2.0", fuel: "Petrol" });
    return [
      seg(6, 7, vin, "Body / descriptor", null, { note: "Not decoded." }),
      seg(8, 8, vin, "Engine", "2.0L petrol (LF)"),
    ];
  }
  if (code === "UN" && (vin[7] === "W" || vin[7] === "E")) {
    const e = vin[7] === "W" ? { name: "2.5L turbo diesel (WL-AT)", litres: "2.5" } : { name: "3.0L turbo diesel (WE-AT)", litres: "3.0" };
    Object.assign(s, { engine: e.name, engineLitres: e.litres, fuel: "Diesel" });
    return [
      seg(6, 7, vin, "Body / descriptor", null, { note: "Not decoded (same letter on every cab style)." }),
      seg(8, 8, vin, "Engine", e.name),
    ];
  }
  if (code === "UR" && vin[7] === "G") {
    // BT-50 UR: G = 3.2 turbo diesel. The same model code UR0YG1 appears on manual and automatic 3.2s
    // (motorvehiclewholesale listings; recall REC-000886 VIN list), so G does not give the gearbox.
    Object.assign(s, { engine: "3.2L turbo diesel", engineLitres: "3.2", fuel: "Diesel" });
    return [
      seg(6, 7, vin, "Body / descriptor", null, { note: "Not decoded." }),
      seg(8, 8, vin, "Engine", "3.2L turbo diesel"),
    ];
  }
  return [seg(6, 8, vin, "Body / engine / grade", null, { note: "Mazda sub-code — no published table; not decoded." })];
}

export const mazda: MakeRule = {
  id: "mazda", make: "Mazda", wmis: ["JM0", "JMZ", "JM1", "MM0", "MM6", "MM7", "MM8"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Mazda" };
    const h = MAZDA[vin.slice(3, 5)];
    if (h) { s.model = h[0]; s.series = h[1]; }
    const desc = mazdaDescriptor(vin, s);
    return {
      segments: [
        seg(4, 5, vin, "Model code", h ? `${h[0]} (${h[1]})` : null),
        ...desc,
        ...(desc.some((d) => d.from === 9) ? []
          : MAZDA_NEW_LAYOUT.has(vin.slice(3, 5)) && MAZDA_TRANS_NEW[vin[8]]
          ? [seg(9, 9, vin, "Transmission", MAZDA_TRANS_NEW[vin[8]], { note: "Not a check digit on Mazdas." })]
          : [seg(9, 9, vin, "Check digit", "Not used by Mazda on Australian-delivered vehicles", { status: "standard" })]),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Mazda does not encode the model year here on Australian-delivered cars (usually 0)." }),
      ],
      summary: s,
    };
  },
};

// ── Mitsubishi (JMF/JMY/JA4 Japan, MMA/MMB/MMC/MMT Thailand, 6MM Adelaide) ────────
// Model code at 4–7/8; 9 is not a check digit; 10 IS a real model year (confirmed on 12+ AU VINs).
const MITSUBISHI: Record<string, Hit> = {
  // XT / L prefix guesses removed 2026-11-12: position 4 is the body and 5 the transmission, so the
  // model line is positions 6-7 (see decodeJmf). L is also used by the Lancer Sportback.
  SRCK: ["Lancer", "CE"], SNCY: ["Lancer", "CJ"],
  ENKA: ["Triton", "ML"], JNKB: ["Triton", "MN"], YLKK: ["Triton", "MR"], GUKS: ["Pajero Sport", "QE"],
  TH: ["Magna", "TH"], DB: ["380", "DB"],
};

// Triton (Thai-built, MMA/MMB, position 6 = K) — decoded one character at a time (added 2026-11-09).
// Sources: Mitsubishi Triton 2006 service manual chassis-number table (Thailand market) and
// Mitsubishi L200 MQ/MR 2020 service manual "Vehicle identification number"; corroborated by the
// Takata recall VIN list PRA 2016/15523 (57,025 ML/MN VINs) and recall VIN ranges; single-cab
// E/Y also by Manheim listings + Mitsubishi body-builder guides; 6G74 = 9 by two parts catalogues.
// Held back: 5 = 4G64 petrol (one catalogue), Y at position 5, plant F, the 2024 MV, Pajero Sport.
const TRITON_BODY: Record<string, string> = { J: "Double cab", C: "Club cab", E: "Single cab", Y: "Single cab" };
// Y = 5-speed automatic added 2026-11-12 (Mitsubishi L200 EU service manuals 2011, 2013, 2015 VIN charts).
const TRITON_TRANS_OLD: Record<string, string> = { N: "5-speed manual", R: "4-speed automatic", Y: "5-speed automatic" };   // ML/MN
const TRITON_TRANS_NEW: Record<string, string> = { J: "6-speed manual", L: "6-speed automatic" };   // MQ/MR
const TRITON_DRIVE_OLD: Record<string, string> = { A: "2WD", B: "4WD" };
const TRITON_DRIVE_NEW: Record<string, string> = { K: "2WD high-rider", L: "4WD" };
const TRITON_ENGINE_OLD: Record<string, { name: string; litres: string; fuel: string; cyl: string }> = {
  "4": { name: "2.5L turbo diesel (4D56)", litres: "2.5", fuel: "Diesel", cyl: "4" },
  "8": { name: "3.2L turbo diesel (4M41)", litres: "3.2", fuel: "Diesel", cyl: "4" },
  "9": { name: "3.5L V6 petrol (6G74)", litres: "3.5", fuel: "Petrol", cyl: "6" },
};
const TRITON_ENGINE_NEW: Record<string, { name: string; litres: string; fuel: string; cyl: string }> = {
  "1": { name: "2.4L turbo diesel (4N15)", litres: "2.4", fuel: "Diesel", cyl: "4" },
};
// D/F: the L200 EU manuals (2011, 2013, 2015) give "D Laemchabang-2, F Laemchabang-1"; the 2006 Thai manual
// names D as MMC Sittipol (Mitsubishi's Thai company, which runs the Laem Chabang plants).
const TRITON_PLANT: Record<string, string> = {
  D: "Laem Chabang plant 2 (MMC Sittipol), Thailand", F: "Laem Chabang plant 1, Thailand", H: "Laem Chabang, Thailand",
};

function decodeTriton(vin: string, s: Partial<VinSummary>, series: string | null): VinSegment[] {
  const newGen = vin[6] === "K" || vin[6] === "L";          // MQ/MR use K/L at position 7
  const oldGen = vin[6] === "A" || vin[6] === "B";          // ML/MN use A/B
  s.model = "Triton";
  s.series = series ?? (newGen ? "MQ / MR" : oldGen ? "ML / MN" : null);
  const body = TRITON_BODY[vin[3]] ?? null; if (body) s.body = body;
  const trans = (newGen ? TRITON_TRANS_NEW : oldGen ? TRITON_TRANS_OLD : {})[vin[4]] ?? null; if (trans) s.transmission = trans;
  const drive = (newGen ? TRITON_DRIVE_NEW : TRITON_DRIVE_OLD)[vin[6]] ?? null; if (drive) s.drive = drive;
  const eng = (newGen ? TRITON_ENGINE_NEW : oldGen ? TRITON_ENGINE_OLD : {})[vin[7]];
  if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, fuel: eng.fuel, engineCylinders: eng.cyl });
  const plant = TRITON_PLANT[vin[10]] ?? null; if (plant) s.plant = plant;
  const nc = (v: string | null, what: string) => (v ? {} : { note: `This Triton ${what} letter is not yet confirmed.` });
  return [
    seg(4, 4, vin, "Body / cab", body, nc(body, "body")),
    seg(5, 5, vin, "Transmission", trans, nc(trans, "transmission")),
    seg(6, 6, vin, "Vehicle line", "Triton"),
    seg(7, 7, vin, "Drive", drive, nc(drive, "drive")),
    seg(8, 8, vin, "Engine", eng?.name ?? null, nc(eng ? "x" : null, "engine")),
    seg(9, 9, vin, "Check digit", "Not used (always 0 on Thai-built Tritons)", { status: "standard" }),
  ];
}

// ── Japan-built general-export layout (JMF/JMY/JMB), added 2026-11-12 ─────────────
// Mitsubishi service-manual VIN charts (Pajero 2001 Europe, Pajero 2003 "General Export and Australia",
// Pajero IV 2008/2010, Lancer 2008/2010, Lancer Sportback 2009/2010, Outlander 2008/2010/2012/2016/2019,
// ASX 2013/2019, Evo VII), corroborated by the Hong Kong Transport Department recall list 10000498
// (VIN prefixes per model code) and Australian listings. 4 body, 5 transmission, 6-7 model line,
// 8 engine (per line), 9 sort (not a check digit). Positions 6-9 together are Mitsubishi's model code.
type MEng = { name: string; litres: string; fuel: string; cyl: string };
const ME = (name: string, litres: string, fuel: string, cyl: string): MEng => ({ name, litres, fuel, cyl });
const JMF_LINE: Record<string, { model: string; series: string; engines: Record<string, MEng> }> = {
  V7: { model: "Pajero", series: "V7 long wheelbase", engines: {
    "5": ME("3.5L V6 petrol (6G74)", "3.5", "Petrol", "6"), "8": ME("3.2L turbo diesel (4M41)", "3.2", "Diesel", "4") } },
  V9: { model: "Pajero", series: "V9 long wheelbase", engines: {
    "7": ME("3.8L V6 petrol (6G75)", "3.8", "Petrol", "6"), "8": ME("3.2L turbo diesel (4M41)", "3.2", "Diesel", "4") } },
  CY: { model: "Lancer", series: "CY sedan", engines: { "4": ME("2.0L petrol (4B11)", "2.0", "Petrol", "4") } },
  CX: { model: "Lancer Sportback", series: "CX", engines: { "4": ME("2.0L petrol (4B11)", "2.0", "Petrol", "4") } },
  CW: { model: "Outlander", series: "CW", engines: { "5": ME("2.4L petrol (4B12)", "2.4", "Petrol", "4") } },
  GA: { model: "ASX", series: "GA", engines: { "2": ME("2.0L petrol (4B11)", "2.0", "Petrol", "4") } },
  GF: { model: "Outlander", series: "GF", engines: {
    "2": ME("2.0L petrol (4B11)", "2.0", "Petrol", "4"), "3": ME("2.4L petrol (4B12)", "2.4", "Petrol", "4"),
    "7": ME("2.0L petrol (4J11)", "2.0", "Petrol", "4"), "8": ME("2.4L petrol (4J12 MIVEC)", "2.4", "Petrol", "4") } },
};
const JMF_TRANS: Record<string, string> = { N: "5-speed manual", R: "4-speed automatic", Y: "5-speed automatic", T: "CVT" };
const JMF_SORT: Record<string, string> = { A: "Passenger car", W: "Station wagon" };
function jmfBody(vin: string, line: string): string | null {
  const b = vin[3];
  if (b === "S") return "4-door sedan";
  if (b === "X") return "4-door with tailgate";
  if (b === "L") return line === "CX" ? "4-door with tailgate (Sportback)" : line === "V7" || line === "V9" ? "5-door" : null;
  return null;
}
function decodeJmf(vin: string, s: Partial<VinSummary>): VinSegment[] | null {
  const lineCode = vin.slice(5, 7), line = JMF_LINE[lineCode];
  if (!line) return null;
  s.model = line.model; s.series = line.series;
  const body = jmfBody(vin, lineCode); if (body) s.body = body;
  const trans = JMF_TRANS[vin[4]] ?? null; if (trans) s.transmission = trans;
  const eng = line.engines[vin[7]];
  if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, fuel: eng.fuel, engineCylinders: eng.cyl });
  const sort = JMF_SORT[vin[8]] ?? null;
  return [
    seg(4, 4, vin, "Body style", body, body ? {} : { note: "Not yet confirmed." }),
    seg(5, 5, vin, "Transmission", trans, trans ? {} : { note: "Not yet confirmed." }),
    seg(6, 7, vin, "Model line", `${line.model} (${line.series})`),
    seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This engine digit is not yet confirmed for this model line." }),
    seg(9, 9, vin, "Vehicle type", sort, sort ? { note: "Not a check digit on Mitsubishis." } : { note: "Not a check digit; this letter is not yet confirmed." }),
  ];
}

// Pajero Sport QE (Thai-built MMA, position 6 K, position 7 R/S): Pajero Sport 2016 and 2017 service-manual
// supplements + Grays listings for the Australian test VINs.
function decodePajeroSport(vin: string, s: Partial<VinSummary>): VinSegment[] {
  s.model = "Pajero Sport"; s.series = "QE";
  const trans = vin[4] === "U" ? "8-speed automatic" : null; if (trans) s.transmission = trans;
  const drive = vin[6] === "R" ? "2WD" : vin[6] === "S" ? "4WD" : null; if (drive) s.drive = drive;
  const eng = vin[7] === "1";
  if (eng) Object.assign(s, { engine: "2.4L turbo diesel (4N15)", engineLitres: "2.4", fuel: "Diesel", engineCylinders: "4" });
  return [
    seg(4, 4, vin, "Body", vin[3] === "G" ? "Wide fender" : null),
    seg(5, 5, vin, "Transmission", trans),
    seg(6, 6, vin, "Vehicle line", "Pajero Sport"),
    seg(7, 7, vin, "Drive", drive),
    seg(8, 8, vin, "Engine", eng ? "2.4L turbo diesel (4N15)" : null),
    seg(9, 9, vin, "Fixed character", null, { status: "filler", note: "Mitsubishi's manual lists it as having no meaning (always 0)." }),
  ];
}

// 380 DB (6MM): MMAL parts catalogue DB-06-39-G "Vehicle identification" + Wikibooks Mitsubishi layout.
const DB_ENGINE: Record<string, string> = { "1": "3.8L V6 petrol, 5-speed manual", "4": "3.8L V6 petrol, 5-speed automatic" };
const DB_GRADE: Record<string, string> = { D: "380 / ES", V: "VR-X (SX / VR-X on Series II/III)", X: "GT", H: "LS / LX" };
function decode380(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const e = DB_ENGINE[vin[5]] ?? null;
  if (e) Object.assign(s, { engine: "3.8L V6 petrol", engineLitres: "3.8", fuel: "Petrol", engineCylinders: "6",
    transmission: vin[5] === "1" ? "5-speed manual" : "5-speed automatic" });
  const g = DB_GRADE[vin[6]] ?? null; if (g) s.trim = g;
  const body = vin.slice(7, 9) === "41" ? "4-door sedan" : null; if (body) s.body = body;
  return [
    seg(4, 5, vin, "Series", "380 (DB)"),
    seg(6, 6, vin, "Engine / transmission", e, e ? {} : { note: "Not yet confirmed." }),
    seg(7, 7, vin, "Grade", g, g ? {} : { note: "Not yet confirmed." }),
    seg(8, 9, vin, "Body type", body, body ? { note: "Positions 8-9 are the body, so there is no check digit." } : { note: "Not yet confirmed." }),
  ];
}

const MITSU_PLANT: Record<string, string> = {
  H: "Laem Chabang, Thailand", J: "Nagoya-3 (Pajero Manufacturing), Japan", U: "Mizushima, Japan", Z: "Okazaki, Japan",
};

export const mitsubishi: MakeRule = {
  id: "mitsubishi", make: "Mitsubishi", wmis: ["JMF", "JMY", "JMB", "JA4", "MMA", "MMB", "MMC", "MMT", "6MM"],
  checkDigit: "no", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Mitsubishi" };
    const hit = prefixLookup(MITSUBISHI, vin.slice(3, 8));
    if (hit) { s.model = hit[1][0]; s.series = hit[1][1]; }
    // Triton only: position 6 = K and position 7 a Triton drive letter (Pajero Sport also has K at 6, with S at 7).
    if (/^MM[AB]/.test(vin) && vin[5] === "K" && "ABKL".includes(vin[6])) {
      const triton = decodeTriton(vin, s, hit && hit[1][0] === "Triton" ? hit[1][1] : null);
      const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
      triton.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
      triton.push(seg(11, 11, vin, "Assembly plant", s.plant ?? null, s.plant ? {} : { note: "This Triton plant letter is not yet confirmed." }));
      return { segments: triton, summary: s };
    }
    const tail = (out: VinSegment[]) => {
      const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
      out.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
      out.push(seg(11, 11, vin, "Assembly plant", s.plant ?? null, s.plant ? {} : { note: "Not yet confirmed." }));
      return { segments: out, summary: s };
    };
    if (/^MM[AB]/.test(vin) && vin[5] === "K" && (vin[6] === "R" || vin[6] === "S")) {
      s.plant = MITSU_PLANT[vin[10]] ?? null;
      return tail(decodePajeroSport(vin, s));
    }
    if (/^JM[FYB]/.test(vin)) {
      const j = decodeJmf(vin, s);
      if (j) { s.plant = MITSU_PLANT[vin[10]] ?? null; return tail(j); }
    }
    if (vin.startsWith("6MMDB")) {
      s.model = "380"; s.series = "DB"; s.plant = "Tonsley Park, South Australia";
      return tail(decode380(vin, s));
    }
    const len = hit ? Math.max(hit[0].length, 1) : 4;
    const out: VinSegment[] = [seg(4, 3 + len, vin, "Model / series code", hit ? `${hit[1][0]} (${hit[1][1]})` : null, {
      note: hit && hit[0].length <= 2 ? "Matched on the model-family prefix only; exact variant not confirmed." : undefined,
    })];
    if (3 + len < 8) out.push(seg(4 + len, 8, vin, "Body / engine / grade", null, { note: "Not decoded." }));
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    out.push(seg(9, 9, vin, "Check digit", "Not used by Mitsubishi on Australian-delivered vehicles", { status: "standard" }));
    out.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
    // Plant letters: Mitsubishi NHTSA filing MC-10244842 + the service-manual VIN charts + AU recall lists.
    if (vin.startsWith("6MM")) s.plant = "Tonsley Park, South Australia";
    else s.plant = MITSU_PLANT[vin[10]] ?? null;
    out.push(seg(11, 11, vin, "Assembly plant", s.plant ?? null, s.plant ? {} : { note: "Not yet confirmed." }));
    return { segments: out, summary: s };
  },
};

// ── Nissan (JN1/JN6/JN8 Japan, MNT Thailand, VSK Spain, SJN UK, MDH/MHB India/Indonesia) ──
// Positions 7–9 = Nissan chassis code (T32, D23, Y62 …); 10 is a fixed "A" on export VINs.
// US-built 5N1/1N4 VINs use the North-American layout (real check digit and year) instead.
const NISSAN: Record<string, Hit> = {
  T30: ["X-Trail", "T30"], T31: ["X-Trail", "T31"], T32: ["X-Trail", "T32"], T33: ["X-Trail", "T33"],
  D22: ["Navara", "D22"], D40: ["Navara", "D40"], D23: ["Navara", "D23 (NP300)"],
  Y60: ["Patrol", "GQ (Y60)"], Y61: ["Patrol", "GU (Y61)"], Y62: ["Patrol", "Y62"],
  R50: ["Pathfinder", "R50"], R51: ["Pathfinder", "R51"], J10: ["Dualis / Qashqai", "J10"], J11: ["Qashqai", "J11"],
  N16: ["Pulsar", "N16"], C12: ["Pulsar", "C12"], B17: ["Pulsar", "B17"], K12: ["Micra", "K12"], K13: ["Micra", "K13"],
  L33: ["Altima", "L33"], Z33: ["350Z", "Z33"], Z34: ["370Z", "Z34"], Z50: ["Murano", "Z50"], Z51: ["Murano", "Z51"],
  F15: ["Juke", "F15"],
};

// Nissan international layout (added 2026-11-09): 4 body, 5 engine (meaningful only within one
// chassis code), 6 drive / cab spec, 7-9 chassis code, 10 market (A = Australia).
// Sources: Wikibooks Nissan VIN codes (rest-of-world format) and auto.ru's Nissan VIN guide for
// the layout; Total Engines (Australian parts catalogue listing every AU variant by Nissan code,
// totalengines.com.au/Vehicles/Nissan/...) for each variant group, corroborated by Australian
// recall VIN ranges (REC-002832, REC-005268, PRA 2016/15590, Takata), GoAuto VIN prefixes and real
// AU VINs. Only high-confidence groups are listed; others stay undecoded.
type NV = { body?: string; engine?: string; litres?: string; fuel?: string; drive?: string };
const NISSAN_GROUP: Record<string, NV> = {
  // Navara D40 (Spain, VSK)
  "D40:CVN": { body: "Dual cab", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel", drive: "4WD" },
  "D40:CLN": { engine: "4.0L V6 petrol (VQ40DE)", litres: "4.0", fuel: "Petrol", drive: "4WD" },
  "D40:CLA": { engine: "4.0L V6 petrol (VQ40DE)", litres: "4.0", fuel: "Petrol", drive: "2WD" },
  // Navara D40 (Thailand, MNT)
  "D40:ACU": { body: "Single cab", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel" },
  "D40:NCU": { body: "King cab", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel" },
  "D40:VCU": { body: "Dual cab", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel", drive: "4WD" },
  "D40:VCG": { body: "Dual cab", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel", drive: "2WD" },
  // X-Trail
  "T30:TBN": { body: "Wagon", engine: "2.5L petrol (QR25DE)", litres: "2.5", fuel: "Petrol", drive: "4WD" },
  "T30:TEN": { body: "Wagon", engine: "2.2L turbo diesel (YD22)", litres: "2.2", fuel: "Diesel", drive: "4WD" },
  "T31:TAN": { body: "Wagon", engine: "2.5L petrol (QR25DE)", litres: "2.5", fuel: "Petrol", drive: "4WD" },
  "T31:TCN": { body: "Wagon", engine: "2.0L turbo diesel (M9R)", litres: "2.0", fuel: "Diesel", drive: "4WD" },
  "T31:TBA": { body: "Wagon", engine: "2.0L petrol (MR20DE)", litres: "2.0", fuel: "Petrol", drive: "2WD" },
  "T32:TBN": { body: "Wagon", engine: "2.5L petrol (QR25DE)", litres: "2.5", fuel: "Petrol", drive: "4WD" },
  "T32:TBA": { body: "Wagon", engine: "2.5L petrol (QR25DE)", litres: "2.5", fuel: "Petrol", drive: "2WD" },
  "T32:TAA": { body: "Wagon", engine: "2.0L petrol (MR20DD)", litres: "2.0", fuel: "Petrol", drive: "2WD" },
  "T32:TCA": { body: "Wagon", engine: "1.6L turbo diesel (R9M)", litres: "1.6", fuel: "Diesel", drive: "2WD" },
  "T32:TCN": { body: "Wagon", engine: "1.6L turbo diesel (R9M)", litres: "1.6", fuel: "Diesel", drive: "4WD" },
  "T32:TFN": { body: "Wagon", engine: "2.0L turbo diesel (M9R)", litres: "2.0", fuel: "Diesel", drive: "4WD" },
  // Patrol, Pathfinder, Qashqai, Pulsar, Micra
  "Y62:TAN": { body: "Wagon", engine: "5.6L V8 petrol (VK56VD)", litres: "5.6", fuel: "Petrol", drive: "4WD" },
  "R51:JLW": { body: "Wagon", engine: "4.0L V6 petrol (VQ40DE)", litres: "4.0", fuel: "Petrol" },
  "R51:JVW": { body: "Wagon", engine: "2.5L turbo diesel (YD25DDTi)", litres: "2.5", fuel: "Diesel" },
  "R51:JAW": { body: "Wagon", engine: "3.0L V6 turbo diesel (V9X)", litres: "3.0", fuel: "Diesel" },
  "J11:FBA": { body: "Hatch / SUV", engine: "2.0L petrol (MR20DD)", litres: "2.0", fuel: "Petrol", drive: "2WD" },
  "B17:BAA": { body: "Sedan", engine: "1.8L petrol (MRA8DE)", litres: "1.8", fuel: "Petrol" },
  "B17:BCA": { body: "Sedan", engine: "1.6L turbo petrol (MR16DDT)", litres: "1.6", fuel: "Petrol" },
  // Altima L33 BCA: sedan 2.5 QR25DE CVT FWD (Auto Xchange WA listing MNTBCAL33A0000597 + Machter fitment).
  "L33:BCA": { body: "Sedan", engine: "2.5L petrol (QR25DE), CVT", litres: "2.5", fuel: "Petrol", drive: "2WD" },
  "K13:FBU": { body: "Hatch", engine: "1.2L petrol (HR12DE)", litres: "1.2", fuel: "Petrol" },
  "K13:FAU": { body: "Hatch", engine: "1.5L petrol (HR15DE)", litres: "1.5", fuel: "Petrol" },
};
const NISSAN_D22_BODY: Record<string, string> = { A: "Single cab", B: "King cab", C: "Dual cab" };
const NISSAN_D23_BODY: Record<string, string> = { C: "Dual cab", B: "King cab", D: "Single cab" };
const NISSAN_D23_ENGINE: Record<string, NV> = {
  A: { engine: "2.5L petrol (QR25DE)", litres: "2.5", fuel: "Petrol" },
  B: { engine: "2.3L turbo diesel (YS23)", litres: "2.3", fuel: "Diesel" },
};

function nissanVariant(vin: string): NV | null {
  const code = vin.slice(6, 9), grp = vin.slice(3, 6);
  const g = NISSAN_GROUP[`${code}:${grp}`];
  if (g) return g;
  if (code === "D22") { const b = NISSAN_D22_BODY[vin[3]]; return b ? { body: b } : null; }
  if (code === "D23") {
    const b = NISSAN_D23_BODY[vin[3]], e = NISSAN_D23_ENGINE[vin[4]];
    return b || e ? { ...(e ?? {}), ...(b ? { body: b } : {}) } : null;
  }
  return null;
}

export const nissan: MakeRule = {
  id: "nissan", make: "Nissan", wmis: ["JN1", "JN6", "JN8", "MNT", "VSK", "SJN", "MDH", "MHB"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Nissan" };
    const h = NISSAN[vin.slice(6, 9)];
    if (h) { s.model = h[0]; s.series = h[1]; }
    const v = nissanVariant(vin);
    if (v) {
      if (v.body) s.body = v.body;
      if (v.engine) Object.assign(s, { engine: v.engine, engineLitres: v.litres, fuel: v.fuel });
      if (v.drive) s.drive = v.drive;
    }
    const desc = v ? [v.body, v.engine, v.drive].filter(Boolean).join(", ") : null;
    return {
      segments: [
        seg(4, 6, vin, "Body / engine / drive", desc, desc ? {} : { note: "This Nissan variant group is not yet confirmed." }),
        seg(7, 9, vin, "Chassis code (model / generation)", h ? `${h[0]} (${h[1]})` : null, {
          note: "On export Nissans the chassis code runs up to position 9, so there is no check digit.",
        }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Fixed A on every Australian-delivered Nissan checked (1991–2022) — not a year." }),
        // Positions 10-11 are Nissan's market-destination code on international-format VINs; the WMI
        // names the plant country (Wikibooks Nissan international format + carlytics.eu + AU recall lists).
        seg(11, 11, vin, "Market code", null, { status: "filler", note: "Part of Nissan's market-destination code, not a plant. The first three characters show the country of manufacture." }),
      ],
      summary: s,
    };
  },
};

export const nissanUS: MakeRule = {
  id: "nissan-us", make: "Nissan", wmis: ["5N1", "1N4", "1N6"],
  checkDigit: "yes", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Nissan" };
    if (vin.startsWith("5N1AR2")) { s.model = "Pathfinder"; s.series = "R52"; }
    // C = Smyrna, Tennessee (Wikibooks "C Smyrna plant"; NHTSA vPIC on 5N1AR2MM0EC602711 "Smyrna Plant").
    s.plant = vin[10] === "C" ? "Smyrna, Tennessee, USA" : null;
    return {
      segments: [
        seg(4, 8, vin, "Model / body / engine (North-American layout)", s.model ? "Pathfinder (R52)" : null),
        seg(11, 11, vin, "Assembly plant", s.plant, s.plant ? {} : { note: "Not yet confirmed." }),
      ],
      summary: s,
    };
  },
};

// ── Suzuki (JSA/JS2/JS3 Japan, TSM Hungary, MA3/MBH India) ──────────────────────
// Positions 4–8 = Suzuki model code; 9 not a check digit; 10 fixed 0.
const SUZUKI: Record<string, Hit> = {
  AZC: ["Swift", "AZ"], FZC: ["Swift", "FZ"], EZC: ["Swift", "EZ"], FJB: ["Jimny", "JB43 (Jimny / Sierra)"],
  JJC74: ["Jimny XL", "JC74 (5-door)"], JTA: ["Grand Vitara", "JT"], JTD: ["Grand Vitara", "JT"], ETD: ["Vitara", "ET"],
  EGC: ["Baleno", "EG"], EWB: ["Baleno", "EW"], LYD: ["Vitara", "LY"], JYA: ["S-Cross", "JY"], JYB: ["S-Cross", "JY"],
};

export const suzuki: MakeRule = {
  id: "suzuki", make: "Suzuki", wmis: ["JSA", "JS2", "JS3", "TSM", "MA3", "MBH"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Suzuki" };
    const hit = prefixLookup(SUZUKI, vin.slice(3, 8));
    if (hit) { s.model = hit[1][0]; s.series = hit[1][1]; }
    return {
      segments: [
        seg(4, 8, vin, "Model code", hit ? `${hit[1][0]} (${hit[1][1]})` : null),
        seg(9, 9, vin, "Check digit", "Not used by Suzuki on Australian-delivered vehicles", { status: "standard" }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Fixed 0 on every Australian-delivered Suzuki checked (1993–2023)." }),
        seg(11, 11, vin, "Fixed character", null, { status: "filler", note: "Always 0 on Australian Suzukis (about 25,000 recall-list VINs from Japan, India and Hungary) — not a plant code." }),
      ],
      summary: s,
    };
  },
};

// ── Hyundai / Kia (KMH/KMF/KNA/KNC/KND…) — shared scheme ─────────────────────────
const BODY_HK: Record<string, string> = { "3": "3-door hatch", "4": "4-door sedan", "5": "5-door hatch", "6": "Coupe", "8": "Wagon / SUV / people mover" };
const RESTRAINT_HK: Record<string, string> = {
  "1": "Active 3-point belts", "2": "Passive restraint", "3": "Driver airbag, manual belt", "4": "Dual airbags, manual belts",
  "5": "Depowered airbags, active belts",
};
const HYUNDAI_PLANT: Record<string, string> = {
  A: "Asan, Korea", C: "Jeonju, Korea", U: "Ulsan, Korea", W: "Gwangju, Korea", J: "Nošovice, Czech Republic",
  M: "Chennai, India", Z: "İzmit, Turkey",
};
const KIA_PLANT: Record<string, string> = { "5": "Hwaseong, Korea", "6": "Korea", "7": "Korea", L: "Žilina, Slovakia" };

function hyundaiLine(vin: string): Hit | null {
  const l = vin[3], body = vin[5];
  if (vin.startsWith("KMH")) {
    if (l === "D") {
      if (body === "4") return ["Elantra", "HD / MD / AD"];
      // i30: FD carries a letter at position 5 (B SX, C SLX/SR), GD a digit (2 Active, 3 Elite/SR).
      return /[A-Z]/.test(vin[4]) ? ["i30", "FD"] : /[0-9]/.test(vin[4]) ? ["i30", "GD"] : ["i30", "FD / GD"];
    }
    if (l === "H") return ["i30", "PD"];
    if (l === "J") return ["Tucson / ix35", "Tucson family"];
    if (l === "K") return ["Kona", "OS"];
    if (l === "C") return ["Accent", "Accent"];
    if (l === "S") return ["Santa Fe", "Santa Fe"];
    // KMHR = Venue (QX): recall REC-005535 (all KMHR...812) + Cars4Us listings (2026-11-09).
    if (l === "R") return ["Venue", "QX"];
  }
  // KMFY = Staria Load US4 (Cranbourne Hyundai KMFYFX71MVU279859 "STARIA LOAD US4"; Pennant Hills
  // Hyundai KMFYFX71MVU281286 "Staria Load Diesel").
  if (vin.startsWith("KMF") && vin[3] === "Y") return ["Staria Load", "US4"];
  return null;
}
// Kia lines added / corrected 2026-11-09 from 235 VINs on two independent dealers' stock pages
// (John Hughes Kia, Tynan Kia) + Wikibooks Kia VIN codes (US Part 565): KNAR is the Sorento MQ4
// (not a Carnival), KNAN the Carnival KA4, KNAE Seltos, KNAB Picanto, KNCS the Tasman ute.
// KNAP is shared: Sportage (QL, NQ5) and, with position 5 = H, the Sorento UM.
function kiaLine(vin: string): Hit | null {
  if (vin.startsWith("KNCS")) return ["Tasman", "TK"];
  if (!vin.startsWith("KNA")) return null;
  const l = vin[3];
  if (l === "F") return ["Cerato", "Cerato / Forte"];
  if (l === "D") return ["Rio / Stonic", "YB family"];
  if (l === "P") return vin[4] === "H" ? ["Sorento", "UM"] : ["Sportage", "Sportage (Korean-built)"];
  if (l === "M") return ["Carnival", "Carnival"];
  if (l === "N") return ["Carnival", "KA4"];
  if (l === "R") return ["Sorento", "MQ4"];
  if (l === "E") return ["Seltos", "Seltos"];
  if (l === "B") return ["Picanto", "JA"];
  return null;
}

type Eng = { name: string; litres: string; fuel: string };
const E = (name: string, litres: string, fuel: string): Eng => ({ name, litres, fuel });
// Kia engine letter (position 8) — assigned per model line AND generation, so keyed by line and
// model year. Only letters seen consistently at both dealers, or at one dealer plus the Wikibooks
// Kia (US Part 565) table, are included.
function kiaEngine(vin: string, year: number | null): Eng | null {
  const line = vin.slice(0, 4), c = vin[7], y = year ?? 0;
  switch (line) {
    case "KNAB": return ({ "2": E("1.2L petrol", "1.2", "Petrol") } as Record<string, Eng>)[c] ?? null;
    case "KNAD": return ({ "4": E("1.4L petrol", "1.4", "Petrol"), "7": E("1.0L turbo petrol", "1.0", "Petrol") } as Record<string, Eng>)[c] ?? null;
    case "KNAE": return y >= 2020 && y <= 2025
      ? ({ A: E("2.0L petrol", "2.0", "Petrol"), "2": E("1.6L turbo petrol", "1.6", "Petrol"), "7": E("1.6L turbo petrol", "1.6", "Petrol") } as Record<string, Eng>)[c] ?? null
      : null;
    case "KNAF":
      if (y >= 2019) return ({ C: E("2.0L petrol", "2.0", "Petrol"), "7": E("1.6L turbo petrol (GT)", "1.6", "Petrol") } as Record<string, Eng>)[c] ?? null;      // Cerato BD
      if (y >= 2013) return ({ "7": E("2.0L petrol", "2.0", "Petrol"), "6": E("1.8L petrol", "1.8", "Petrol") } as Record<string, Eng>)[c] ?? null; // Cerato YD
      return null;
    case "KNAN": return ({ A: E("1.6L turbo petrol hybrid", "1.6", "Hybrid"), B: E("2.2L turbo diesel", "2.2", "Diesel"), "3": E("3.5L V6 petrol", "3.5", "Petrol") } as Record<string, Eng>)[c] ?? null;
    case "KNAP":
      if (vin[4] === "H") return ({ B: E("2.2L turbo diesel", "2.2", "Diesel") } as Record<string, Eng>)[c] ?? null; // Sorento UM
      if (y >= 2022) return ({ C: E("2.0L turbo diesel", "2.0", "Diesel"), D: E("2.0L petrol", "2.0", "Petrol"), G: E("1.6L turbo petrol hybrid", "1.6", "Hybrid") } as Record<string, Eng>)[c] ?? null; // Sportage NQ5
      if (y >= 2016) return ({ A: E("2.0L petrol", "2.0", "Petrol"), C: E("2.4L petrol", "2.4", "Petrol"), "3": E("2.0L turbo diesel", "2.0", "Diesel") } as Record<string, Eng>)[c] ?? null; // Sportage QL
      return null;
    case "KNAR": return ({ E: E("3.5L V6 petrol", "3.5", "Petrol"), B: E("2.2L turbo diesel", "2.2", "Diesel"), G: E("1.6L turbo petrol hybrid", "1.6", "Hybrid"), H: E("1.6L turbo petrol plug-in hybrid", "1.6", "Plug-in Hybrid") } as Record<string, Eng>)[c] ?? null;
    case "KNCS": return ({ A: E("2.2L turbo diesel", "2.2", "Diesel") } as Record<string, Eng>)[c] ?? null;
    // Carnival VQ: 7 = 3.5 V6 petrol (Grand Carnival listings + recall REC-000790 "petrol vehicles" = all …817).
    case "KNAM": return ({ "7": E("3.5L V6 petrol", "3.5", "Petrol") } as Record<string, Eng>)[c] ?? null;
    default: return null;
  }
}
// Hyundai engine letter (position 8), added 2026-11-09. Per model line; two sources each:
// Australian recall VIN lists on vehiclerecalls.gov.au (model/engine-specific recalls, ~500k VINs)
// + auction/dealer listings with VIN and engine, or the Wikibooks Hyundai (US Part 565) table.
// i30 FD vs GD share the letter E for different engines: FD has a letter at position 5 (B/C),
// GD a digit (2/3).
function hyundaiEngine(vin: string, year: number | null): Eng | null {
  const c = vin[7], y = year ?? 0;
  const pre = vin.slice(0, 4);
  if (pre === "KMHD" && vin[5] !== "4") {                       // i30 FD / GD
    if (/[A-Z]/.test(vin[4])) return c === "E" ? E("2.0L petrol (Beta)", "2.0", "Petrol") : null;
    // GD H = 2.0 GDi (Hyundai GD shop manual "H : Gasoline engine 2.0 (Nu GDI)" + SR / SR Premium listings).
    if (/[0-9]/.test(vin[4])) return c === "E" ? E("1.8L petrol (Nu MPi)", "1.8", "Petrol") : c === "H" ? E("2.0L petrol (Nu GDi)", "2.0", "Petrol") : null;
    return null;
  }
  if (pre === "KMHD" && vin[5] === "4" && y >= 2016) {          // Elantra AD
    return ({ F: E("2.0L petrol (Nu)", "2.0", "Petrol"), B: E("1.6L turbo petrol", "1.6", "Petrol") } as Record<string, Eng>)[c] ?? null;
  }
  // Staria Load (KMFY): 1 = 2.2 CRDi diesel (Cranbourne Hyundai + Pennant Hills Hyundai stock, VIN + spec).
  if (pre === "KMFY") return c === "1" ? E("2.2L turbo diesel (CRDi)", "2.2", "Diesel") : null;
  if (pre === "KMHH") return c === "E" ? E("2.0L petrol", "2.0", "Petrol") : c === "C" ? E("1.6L turbo petrol", "1.6", "Petrol") : null;   // i30 PD
  if (pre === "KMHR") return c === "2" ? E("1.6L petrol", "1.6", "Petrol") : null;   // Venue
  if (pre === "KMHJ" || pre === "TMAJ") {                        // ix35 (to 2015) / Tucson TL
    return ({
      C: E("2.4L petrol", "2.4", "Petrol"), V: E("2.0L turbo diesel (CRDi)", "2.0", "Diesel"), F: E("2.0L petrol (GDi)", "2.0", "Petrol"),
      "4": E("2.0L petrol (GDi)", "2.0", "Petrol"), A: E("2.0L turbo diesel (CRDi)", "2.0", "Diesel"),
    } as Record<string, Eng>)[c] ?? null;
  }
  if (pre === "KMHK") {                                           // Kona OS / SX2
    return ({
      A: E("2.0L petrol", "2.0", "Petrol"), "5": E("1.6L turbo petrol", "1.6", "Petrol"), G: E("Electric", "", "Electric"),
      C: E("2.0L turbo petrol (Kona N)", "2.0", "Petrol"),
      B: E("2.0L petrol", "2.0", "Petrol"), "3": E("1.6L turbo petrol", "1.6", "Petrol"), "1": E("1.6L petrol hybrid", "1.6", "Hybrid"),
    } as Record<string, Eng>)[c] ?? null;
  }
  return null;
}
// Position 5 grade bands (added 2026-11-09). Two sources each: Australian listings from independent
// sellers (John Hughes Kia, Tynan Kia, Cars4Us, JCS dealer sites, Carsguide, Toyota-used) and recall
// VIN lists naming the variant. A band can cover several adjacent trims; it is not an exact trim.
function hyundaiTrim(vin: string, year: number | null): string | null {
  const pre = vin.slice(0, 4), c = vin[4], y = year ?? 0;
  if (pre === "KMHD" && vin[5] !== "4") {
    // C = SLX (recall REC-003052 "FD i30 SX and SLX" VIN ranges + FD factory manual "C Super Deluxe (GLS)").
    if (/[A-Z]/.test(c)) return ({ B: "SX", C: "SLX (some SR)" } as Record<string, string>)[c] ?? null;   // i30 FD
    return ({ "2": "Active", "3": "Elite / SR" } as Record<string, string>)[c] ?? null;  // i30 GD
  }
  if (pre === "KMHD" && vin[5] === "4" && y >= 2016) return ({ "8": "2.0 grades (Active / Elite)", "0": "SR Turbo" } as Record<string, string>)[c] ?? null; // Elantra AD
  if (pre === "KMHH") return ({ "3": "Go / Active / Elite / Premium", "5": "SR / N Line" } as Record<string, string>)[c] ?? null; // i30 PD
  return null;
}
function kiaTrim(vin: string, year: number | null): string | null {
  const line = vin.slice(0, 4), c = vin[4], y = year ?? 0;
  const t = (m: Record<string, string>) => m[c] ?? null;
  switch (line) {
    case "KNAP":
      if (c === "H") return null;                                                   // Sorento UM
      if (y >= 2022) return t({ U: "S / SX", V: "SX+", X: "GT-Line" });           // Sportage NQ5
      if (y >= 2016) return t({ M: "Si / Si Premium / S", N: "SLi", R: "GT-Line / Platinum" }); // Sportage QL
      return null;
    case "KNAR": return t({ G: "S / Sport", H: "Sport+ / GT-Line" });            // Sorento MQ4
    case "KNAN": return t({ B: "S", C: "Si / Platinum / Sport+ / GT-Line" });     // Carnival KA4
    case "KNAF": return y >= 2019 ? t({ "2": "S / Sport", "3": "Sport+", "4": "GT" }) : null; // Cerato BD
    case "KNAE": return y >= 2020 && y <= 2025 ? t({ P: "S / Sport", R: "Sport+ / GT-Line" }) : null; // Seltos SP2
    case "KNAB": return t({ "3": "GT-Line" });                                    // Picanto
    case "KNCS": return t({ E: "X-Pro" });   // Tasman (listings + Great Western Kia stock page)
    default: return null;
  }
}

// Hyundai position 9 on Australian-delivered cars from model year 2010 (recall VIN lists with
// build dates + listings): transmission and driven wheels.
// From model year 2010 position 9 = driver side + transmission on non-US Hyundais and Kias (Hyundai GD
// shop manual "L : RHD & MT, M : RHD & AT, N : RHD & MT+Transfer, S : RHD & AT+Transfer, T : RHD & CVT";
// Kia Soul PS manual, same scheme; ~600,000 AU recall VINs, none passing the ISO check-digit test).
// Up to model year 2009 Hyundai position 9 = R, right-hand drive (FD manual "P (LHD), R (RHD)" + 45,000 recall VINs).
const HYUNDAI_TRANS: Record<string, [trans: string, drive: string]> = {
  N: ["Manual", "AWD / 4WD (transfer case)"], T: ["CVT", "2WD"],
  L: ["Manual", "2WD"], M: ["Automatic", "2WD"], S: ["Automatic", "AWD"], V: ["Dual-clutch automatic", "2WD"], W: ["Dual-clutch automatic", "AWD"],
};

// Kia position 9 on Australian-delivered cars = transmission + driven wheels (both dealers agree).
const KIA_TRANS: Record<string, [trans: string, drive: string]> = {
  L: ["Manual", "2WD"], N: ["Manual", "AWD / 4WD (transfer case)"], T: ["CVT", "2WD"],
  M: ["Automatic", "2WD"], S: ["Automatic", "AWD / 4WD"], V: ["Dual-clutch automatic", "2WD"], W: ["Dual-clutch automatic", "AWD / 4WD"],
};

function koreanDecode(
  make: string, line: (v: string) => Hit | null, plants: Record<string, string>,
  engine?: (v: string, year: number | null) => Eng | null, trans?: Record<string, [string, string]>,
  trim?: (v: string, year: number | null) => string | null,
) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const h = line(vin);
    if (h) { s.model = h[0]; s.series = h[1]; }
    const body = BODY_HK[vin[5]] ?? null; s.body = body;
    const rs = RESTRAINT_HK[vin[6]] ?? null; s.restraint = rs;
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    const plant = plants[vin[10]] ?? null; s.plant = plant;
    const eng = engine ? engine(vin, y) : null;
    const grade = trim ? trim(vin, y) : null;
    if (grade) s.trim = grade;
    if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, fuel: eng.fuel });
    // Position-9 transmission letters: model year 2010 on (both makes).
    const tr = trans && (y ?? 0) >= 2010 ? trans[vin[8]] : undefined;
    const rhdOld = make === "Hyundai" && y !== null && y <= 2009 && vin[8] === "R";
    if (tr) { s.transmission = tr[0]; s.drive = tr[1]; }
    return {
      segments: [
        seg(4, 4, vin, "Model line", h ? `${h[0]} (${h[1]})` : null, {
          note: h?.[1].includes("pattern") ? "Identified by matching other Australian VINs; not yet two-sourced." : undefined,
        }),
        seg(5, 5, vin, "Trim / specification", grade, grade ? { note: "A grade band: one letter can cover several adjacent trims." } : { note: "Varies by model and year — not decoded." }),
        seg(6, 6, vin, "Body type", body),
        seg(7, 7, vin, "Restraint system", rs),
        seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "Engine letters change meaning between models and generations — this one is not yet confirmed." }),
        tr
          ? seg(9, 9, vin, "Transmission / drive", `${tr[0]}, ${tr[1]}`)
          : rhdOld ? seg(9, 9, vin, "Steering side", "Right-hand drive", { note: "Not a check digit." })
          : seg(9, 9, vin, "Check / production code", null, { note: "Not an ISO check digit on Australian-delivered Hyundai and Kia VINs (often a letter)." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  };
}

export const hyundai: MakeRule = {
  id: "hyundai", make: "Hyundai", wmis: ["KMH", "KMF", "KMJ", "KM8", "TMA", "MAL", "NLH", "5NP"],
  checkDigit: "no", modelYear: "yes",
  decode: koreanDecode("Hyundai", hyundaiLine, HYUNDAI_PLANT, hyundaiEngine, HYUNDAI_TRANS, hyundaiTrim),
};
export const kia: MakeRule = {
  id: "kia", make: "Kia", wmis: ["KNA", "KNC", "KND", "KNE", "U5Y", "U6Y", "MS0"],
  checkDigit: "no", modelYear: "yes",
  decode: koreanDecode("Kia", kiaLine, KIA_PLANT, kiaEngine, KIA_TRANS, kiaTrim),
};
