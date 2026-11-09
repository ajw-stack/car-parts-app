// Elroco VIN Decoding Code — Code Rules 20–22 (docs/vin-decoder-rules.md).
// Toyota, Lexus, Isuzu, and Australian-issued 6U9 VINs.
// Sources: Elroco VIN research 2026-09-29 — pickles.com.au and grays.com.au listings with VIN,
// NHTSA vPIC series/plant fields, hand-verified check digits; Toyota VIN decoder (Elroco folder,
// US layout) for the position-8 car-line letters, each also seen on Australian samples.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

// Full five-character VDS (positions 4–8) confirmed on Australian listings.
const TOYOTA_VDS: Record<string, [model: string, series: string]> = {
  BH3FJ: ["LandCruiser Prado", "150 Series"],
  BR3FJ: ["LandCruiser", "70 Series"],
  LV71J: ["LandCruiser", "79 Series single cab"],
  BU11F: ["FJ Cruiser", "GSJ15"],
  BY29J: ["Kluger", "XU20"],
  AAABJ: ["LandCruiser", "300 Series (FJA300)"],
  BFREV: ["RAV4", "ASA44"],
  B23HK: ["Camry", "AXVH71 (hybrid)"],
  KU52E: ["Corolla", "ZRE152"],
  BD3FK: ["Camry", "AVV50 (hybrid, Altona-built)"],
  BZ3FH: ["Kluger", "GSU55 (US-built)"],
  FZ22G: ["HiLux", "N70 (dual cab 4x4, 3.0 D-4D)"],
  JW133: ["Yaris", "NCP12"],
  KW3D3: ["Yaris", "NCP131"],
  // Added 2026-11-09 (two sources each: dealer stock pages / auction listings / wrecker donor VINs
  // + ACCC recall VIN tables or recall VIN ranges, and toyotamanuals.com.au model codes).
  "5CAAV": ["RAV4", "AXAL64R (hybrid AWD)"],
  "5DABV": ["RAV4", "AXAL62R (hybrid 2WD)"],
  "5EAAV": ["RAV4", "AXAP64R (plug-in hybrid AWD)"],
  ER22E: ["Corolla", "ZZE122 (1ZZ-FE 1.8)"],
  "53REH": ["Corolla", "E170 sedan (Thai-built)"],
  "11PJA": ["LandCruiser", "100 / 105 Series"],
  BD192: ["Lexus IS", "IS300 (JCE10) sedan"],
};
// Altona-built (6T1) codes that need position 9 as well (positions 4–9).
const ALTONA_6: Record<string, [model: string, series: string]> = {
  "53BK36": ["Camry", "ACV36 (2AZ-FE 2.4)"],
  "53BK40": ["Camry", "ACV40"],
  "53XK36": ["Camry", "MCV36 (V6)"],
  "53KK40": ["Aurion", "GSV40 (2GR-FE 3.5 V6)"],
  "64AE96": ["Corolla", "AE96 liftback (7A-FE 1.8)"],
};
// Position 8 car line (Toyota global convention). Only letters also seen on Australian VINs.
const TOYOTA_LINE: Record<string, string> = {
  E: "Corolla", K: "Camry", J: "LandCruiser / Prado", V: "RAV4", G: "HiLux",
};
const LEXUS_VDS: Record<string, [model: string, series: string]> = {
  BE262: ["IS", "IS350 (GSE21)"],
};

// Toyota / Lexus plant letters at position 11 (Japanese-built VINs with position 10 = 0, and US 5TD).
// Sources (2026-11-09): Wikibooks VIN Codes pages + NHTSA vPIC decodes of Australian VINs + ~260 Australian recall VIN lists (vehiclerecalls.gov.au) showing the letter constant per model/plant.
// Older all-numeric position-11 values are the lead digit of a per-plant serial block and are not
// decoded, except 4 = Yoshiwara on the LandCruiser.
const TOYOTA_PLANT: Record<string, string> = {
  S: "Princeton, Indiana, USA", D: "Nagakusa, Japan", J: "Takaoka, Japan", K: "Hamura (Hino), Japan", A: "Motomachi, Japan",
};
function toyotaPlant(vin: string, model: string | null): string | null {
  if (vin.startsWith("6T1")) return "Altona, Victoria";
  if (vin.startsWith("5TD")) return vin[10] === "S" ? TOYOTA_PLANT.S : null;
  if (!vin.startsWith("JT")) return null;
  if (TOYOTA_PLANT[vin[10]] && vin[10] !== "S") return TOYOTA_PLANT[vin[10]];
  if (vin[10] === "4" && model === "LandCruiser") return "Yoshiwara (Toyota Auto Body), Japan";
  return null;
}

