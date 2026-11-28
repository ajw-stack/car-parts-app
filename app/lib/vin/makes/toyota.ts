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
  // Disputed 2026-11-28: two Pickles KZJ120R Prado listings with 1KZ engine numbers (an engine the Kluger never had)
  // carry BY29J; the earlier Kluger label had no second source.
  BY29J: ["LandCruiser Prado", "120 Series (KZJ120R) per engine numbers — an earlier listing said Kluger; check the build plate"],
  AAABJ: ["LandCruiser", "300 Series (FJA300)"],
  BFREV: ["RAV4", "ASA44"],
  // Disputed 2026-11-22: Pickles + Grays say AXVH71R hybrid, five autotrader dealer listings say ASV70R petrol.
  B23HK: ["Camry", "XV70 — hybrid (AXVH71R) or 2.5 petrol (ASV70R): sources disagree, check the build plate"],
  KU52E: ["Corolla", "ZRE152"],
  BD3FK: ["Camry", "AVV50 (hybrid, Altona-built)"],
  BZ3FH: ["Kluger", "GSU55 (US-built)"],
  FZ22G: ["HiLux", "N70 (dual cab 4x4, 3.0 D-4D)"],
  JW133: ["Echo", "NCP12 (sold in Australia as the Echo)"],   // renamed 2026-11-28: Pickles 'Echo NCP10R' listings; AU name
  // Corrected 2026-11-22: KW3D3 is the NCP130R 1.3 (2NZ-FE) — 12 Pickles engine numbers 2NZ + 31 autotrader rows.
  KW3D3: ["Yaris", "XP130 1.3 (2NZ-FE) (NCP130R)"],
  // Added 2026-11-09 (two sources each: dealer stock pages / auction listings / wrecker donor VINs
  // + ACCC recall VIN tables or recall VIN ranges, and toyotamanuals.com.au model codes).
  "5CAAV": ["RAV4", "AXAL64R (hybrid AWD)"],
  "5DABV": ["RAV4", "AXAL62R (hybrid 2WD)"],
  "5EAAV": ["RAV4", "AXAP64R (plug-in hybrid AWD)"],
  ER22E: ["Corolla", "ZZE122 (1ZZ-FE 1.8)"],
  "53REH": ["Corolla", "E170 sedan (Thai-built)"],
  "11PJA": ["LandCruiser", "100 / 105 Series"],
  BD192: ["Lexus IS", "IS300 (JCE10) sedan"],
  // Added 2026-11-22: each code seen on Pickles auction records (with engine numbers) AND autotrader.com.au
  // listings (two platforms), RAV for 2021+; evidence table in scratchpad gapsC/toyota_vds_confirmed.tsv.
  "DK3FH": ["Kluger", "XU50 (GSU55R)"],
  "LB3CH": ["Kluger", "XU70 hybrid, AWD (AXUH78R)"],
  "LD3AH": ["Kluger", "XU70 2.4 turbo (TXUA70R)"],
  "LZ3AH": ["Kluger", "XU70, 2WD (GSU70R)"],
  "LZ3BH": ["Kluger", "XU70, AWD (GSU75R)"],
  "YZ3FH": ["Kluger", "XU50 (GSU50R)"],
  "ZK3FH": ["Kluger", "XU50 (GSU50R)"],
  "ZZ3FH": ["Kluger", "XU50 (GSU50R)"],
  "BF3FK": ["Camry", "XV50 (ASV50R)"],
  "B43CE": ["Corolla", "E210 2.0 (MZEA12R)"],
  "BB3BE": ["Corolla", "E210 hybrid (ZWE211R)"],
  "BC3FE": ["Corolla", "E210 hybrid (ZWE219R)"],
  "BR23E": ["Corolla", "E120 (ZZE122R)"],
  "BT903": ["Yaris", "XP90 sedan (NCP93R)"],
  "BT923": ["Yaris", "XP90 sedan (NCP93R)"],
  "JW923": ["Yaris", "XP90 1.3 (NCP90R)"],
  "KBAA3": ["Yaris", "XP210 hybrid (MXPH10R)"],
  "KR22E": ["Corolla", "E120 (ZZE122R)"],
  "KR23E": ["Corolla", "E120 (ZZE122R)"],
  "KT3D3": ["Yaris", "XP130 1.5 (1NZ-FE) (NCP131R)"],
  "KT923": ["Yaris", "XP90 1.5 (NCP91R)"],
  "KW923": ["Yaris", "XP90 1.3 (NCP90R)"],
  "ACDBJ": ["LandCruiser Prado", "250 Series (GDJ251R)"],
  "ACEBJ": ["LandCruiser Prado", "250 Series (GDJ251R)"],
  "BU25J": ["LandCruiser Prado", "120 Series (GRJ120R)"],
  "BU29J": ["LandCruiser Prado", "120 Series (GRJ120R)"],
  "BU3FJ": ["LandCruiser Prado", "150 Series (GRJ150R)"],
  "BV71J": ["LandCruiser", "79 Series (VDJ79R)"],
  "BVL3J": ["LandCruiser", "79 Series (VDJL79R)"],
  "BZ29J": ["LandCruiser Prado", "120 Series (KDJ120R)"],
  "DS41A": ["Kluger", "XU40 (GSU40R)"],
  "ES42A": ["Kluger", "XU40 (GSU45R)"],
  "EV73J": ["LandCruiser", "76 Series wagon (VDJ76R)"],
  "HD20V": ["RAV4", "XA20 (ACA23R)"],
  "LV73J": ["LandCruiser", "79 Series (VDJ79R)"],
  "DV626": ["HiLux", "N160 (KZN165R)"],
  "HB8CP": ["HiAce", "H300 Commuter (GDH322R)"],
  "HT02P": ["HiAce", "H200 (KDH201R)"],
  "HX02P": ["HiAce", "H200 (TRH201R)"],
  "LA3CP": ["HiAce", "H300 (GDH320R)"],
  "MA3AP": ["HiAce", "H300 (GDH300R)"],
  "RA3AP": ["HiAce", "H300 (GDH300R)"],
  "RA3AW": ["HiAce", "H300 (GDH300R)"],
  "RAAAW": ["HiAce", "H300 (GDH300R)"],
  "RM3AP": ["HiAce", "H300 (GRH300R)"],
  "SA3AP": ["HiAce", "H300 (GDH300R)"],
  "ST22P": ["HiAce", "H200 (KDH223R)"],
  "SX22P": ["HiAce", "H200 (TRH223R)"],
  "AA7BJ": ["LandCruiser", "300 Series (FJA300R)"],
  "BD31V": ["RAV4", "XA30 (ACA33R)"],
  "BW3FV": ["RAV4", "XA50 hybrid AWD (AXAH54R)"],
  "DFREV": ["RAV4", "XA40 (ASA44R)"],
  "DW3FV": ["RAV4", "XA50 hybrid AWD (AXAH54R)"],
  "EW3FV": ["RAV4", "XA50 hybrid AWD (AXAH54R)"],
  "GV09J": ["LandCruiser", "200 Series (VDJ200R)"],
  "HT05J": ["LandCruiser", "200 Series (UZJ200R)"],
  "HV01J": ["LandCruiser", "200 Series (VDJ200R)"],
  "HV05J": ["LandCruiser", "200 Series (VDJ200R)"],
  "HV09J": ["LandCruiser", "200 Series (VDJ200R)"],
  "J13FV": ["RAV4", "XA50 2.5 AWD (AXAA54R)"],
  "RW3FV": ["RAV4", "XA50 hybrid AWD (AXAH54R)"],
  "W23FV": ["RAV4", "XA50 hybrid 2WD (AXAH52R)"],
  "W43FV": ["RAV4", "XA50 2.0 (MXAA52R)"],
  "Y23FV": ["RAV4", "XA50 hybrid 2WD (AXAH52R)"],
  "Y43FV": ["RAV4", "XA50 2.0 (MXAA52R)"],
  "Z23FV": ["RAV4", "XA50 hybrid 2WD (AXAH52R)"],
  "Z43FV": ["RAV4", "XA50 2.0 (MXAA52R)"],
  "ZD33V": ["RAV4", "XA30 (ACA38R)"],
  "ZDREV": ["RAV4", "XA40 (ZSA42R)"],
  "AGACK": ["Camry", "XV80 hybrid (AXVH80R)"],
  "B13HK": ["Camry", "XV70 2.5 (AXVA70R)"],
  "BA3HK": ["Camry", "XV70 hybrid (AXVH70R)"],
  "BF3HK": ["Camry", "XV70 2.5 (ASV70R)"],
  "BU52E": ["Corolla", "E150 (ZRE152R)"],
  "BU56E": ["Corolla", "E150 (ZRE152R)"],
  "BZ3HK": ["Camry", "XV70 V6 (GSV70R)"],
  "K43BE": ["Corolla", "E210 2.0 (MZEA12R)"],
  "K93BE": ["Corolla", "E210 hybrid (ZWE211R)"],
  "KE3BE": ["Corolla", "E210 hybrid (ZWE219R)"],
  "KU3JE": ["Corolla", "E180 hatch (ZRE182R)"],
  "KU56E": ["Corolla", "E150 (ZRE152R)"],
  "BA3CC": ["HiLux", "N80 (GUN126R)"],
  "BA3CD": ["HiLux", "N80 (GUN126R)"],
  "BE3CD": ["HiLux", "N80 (GUN126R)"],
  "CB3DB": ["HiLux", "N80 (GUN135R)"],
  "CB3DD": ["HiLux", "N80 (GUN135R)"],
  "CX12G": ["HiLux", "N70 (TGN16R)"],
  "CX3CB": ["HiLux", "N80 (TGN121R)"],
  "DB3CD": ["HiLux", "N80 (GUN125R)"],
  "DZ22G": ["HiLux", "N70 (KUN26R)"],
  "EB3CB": ["HiLux", "N80 (GUN122R)"],
  "EX3CB": ["HiLux", "N80 (TGN121R)"],
  "EX3CD": ["HiLux", "N80 (TGN121R)"],
  "EZ12G": ["HiLux", "N70 (KUN16R)"],
  "FZ29G": ["HiLux", "N70 (KUN26R)"],
  "HA3CD": ["HiLux", "N80 (GUN126R)"],
  "JA3DC": ["HiLux", "N80 (GUN136R)"],
  "JA3DD": ["HiLux", "N80 (GUN136R)"],
  "KA3CB": ["HiLux", "N80 (GUN126R)"],
  "KA3CC": ["HiLux", "N80 (GUN126R)"],
  "KA3CD": ["HiLux", "N80 (GUN126R)"],
  "KE3CD": ["HiLux", "N80 (GUN126R)"],
  "PEBHV": ["HiLux", "2025 generation (RAV 'HILUX AN2') (GUN227R)"],
};
// Altona-built (6T1) codes that need position 9 as well (positions 4–9).
const ALTONA_6: Record<string, [model: string, series: string]> = {
  "53BK36": ["Camry", "ACV36 (2AZ-FE 2.4)"],
  "53BK40": ["Camry", "ACV40"],
  "53XK36": ["Camry", "MCV36 (V6)"],
  "53KK40": ["Aurion", "GSV40 (2GR-FE 3.5 V6)"],
  "64AE96": ["Corolla", "AE96 liftback (7A-FE 1.8)"],
  "53FK40": ["Camry", "XV40 hybrid (AHV40R)"],
  "53XK20": ["Camry", "XV20 V6 (MCV20R)"],
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
      // HiLux N80: position 8 = cab — B single, C extra/space, D double (every N80 code on Pickles + autotrader, 2026-11-22).
      if (hit[0] === "HiLux" && hit[1].startsWith("N80")) {
        const cab = ({ B: "Single cab", C: "Extra / space cab", D: "Double cab" } as Record<string, string>)[vin[7]];
        if (cab) s.body = cab;
      }
    } else if (line && !/^(6T1|MR[012]|MHF|JT7|JTF)/.test(vin)) s.model = line;
    // The position-8 car-line fallback is not used on Altona (6T1), Thai/Indonesian (MR0–MR2, MHF) or JT7/JTF
    // commercial VINs: real listings showed it naming an Aurion "Camry", a HiLux RZN149R "Corolla" and a HiAce LH184
    // "LandCruiser" (coverage run 2026-11-28).
    s.plant = toyotaPlant(vin, s.model ?? null);
    return {
      segments: [
        seg(4, 7, vin, "Body / engine / grade", hit ? `${hit[0]} ${hit[1]}` : null, {
          note: hit ? "Positions 4–8 together match a confirmed Australian model code." : "Not decoded — no confirmed match for this model code.",
        }),
        seg(8, 8, vin, "Car line", hit ? hit[0] : /^(6T1|MR[012]|MHF|JT7|JTF)/.test(vin) ? null : line),
        seg(10, 10, vin, "Model year", null, {
          status: "filler",
          note: "Toyota and Lexus fill this with 0 on Australian-delivered cars. The build date is on the build or compliance plate.",
        }),
        // Numeric position 11 on JT VINs = a Japanese Toyota-group plant ("0-9 = TMC": Toyota 2006 VIN decoder
        // in the Elroco folder; Wikibooks Toyota plant table "0-9 (All numeric) — Japan"); one digit does not name the plant.
        seg(11, 11, vin, "Assembly plant", s.plant ?? (vin.startsWith("JT") && /[0-9]/.test(vin[10]) ? "Japan (Toyota group plant)" : null),
          s.plant || (vin.startsWith("JT") && /[0-9]/.test(vin[10])) ? {} : { note: "Not yet confirmed." }),
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

// MP2 = Mazda BT-50 (TF), built by Isuzu in Thailand on the D-MAX RG platform (added 2026-11-28): 24 Pickles listings +
// recall lists REC-005070 / 005839 / 005965 / 006056 (all MP2TF… VINs, all BT-50 TF). Position 10 does NOT track
// the build year (N on 07/2020 – 11/2022 builds), so no model year is read.
export const mazdaBt50Tf: MakeRule = {
  id: "mazda-bt50-tf", make: "Mazda", wmis: ["MP2"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const c = ISUZU_CHASSIS[vin.slice(3, 6)];
    const s: Partial<VinSummary> = { make: "Mazda", model: c ? "BT-50" : null, series: c ? "TF" : null, drive: c ? c[1] : null,
      plant: vin[10] === "T" ? "Isuzu Motors Co. (Thailand)" : null };
    const body = ISUZU_BODY[vin[8]] ?? null; s.body = body;
    return {
      segments: [
        seg(4, 6, vin, "Chassis code (model / drive)", c ? `BT-50 TF ${c[1]} (${vin.slice(3, 6)}, Isuzu D-MAX platform)` : null),
        seg(7, 8, vin, "Series / engine", null, { note: "Not yet confirmed." }),
        seg(9, 9, vin, "Body type", body),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "Not a model year on the BT-50 TF — the build date is on the build plate." }),
        seg(11, 11, vin, "Assembly plant", s.plant ?? null),
      ],
      summary: s,
    };
  },
};

