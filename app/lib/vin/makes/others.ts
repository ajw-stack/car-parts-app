// Elroco VIN Decoding Code — Code Rules 16, 33, 34 (docs/vin-decoder-rules.md).
// Holden (Korean-built, KL3), BMW, Renault.
// Sources: Elroco VIN research 2026-09-29 gap round — NHTSA "Amendment to VIN System Codes"
// (Daewoo Motor America) and GM Korea plant pages for KL plant letters; Australian parts-trade
// listings (MMM Auto Centre, CarFacts, allgoodparts, jcsparts) for KL3 model letters;
// BMWBlog and real Australian Pickles listings for BMW; motorinsel.uk for Renault RFB.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

// ── Holden, Korean-built (KL3: GM Korea / GM Daewoo rest-of-world layout) ─────────
const KL3_LINE: Record<string, [model: string, series: string]> = {
  J: ["Cruze", "JG/JH (J300)"],
  M: ["Barina Spark", "MJ (M300)"],
  D: ["Captiva", "CG (C100/C140)"],
  T: ["Barina", "TM (T300)"],
};
const GM_KOREA_PLANT: Record<string, string> = { B: "Bupyeong, Korea", K: "Gunsan, Korea", C: "Changwon, Korea" };

export const holdenKorea: MakeRule = {
  id: "holden-korea", make: "Holden", wmis: ["KL3"],
  checkDigit: "no", modelYear: "yes", years: [2002, 2020],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Holden" };
    const l = KL3_LINE[vin[3]];
    if (l) { s.model = l[0]; s.series = l[1]; }
    const y = resolveModelYear(vin[9], 2002, 2020); s.modelYear = y;
    const plant = GM_KOREA_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Model line", l ? `${l[0]} (${l[1]})` : null, {
          note: vin[3] === "M" || vin[3] === "T" ? "Single Australian parts-trade source; not yet two-sourced." : undefined,
        }),
        seg(5, 8, vin, "Series / body / restraint / engine", null, { note: "GM Korea rest-of-world detail codes are not published — not decoded." }),
        seg(9, 9, vin, "Check digit", "Not the North-American check-digit algorithm on these VINs", { status: "standard" }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ── BMW (WBA/WBS/WBX/WBY) — positions 4–7 are a type code BMW has never published as a table.
// Only type codes seen on real Australian listings are named. Position 10 is "0" (not a year)
// on Australian and European BMWs; position 11 starts the 7-character short VIN (plant letter).
const BMW_TYPE: Record<string, [model: string, series: string]> = {
  FE42: ["X5", "E70"],
  VC36: ["3 Series", "E90 (320d)"],
  VA76: ["3 Series", "3 Series (listing)"],
  "3D36": ["3 Series", "3 Series (listing)"],
  PN36: ["3 Series", "3 Series (listing)"],
  JU42: ["X5", "X5 (listing; generation unconfirmed)"],
};
const BMW_PLANT: Record<string, string> = {
  A: "Munich, Germany", F: "Munich, Germany", G: "Munich, Germany", K: "Munich, Germany",
  B: "Dingolfing, Germany", C: "Dingolfing, Germany", D: "Dingolfing, Germany",
  E: "Regensburg, Germany", J: "Regensburg, Germany", P: "Regensburg, Germany",
  L: "Spartanburg, USA", N: "Rosslyn, South Africa",
};

export const bmw: MakeRule = {
  id: "bmw", make: "BMW", wmis: ["WBA", "WBS", "WBX", "WBY"],
  checkDigit: "mixed", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "BMW" };
    const t = BMW_TYPE[vin.slice(3, 7)];
    if (t) { s.model = t[0]; s.series = t[1]; }
    const plant = BMW_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 7, vin, "Type code", t ? `${t[0]} (${t[1]})` : `Type ${vin.slice(3, 7)}`, {
          note: t ? "Type code seen on a real Australian listing." : "BMW does not publish its type-code table — look this code up in the BMW parts catalogue.",
          status: t ? "decoded" : "not-decoded",
        }),
        seg(8, 8, vin, "Type code extension", null, { note: "Not decoded." }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "BMW does not encode the model year on Australian and European VINs (0)." }),
        seg(11, 11, vin, "Assembly plant (start of 7-character short VIN)", plant),
      ],
      summary: s,
    };
  },
};

// ── Renault (VF1) — positions 4–6 carry the Renault model code. ───────────────────
const RENAULT: Record<string, [model: string, series: string]> = { RFB: ["Megane", "RFB (Megane IV)"] };

export const renault: MakeRule = {
  id: "renault", make: "Renault", wmis: ["VF1", "VF2"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Renault" };
    const m = RENAULT[vin.slice(3, 6)];
    if (m) { s.model = m[0]; s.series = m[1]; }
    return {
      segments: [seg(4, 6, vin, "Model code", m ? `${m[0]} (${m[1]})` : null, { note: m ? "Single source (parts catalogue); not yet two-sourced." : undefined })],
      summary: s,
    };
  },
};
