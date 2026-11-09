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
// KL3J (Korean-built Cruze) engine letter, position 8. Two sources agree: Cruze recall VIN
// ranges (diesel R: "KL3JA69RJAK501774 to KL3JF69RJAK774710") and donor VIN + engine pairs
// (PartsClub / JCS: KL3JA695JAK759650 1.8, KL3JA35MJFK040015 1.8 F18D4, KL3JA69RJAK771962
// diesel Z20S1). Y is not confirmed on Korean-built Cruzes, so it is left undecoded.
const KL3_CRUZE_ENGINE: Record<string, { name: string; litres: string; cyl: string; fuel: string }> = {
  "5": { name: "1.8L petrol (F18D4)", litres: "1.8", cyl: "4", fuel: "Petrol" },
  M: { name: "1.8L petrol (F18D4)", litres: "1.8", cyl: "4", fuel: "Petrol" },
  R: { name: "2.0L turbo diesel (Z20S1)", litres: "2.0", cyl: "4", fuel: "Diesel" },
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
    // Captiva (D / C lines): U = 2.4 petrol LE9 (PartsClub donor VINs + Coastwide listing, 2026-11-09).
    // Captiva: 5 = 3.0 V6 LFW, 6 = 2.2 diesel (PartsClub donor VINs, second source 2026-11-09).
    const CAPTIVA_ENGINE: Record<string, { name: string; litres: string; cyl: string; fuel: string }> = {
      U: { name: "2.4L petrol (LE9)", litres: "2.4", cyl: "4", fuel: "Petrol" },
      "5": { name: "3.0L V6 petrol (LFW)", litres: "3.0", cyl: "6", fuel: "Petrol" },
      "6": { name: "2.2L turbo diesel", litres: "2.2", cyl: "4", fuel: "Diesel" },
    };
    const ce = vin[3] === "J" ? KL3_CRUZE_ENGINE[vin[7]]
      : vin[3] === "D" || vin[3] === "C" ? CAPTIVA_ENGINE[vin[7]]
      : undefined;
    if (ce) Object.assign(s, { engine: ce.name, engineLitres: ce.litres, engineCylinders: ce.cyl, fuel: ce.fuel });
    const detail = vin[3] === "J" || ((vin[3] === "D" || vin[3] === "C") && ce)
      ? [
          seg(5, 7, vin, "Series / body / restraint", null, { note: "GM Korea detail codes are not published — not decoded." }),
          seg(8, 8, vin, "Engine", ce?.name ?? null, ce ? {} : { note: "This engine letter is not yet confirmed." }),
        ]
      : [seg(5, 8, vin, "Series / body / restraint / engine", null, { note: "GM Korea rest-of-world detail codes are not published — not decoded." })];
    return {
      segments: [
        seg(4, 4, vin, "Model line", l ? `${l[0]} (${l[1]})` : null, {
          note: vin[3] === "M" || vin[3] === "T" ? "Single Australian parts-trade source; not yet two-sourced." : undefined,
        }),
        ...detail,
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
// Type codes confirmed 2026-11-09: shop.bmw.co.uk fitment pages (model + engine + type code) and
// Australian BMW recall VIN lists (REC-001588, REC-000138/140, REC-006035).
const BMW_TYPE: Record<string, [model: string, series: string]> = {
  FE42: ["X5", "E70 3.0si (N52)"],
  VC36: ["3 Series", "E90 320d (M47N2)"],
  VA76: ["3 Series", "E90 320i (N46)"],
  "3D36": ["3 Series", "F30 320d (N47)"],
  PN36: ["3 Series", "E90 LCI 320d (N47)"],
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
        seg(8, 8, vin, "Type code extension", null, {
          status: "filler",
          note: "Always 0 on Australian and European BMWs (347,831 of 347,832 Australian recall VINs); only used on US-format VINs.",
        }),
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