export const isuzu: MakeRule = {
  id: "isuzu", make: "Isuzu", wmis: ["MPA", "MP1", "JAA", "JAL"],
  checkDigit: "no", modelYear: "yes",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Isuzu" };
    const c = ISUZU_CHASSIS[vin.slice(3, 6)];
    const y = resolveModelYear(vin[9], 1981); s.modelYear = y;
    // Before the 2008 Isuzu Ute launch, Australian TF/RA utes on JAA/MPA VINs were sold as the Holden Rodeo
    // (6 Pickles listings 2000–2007, incl. a 01/2000 JAATFR25 — before the D-MAX existed). Added 2026-11-28.
    const rodeo = c && c[0] === "D-MAX" && y !== null && y <= 2007;
    if (c) { s.model = rodeo ? "Rodeo" : c[0]; s.drive = c[1]; s.series = (rodeo ? (y >= 2003 ? "RA " : "TF ") : "") + vin.slice(3, 6) + vin.slice(6, 8); }
    if (rodeo) s.make = "Holden";
    const body = ISUZU_BODY[vin[8]] ?? null; s.body = body;
    return {
      segments: [
        seg(4, 6, vin, "Chassis code (model / drive)", c ? `${rodeo ? "Holden Rodeo (Isuzu-built)" : c[0]} ${c[1]} (${vin.slice(3, 6)})` : null),
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
