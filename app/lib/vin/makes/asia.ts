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
        seg(6, 8, vin, "Body / engine / grade", null, { note: "Mazda sub-code — no published table; not decoded." }),
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

export const mitsubishi: MakeRule = {
  id: "mitsubishi", make: "Mitsubishi", wmis: ["JMF", "JMY", "JMB", "JA4", "MMA", "MMB", "MMC", "MMT", "6MM"],
  checkDigit: "no", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Mitsubishi" };
    const hit = prefixLookup(MITSUBISHI, vin.slice(3, 8));
    if (hit) { s.model = hit[1][0]; s.series = hit[1][1]; }
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
    if (l === "D") return body === "4" ? ["Elantra", "HD / MD / AD"] : ["i30", "FD / GD"];
    if (l === "H") return ["i30", "PD"];
    if (l === "J") return ["Tucson / ix35", "Tucson family"];
    if (l === "K") return ["Kona", "OS"];
    if (l === "C") return ["Accent", "Accent"];
    if (l === "S") return ["Santa Fe", "Santa Fe"];
  }
  return null;
}
function kiaLine(vin: string): Hit | null {
  if (!vin.startsWith("KNA")) return null;
  const l = vin[3];
  if (l === "F") return ["Cerato", "Cerato / Forte"];
  if (l === "D") return ["Rio", "Rio"];
  if (l === "P") return ["Sportage", "Sportage (Korean-built)"];
  if (l === "M") return ["Carnival", "Carnival"];
  return null;
}

function koreanDecode(make: string, line: (v: string) => Hit | null, plants: Record<string, string>) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const h = line(vin);
    if (h) { s.model = h[0]; s.series = h[1]; }
    const body = BODY_HK[vin[5]] ?? null; s.body = body;
    const rs = RESTRAINT_HK[vin[6]] ?? null; s.restraint = rs;
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    const plant = plants[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Model line", h ? `${h[0]} (${h[1]})` : null, {
          note: h?.[1].includes("pattern") ? "Identified by matching other Australian VINs; not yet two-sourced." : undefined,
        }),
        seg(5, 5, vin, "Trim / specification", null, { note: "Varies by model and year — not decoded." }),
        seg(6, 6, vin, "Body type", body),
        seg(7, 7, vin, "Restraint system", rs),
        seg(8, 8, vin, "Engine", null, { note: "Engine letters change meaning between generations — not decoded." }),
        seg(9, 9, vin, "Check / production code", null, { note: "Not an ISO check digit on Australian-delivered Hyundai and Kia VINs (often a letter)." }),
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
  decode: koreanDecode("Hyundai", hyundaiLine, HYUNDAI_PLANT),
};
export const kia: MakeRule = {
  id: "kia", make: "Kia", wmis: ["KNA", "KNC", "KND", "KNE", "U5Y", "U6Y", "MS0"],
  checkDigit: "no", modelYear: "yes",
  decode: koreanDecode("Kia", kiaLine, KIA_PLANT),
};
