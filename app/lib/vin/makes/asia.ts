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
const MAZDA_BODY: Record<string, string> = { W: "Wagon / SUV" };
const MAZDA_ENGINE: Record<string, { name: string; litres: string; fuel: string }> = {
  "7": { name: "2.0L SKYACTIV-G petrol (PE)", litres: "2.0", fuel: "Petrol" },
  "2": { name: "2.2L SKYACTIV-D diesel (SH)", litres: "2.2", fuel: "Diesel" },
};
const MAZDA_ENGINE_NEW: Record<string, { name: string; litres: string; fuel: string }> = {
  ...MAZDA_ENGINE,
  L: { name: "2.5L SKYACTIV-G petrol (PY family)", litres: "2.5", fuel: "Petrol" },
};

function mazdaDescriptor(vin: string, s: Partial<VinSummary>): VinSegment[] {
  const code = vin.slice(3, 5);
  const fill = (e?: { name: string; litres: string; fuel: string }) => {
    if (e) Object.assign(s, { engine: e.name, engineLitres: e.litres, engineCylinders: "4", fuel: e.fuel });
  };
  if (MAZDA_NEW_LAYOUT.has(code)) {
    const drive = MAZDA_DRIVE[vin[5]] ?? null; if (drive) s.drive = drive;
    const body = MAZDA_BODY[vin[6]] ?? null; if (body) s.body = body;
    const eng = MAZDA_ENGINE_NEW[vin[7]]; fill(eng);
    return [
      seg(6, 6, vin, "Drive", drive),
      seg(7, 7, vin, "Body", body, body ? {} : { note: "This Mazda body letter is not yet confirmed." }),
      seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This Mazda engine code is not yet confirmed." }),
    ];
  }
  if (MAZDA_OLD_LAYOUT.has(code)) {
    const eng = MAZDA_ENGINE[vin[7]]; fill(eng);
    return [
      seg(6, 7, vin, "Body / descriptor", null, { note: "Mazda sub-code — not decoded." }),
      seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "This Mazda engine code is not yet confirmed." }),
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
    return {
      segments: [
        seg(4, 5, vin, "Model code", h ? `${h[0]} (${h[1]})` : null),
        ...mazdaDescriptor(vin, s),
        seg(9, 9, vin, "Check digit", "Not used by Mazda on Australian-delivered vehicles", { status: "standard" }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Mazda does not encode the model year here on Australian-delivered cars (usually 0)." }),
      ],
      summary: s,
    };
  },
};