function toyotaFamily(make: string, table: Record<string, [string, string]>, lineTable: Record<string, string>) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const vds = vin.slice(3, 8);
    let hit = (vin.startsWith("6T1") ? ALTONA_6[vin.slice(3, 9)] : undefined) ?? table[vds];
    if (!hit && vin.startsWith("MR0") && vds.startsWith("FZ")) hit = ["HiLux", "N70"];
    const line = lineTable[vin[7]] ?? null;
    if (hit) {
      // A few Lexus models were issued Toyota WMIs (e.g. IS300 JCE10 under JTD).
      if (hit[0].startsWith("Lexus ")) { s.make = "Lexus"; s.model = hit[0].slice(6); } else s.model = hit[0];
      s.series = hit[1];
    } else if (line) s.model = line;
    s.plant = toyotaPlant(vin, s.model ?? null);
    return {
      segments: [
        seg(4, 7, vin, "Body / engine / grade", hit ? `${hit[0]} ${hit[1]}` : null, {
          note: hit ? "Positions 4–8 together match a confirmed Australian model code." : "Not decoded — no confirmed match for this model code.",
        }),
        seg(8, 8, vin, "Car line", line ?? (hit ? hit[0] : null)),
        seg(10, 10, vin, "Model year", null, {
          status: "filler",
          note: "Toyota and Lexus fill this with 0 on Australian-delivered cars. The build date is on the build or compliance plate.",
        }),
        seg(11, 11, vin, "Assembly plant", s.plant ?? null, s.plant ? {} : { note: "Not decoded: on older Japanese-built Toyotas this is the start of a per-plant serial block." }),
      ],
      summary: s,
    };
  };
}

export const toyota: MakeRule = {
  id: "toyota", make: "Toyota",
  wmis: ["JTE", "JTD", "JTM", "JTN", "JTK", "JTF", "MR0", "MR1", "MR2", "MHF", "6T1", "5TD", "4T1", "JT1", "JT2", "JT3", "JT7"],
  checkDigit: "yes", modelYear: "no",
  decode: toyotaFamily("Toyota", TOYOTA_VDS, TOYOTA_LINE),
};

export const lexus: MakeRule = {
  id: "lexus", make: "Lexus", wmis: ["JTH", "JTJ", "JT6", "2T2"],
  checkDigit: "yes", modelYear: "no",
  decode: toyotaFamily("Lexus", LEXUS_VDS, {}),
};

// ── Isuzu (MPA, Thailand): positions 4–6 are Isuzu's chassis code, position 9 a body letter,
// position 10 a real model year. Confirmed on three Grays listings (2015 and 2019 builds).
const ISUZU_CHASSIS: Record<string, [model: string, drive: string]> = {
  TFR: ["D-MAX", "4x2"], TFS: ["D-MAX", "4x4"], UCR: ["MU-X", "4x2"], UCS: ["MU-X", "4x4"],
};
const ISUZU_BODY: Record<string, string> = { J: "Utility / cab chassis", G: "Wagon" };

export const isuzu: MakeRule = {
  id: "isuzu", make: "Isuzu", wmis: ["MPA", "MP1", "JAA", "JAL"],
  checkDigit: "no", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Isuzu" };
    const c = ISUZU_CHASSIS[vin.slice(3, 6)];
    if (c) { s.model = c[0]; s.drive = c[1]; s.series = vin.slice(3, 6) + vin.slice(6, 8); }
    const body = ISUZU_BODY[vin[8]] ?? null; s.body = body;
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    return {
      segments: [
        seg(4, 6, vin, "Chassis code (model / drive)", c ? `${c[0]} ${c[1]} (${vin.slice(3, 6)})` : null),
        seg(7, 8, vin, "Series / engine", vin.slice(6, 8) === "85" ? "RG series (85)" : null),
        seg(9, 9, vin, "Body type", body, { note: "Isuzu uses position 9 for the body, not a check digit." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        // T = Isuzu Motors Co. (Thailand): Isuzu D-MAX parts catalogue p. P-5 ("PLANT T : IMCT (THAILAND)")
        // + every MPA VIN in Australian recall lists.
        seg(11, 11, vin, "Assembly plant", vin[10] === "T" ? "Isuzu Motors Co. (Thailand)" : null, vin[10] === "T" ? {} : { note: "Not yet confirmed." }),
      ],
      summary: { ...s, plant: vin[10] === "T" ? "Isuzu Motors Co. (Thailand)" : null },
    };
  },
};

// ── 6U9: VIN issued in Australia to a privately imported vehicle. Positions 4–5 are "00" and
// positions 6–17 carry the car's Japanese frame number (chassis code + serial), e.g.
// 6U9 00 ACR30 7016500 = frame ACR30-7016500.
const JDM_CHASSIS: Record<string, [make: string, model: string]> = {
  ACR30: ["Toyota", "Estima / Tarago (ACR30)"],
  AHR20: ["Toyota", "Estima Hybrid (AHR20)"],
};

export const privateImport: MakeRule = {
  id: "au-private-import", make: "Private import", wmis: ["6U9"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = {};
    // Known chassis codes first; otherwise the common JDM shape "letters + two digits".
    const rest = vin.slice(5);
    const known = Object.keys(JDM_CHASSIS).find((k) => rest.startsWith(k));
    const m = known ? [rest, known, rest.slice(known.length)] : rest.match(/^([A-Z]{2,4}\d{2})(\d+)$/);
    const code = m?.[1] ?? null;
    const hit = code ? JDM_CHASSIS[code] : undefined;
    if (hit) { s.make = hit[0]; s.model = hit[1].replace(/\s*\(.*\)$/, ""); s.series = code; }
    else s.make = null;
    return {
      segments: [
        seg(4, 5, vin, "Padding", vin.slice(3, 5) === "00" ? "00 — padding before the Japanese frame number" : null, { status: "filler" }),
        seg(6, 17, vin, "Original Japanese frame number", code ? `${code}-${m![2]}${hit ? ` — ${hit[0]} ${hit[1]}` : ""}` : null, {
          note: "Australian-issued VIN for a privately imported vehicle: the rest is the car's original frame number.",
        }),
      ],
      summary: s,
    };
  },
};