// ── Mitsubishi (JMF/JMY/JA4 Japan, MMA/MMB/MMC/MMT Thailand, 6MM Adelaide) ────────
// Model code at 4–7/8; 9 is not a check digit; 10 IS a real model year (confirmed on 12+ AU VINs).
const MITSUBISHI: Record<string, Hit> = {
  XTGA: ["ASX", "XC"], XTGF: ["Outlander", "ZL"], XT: ["ASX / Outlander", "XA–ZL platform"],
  LYV: ["Pajero", "NM–NS"], L: ["Pajero", "Pajero family"],
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
const TRITON_TRANS_OLD: Record<string, string> = { N: "5-speed manual", R: "4-speed automatic" };   // ML/MN
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
const TRITON_PLANT: Record<string, string> = { D: "MMC Sittipol, Thailand", H: "Laem Chabang, Thailand" };

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
    const len = hit ? Math.max(hit[0].length, 1) : 4;
    const out: VinSegment[] = [seg(4, 3 + len, vin, "Model / series code", hit ? `${hit[1][0]} (${hit[1][1]})` : null, {
      note: hit && hit[0].length <= 2 ? "Matched on the model-family prefix only; exact variant not confirmed." : undefined,
    })];
    if (3 + len < 8) out.push(seg(4 + len, 8, vin, "Body / engine / grade", null, { note: "Not decoded." }));
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    out.push(seg(9, 9, vin, "Check digit", "Not used by Mitsubishi on Australian-delivered vehicles", { status: "standard" }));
    out.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
    if (vin.startsWith("6MM")) { s.plant = "Tonsley Park, South Australia"; out.push(seg(11, 11, vin, "Assembly plant", s.plant)); }
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

export const nissan: MakeRule = {
  id: "nissan", make: "Nissan", wmis: ["JN1", "JN6", "JN8", "MNT", "VSK", "SJN", "MDH", "MHB"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Nissan" };
    const h = NISSAN[vin.slice(6, 9)];
    if (h) { s.model = h[0]; s.series = h[1]; }
    return {
      segments: [
        seg(4, 6, vin, "Body / engine / grade", null, { note: "Nissan sub-code — not decoded." }),
        seg(7, 9, vin, "Chassis code (model / generation)", h ? `${h[0]} (${h[1]})` : null, {
          note: "On export Nissans the chassis code runs up to position 9, so there is no check digit.",
        }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Fixed A on every Australian-delivered Nissan checked (1991–2022) — not a year." }),
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
    return { segments: [seg(4, 8, vin, "Model / body / engine (North-American layout)", s.model ? "Pathfinder (R52)" : null)], summary: s };
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
  }
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
      if (y >= 2019) return ({ C: E("2.0L petrol", "2.0", "Petrol") } as Record<string, Eng>)[c] ?? null;      // Cerato BD
      if (y >= 2013) return ({ "7": E("2.0L petrol", "2.0", "Petrol"), "6": E("1.8L petrol", "1.8", "Petrol") } as Record<string, Eng>)[c] ?? null; // Cerato YD
      return null;
    case "KNAN": return ({ A: E("1.6L turbo petrol hybrid", "1.6", "Hybrid"), B: E("2.2L turbo diesel", "2.2", "Diesel"), "3": E("3.5L V6 petrol", "3.5", "Petrol") } as Record<string, Eng>)[c] ?? null;
    case "KNAP":
      if (vin[4] === "H") return ({ B: E("2.2L turbo diesel", "2.2", "Diesel") } as Record<string, Eng>)[c] ?? null; // Sorento UM
      if (y >= 2022) return ({ C: E("2.0L turbo diesel", "2.0", "Diesel"), D: E("2.0L petrol", "2.0", "Petrol"), G: E("1.6L turbo petrol hybrid", "1.6", "Hybrid") } as Record<string, Eng>)[c] ?? null; // Sportage NQ5
      if (y >= 2016) return ({ A: E("2.0L petrol", "2.0", "Petrol"), C: E("2.4L petrol", "2.4", "Petrol") } as Record<string, Eng>)[c] ?? null; // Sportage QL
      return null;
    case "KNAR": return ({ B: E("2.2L turbo diesel", "2.2", "Diesel"), G: E("1.6L turbo petrol hybrid", "1.6", "Hybrid"), H: E("1.6L turbo petrol plug-in hybrid", "1.6", "Plug-in Hybrid") } as Record<string, Eng>)[c] ?? null;
    case "KNCS": return ({ A: E("2.2L turbo diesel", "2.2", "Diesel") } as Record<string, Eng>)[c] ?? null;
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
    if (/[0-9]/.test(vin[4])) return c === "E" ? E("1.8L petrol (Nu MPi)", "1.8", "Petrol") : null;
    return null;
  }
  if (pre === "KMHD" && vin[5] === "4" && y >= 2016) {          // Elantra AD
    return ({ F: E("2.0L petrol (Nu)", "2.0", "Petrol"), B: E("1.6L turbo petrol", "1.6", "Petrol") } as Record<string, Eng>)[c] ?? null;
  }
  if (pre === "KMHH") return c === "E" ? E("2.0L petrol", "2.0", "Petrol") : null;   // i30 PD
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
// Hyundai position 9 on Australian-delivered cars from model year 2010 (recall VIN lists with
// build dates + listings): transmission and driven wheels.
const HYUNDAI_TRANS: Record<string, [trans: string, drive: string]> = {
  L: ["Manual", "2WD"], M: ["Automatic", "2WD"], S: ["Automatic", "AWD"], V: ["Dual-clutch automatic", "2WD"], W: ["Dual-clutch automatic", "AWD"],
};

// Kia position 9 on Australian-delivered cars = transmission + driven wheels (both dealers agree).
const KIA_TRANS: Record<string, [trans: string, drive: string]> = {
  M: ["Automatic", "2WD"], S: ["Automatic", "AWD / 4WD"], V: ["Dual-clutch automatic", "2WD"], W: ["Dual-clutch automatic", "AWD / 4WD"],
};

function koreanDecode(
  make: string, line: (v: string) => Hit | null, plants: Record<string, string>,
  engine?: (v: string, year: number | null) => Eng | null, trans?: Record<string, [string, string]>,
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
    if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, fuel: eng.fuel });
    // Position-9 transmission letters: evidenced on 2015+ Kias and 2010+ Hyundais.
    const tr = trans && (y ?? 0) >= (make === "Kia" ? 2015 : 2010) ? trans[vin[8]] : undefined;
    if (tr) { s.transmission = tr[0]; s.drive = tr[1]; }
    return {
      segments: [
        seg(4, 4, vin, "Model line", h ? `${h[0]} (${h[1]})` : null, {
          note: h?.[1].includes("pattern") ? "Identified by matching other Australian VINs; not yet two-sourced." : undefined,
        }),
        seg(5, 5, vin, "Trim / specification", null, { note: "Varies by model and year — not decoded." }),
        seg(6, 6, vin, "Body type", body),
        seg(7, 7, vin, "Restraint system", rs),
        seg(8, 8, vin, "Engine", eng?.name ?? null, eng ? {} : { note: "Engine letters change meaning between models and generations — this one is not yet confirmed." }),
        tr
          ? seg(9, 9, vin, "Transmission / drive", `${tr[0]}, ${tr[1]}`)
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
  decode: koreanDecode("Hyundai", hyundaiLine, HYUNDAI_PLANT, hyundaiEngine, HYUNDAI_TRANS),
};
export const kia: MakeRule = {
  id: "kia", make: "Kia", wmis: ["KNA", "KNC", "KND", "KNE", "U5Y", "U6Y", "MS0"],
  checkDigit: "no", modelYear: "yes",
  decode: koreanDecode("Kia", kiaLine, KIA_PLANT, kiaEngine, KIA_TRANS),
};
