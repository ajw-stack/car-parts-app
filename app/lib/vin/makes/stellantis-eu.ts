// Elroco VIN Decoding Code — Stellantis Europe / rest-of-world VINs (docs/vin-decoder-rules.md, Part 1 evidence standard).
// Peugeot (VF3, VR3), Citroën (VF7, VR7), Fiat + Abarth (ZFA), Alfa Romeo (ZAR, ZAA), Maserati (ZAM, ZN6),
// Ferrari (ZFF), and the non-North-American Jeeps sold in Australia (MCA India-built Compass, ZAC Melfi/Tychy).
// North-American Jeep/Chrysler VINs (1C4, 1J4 ...) stay in ford-fca.ts.
//
// Evidence (researched 2026-11-12/13). Every decoded code has two agreeing sources; anything weaker is left
// null with a note. Source keys used in the comments below:
//   [WB-PEU]  Wikibooks, VIN codes/Peugeot (2009+ PSA layout, "also valid for Citroens"; position 4 model line,
//             10 production year, 11 plant table) — https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Peugeot/VIN_Codes
//   [ADACT]   Forum ADACT "Расшифровка VIN для французов" (Citroën/Peugeot VIN tables: position 4 family,
//             6–8 PSA engine type codes) — https://forum.adact.ru/topic/36121-rasshifrovka-vin-dlja-francuzov/
//   [MML]     mymotorlist.com PSA engine pages (engine family ↔ PSA short code): /engines/peugeot/ep6fdtm/,
//             /eb2dts/, /eb2dt/, /ep6fdt/, /ep6cdt/ — https://mymotorlist.com/engines/peugeot/
//   [AP24]    autoparts-24 PSA engine-code index (code ↔ family) — https://www.autoparts-24.com/engine/code/peugeot/
//   [KLOK]    Klokkerholm parts catalogue engine tables (5GY/HNY/AHX rows) — https://shop.klokkerholm.com/en/05390280
//   [ECUK]    enginecode.uk HNZ (EB2DT) — https://www.enginecode.uk/peugeot/hnz-eb2dt-specs
//   [CB]      carsbat.com European listing pages (VIN + model + engine), searched by VIN prefix — e.g.
//             https://carsbat.com/en/detail/vf3lphnpjls166111-8j2hl4/ (308 T9), .../vr3kahpy1rs079159-gxctkb/ (3008 P64),
//             .../vr3kahpy4rs095453-rufwxt/ (5008 P74), .../vr3frhnstny565609-3ttmms/ (308 SW), .../vr3fphnstpy574594-iirkx6/ (408),
//             .../vr3euhnp2pn508749-au3gjb/ (Partner K9), .../vf3vfehz7p7806914-d74uny/ (Expert K0), .../vf3ybf6f2rg063297-n8ijh3/ (Boxer),
//             .../vf3cuhnz6gy140408-eib795/ (2008 A94), .../vr7a45gfrll012233-t2i0ld/ (C5 Aircross), .../vr7bahnsbme021338-mdzqz4/ (C4 C41),
//             .../vf7sxhmz6jt558572-ypolas/ (C3), .../zfabf13h4njf91735-nhtftq/ + .../zfabf1cj6njh80812-uhtflg/ (500 family),
//             .../zarnasda5n3031418-hrmwon/ (Tonale)
//   [AU]      Australian dealer listings with VIN + RedBook variant on drive.com.au (formerly caradvice), harvested
//             2026-11-12; every fixture in scripts/vin/fixtures-stellantis-eu.json cites its listing URL.
//   [WB-FIAT] Wikibooks VIN codes/Fiat (plant table position 11, engine codes position 8, WMI list)
//   [WB-ALFA] Wikibooks VIN codes/Alfa Romeo (2015+ layout: 6 model line, 8 engine, 11 plant)
//   [WB-MAS]  Wikibooks VIN codes/Maserati (model types, engine letters, plants, 2023+ layout)
//   [WB-FER]  Wikibooks VIN codes/Ferrari (model numbers, engine letters, market D = Australia/NZ, Europe 9/10 = 0)
//   [WB-WMI]  Wikibooks World Manufacturer Identifier list (ZAA Alfa Junior, ZAC Jeep, ZN6 Maserati SUV, MCA FCA India)
//   [MITO]    Alfa Romeo MiTo owner's manuals (Elroco folder, Vehicle Resources/Alfa Romeo, 604.38.043 p.153 and
//             604.90.005 p.153): chassis marking "vehicle type (ZAR 955000); chassis serial number".
//   [WP]      Wikipedia model articles (infobox model code / assembly): Fiat 500 (2007) Type 312, Fiat 500X Type 334,
//             Fiat Ducato model code 250, Alfa Romeo Giulietta (2010) Type 940, Alfa Romeo 4C Type 960,
//             Alfa Romeo MiTo Type 955, Jeep Compass (MP) assembled at Ranjangaon, Ferrari Roma F169, Portofino F164.

import { filler, seg, type MakeRule, type MakeDecode, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

type Eng = { name: string; litres: string; cyl: string; fuel: string };
const E = (name: string, litres: string, cyl: string, fuel: string): Eng => ({ name, litres, cyl, fuel });

function applyEngine(s: Partial<VinSummary>, e: Eng | undefined) {
  if (e) Object.assign(s, { engine: e.name, engineLitres: e.litres, engineCylinders: e.cyl, fuel: e.fuel });
}

const LETTER_YEAR = /^[A-HJ-NPR-TV-Y]$/;

// ═══ PSA (Peugeot, Citroën) ═══════════════════════════════════════════════════════════════════════
// Layout from 2009/2010 [WB-PEU]: 4 model line (EU type), 5 silhouette, 6–8 PSA engine type code,
// 9 PSA internal code (letters on 2010s cars; an ISO check digit on the newest Stellantis builds — the
// engine checks it), 10 production year, 11 plant, 12–17 serial. Older VINs (pre-2009) put a plant/serial
// digit in position 10 [WB-PEU older layout], so a digit there is never read as a year.

// PSA engine type code, positions 6–8.
const PSA_ENGINE: Record<string, Eng> = {
  // [ADACT] + [AU] listings with matching capacity/fuel
  "5FV": E("1.6L turbo petrol (EP6CDT THP)", "1.6", "4", "Petrol"),          // also [MML] ep6cdt
  "5FS": E("1.6L petrol (EP6C VTi)", "1.6", "4", "Petrol"),
  "5FW": E("1.6L petrol (EP6 VTi)", "1.6", "4", "Petrol"),
  "5FX": E("1.6L turbo petrol (EP6DT THP)", "1.6", "4", "Petrol"),
  "5FY": E("1.6L turbo petrol (EP6DTS THP)", "1.6", "4", "Petrol"),
  RHH: E("2.0L turbo diesel (DW10C HDi)", "2.0", "4", "Diesel"),
  RHR: E("2.0L turbo diesel (DW10BTED4 HDi)", "2.0", "4", "Diesel"),
  "9HR": E("1.6L turbo diesel (DV6C HDi)", "1.6", "4", "Diesel"),
  "4HL": E("2.2L turbo diesel (DW12C HDi)", "2.2", "4", "Diesel"),
  RFJ: E("2.0L petrol (EW10A)", "2.0", "4", "Petrol"),
  NFU: E("1.6L petrol (TU5JP4)", "1.6", "4", "Petrol"),                      // also [AP24]
  KFW: E("1.4L petrol (TU3JP)", "1.4", "4", "Petrol"),                       // also [AP24]
  // [MML] + [KLOK]/[ECUK]/[AP24] (+ [AU] capacity match where the code appears on an AU VIN)
  "5GX": E("1.6L turbo petrol (EP6FDTM THP)", "1.6", "4", "Petrol"),
  "5GY": E("1.6L turbo petrol (EP6FDTM THP)", "1.6", "4", "Petrol"),
  "5GZ": E("1.6L turbo petrol (EP6FDT THP)", "1.6", "4", "Petrol"),
  HNY: E("1.2L turbo petrol (EB2DTS PureTech 130)", "1.2", "3", "Petrol"),
  HNZ: E("1.2L turbo petrol (EB2DT PureTech 110)", "1.2", "3", "Petrol"),
  HNS: E("1.2L turbo petrol (EB2ADTS PureTech)", "1.2", "3", "Petrol"),       // [AP24] + [AU]
  AHX: E("2.0L turbo diesel (DW10FD BlueHDi 150)", "2.0", "4", "Diesel"),     // [KLOK] + [AU]
  AHH: E("2.0L turbo diesel (DW10FC BlueHDi)", "2.0", "4", "Diesel"),         // [AP24] + [AU]
};
// Not decoded (one source only so far): 5GF, 5GG, HNW, HNL, HNJ, HNP, HPY, AHW, EHZ, DGY, DGZ, 3MF, AFZ, BHZ, YHZ.

// Plant, position 11 [WB-PEU] — each code below also matches the plant of real AU VINs [AU].
const PSA_PLANT: Record<string, string> = {
  S: "Sochaux, France", L: "Rennes, France", J: "Vigo, Spain", Y: "Mulhouse, France", W: "Poissy, France",
  E: "Madrid-Villaverde, Spain", T: "Trnava, Slovakia", N: "Mangualde, Portugal", "2": "Sevel Sud, Atessa, Italy",
};

function psaYear(vin: string): number | null {
  return LETTER_YEAR.test(vin[9]) ? resolveModelYear(vin[9], 2010, 2039) : null;
}

function peugeotModel(vin: string, year: number | null): [model: string, series: string | null] | null {
  const t = vin[3], b = vin[4];
  switch (t) {
    case "3": return ["307", "T5/T6"];                                            // [WB-PEU] + [AU]
    case "4": return ["308", "T7 (first generation)"];                            // [WB-PEU] + [AU]
    case "8": return year ? ["508", "first generation"] : ["406 / 508", null];   // [WB-PEU] "406/508" + [AU] 508
    case "M": return year && year >= 2016 ? ["3008 / 5008", "P84 (3008) or P87 (5008) — the VIN does not separate them"]
                                          : ["3008 / 5008", "generation not confirmed"];  // [WB-PEU] M=3008 + [AU] both models
    case "C": return b === "U" ? ["2008", "A94 (first generation)"] : ["208", "A9 (first generation)"]; // [WB-PEU] + [AU] + [CB]
    case "U": return b === "S" ? ["2008", "P24 (second generation)"] : null;      // [WB-PEU] + [AU] + [CB]
    case "L": return ["308", "T9 (second generation)"];                           // [AU] + [CB]
    case "F":                                                                     // [AU] + [CB]
      if (b === "R") return ["308", "P5 (third generation) SW wagon"];
      if (b === "P") return ["308 / 408", "P51 308 hatch or P54 408 — the VIN does not separate them"];
      if (b === "3") return ["508 / 408", "R8 508 fastback or P54 408 plug-in — the VIN does not separate them"];
      return ["308 / 408 / 508", "EMP2 (308 P5, 408 P54, 508 R8)"];
    case "K": return ["3008 / 5008", "P64 (3008) or P74 (5008) — the VIN does not separate them"]; // [AU] + [CB]
    case "E": return ["Partner", "K9"];                                           // [AU] + [CB]
    case "V": return ["Expert", "K0"];                                            // [AU] + [CB]
    case "Y": return ["Boxer", null];                                             // [AU] + [CB]
    case "B": return vin[10] === "Z" ? ["4008", "Mitsubishi-built (Okazaki)"] : null; // [WB-PEU] plant Z note + [AU]
    default: return null;
  }
}

function citroenModel(vin: string): [model: string, series: string | null] | null {
  const t = vin[3], newWmi = vin.startsWith("VR7");
  switch (t) {
    case "7": return ["Berlingo", "B9 (second generation)"];                      // [ADACT] + [AU]
    case "G": return ["Berlingo", "M59 (first generation)"];                      // [ADACT] + [AU]
    case "N": return newWmi ? null : ["C4 / DS4", "B7"];                          // [ADACT] + [AU]; VR7N is a different car (C5 X), not two-sourced
    case "S": return ["C3 / DS3 / C3 Picasso", "the VIN does not separate them"]; // [ADACT] + [AU] DS3 + [CB] C3
    case "A": return newWmi ? ["C5 Aircross", "C84"] : null;                      // [AU] + [CB]
    case "B": return newWmi ? ["C4", "C41 (third generation)"] : null;            // [AU] + [CB]
    default: return null;
  }
}

function psaDecode(vin: string, make: "Peugeot" | "Citroën"): MakeDecode {
  const s: Partial<VinSummary> = { make };
  const year = psaYear(vin);
  const m = make === "Peugeot" ? peugeotModel(vin, year) : citroenModel(vin);
  if (m) { s.model = m[0]; if (m[1]) s.series = m[1]; }
  const e = PSA_ENGINE[vin.slice(5, 8)];
  applyEngine(s, e);
  const plant = vin[10] === "Z"
    ? (vin[3] === "B" && make === "Peugeot" ? "Okazaki, Japan (Mitsubishi)" : "Sevel Nord, Lieu-Saint-Amand, France")
    : LETTER_YEAR.test(vin[9]) ? PSA_PLANT[vin[10]] ?? null : null;
  s.plant = plant;
  s.modelYear = year;
  const segments: VinSegment[] = [
    seg(4, 5, vin, "Model line and silhouette", m ? `${m[0]}${m[1] ? ` (${m[1]})` : ""}` : null, {
      note: m ? "Position 4 is the EU type letter; some types cover two models (shown when the VIN cannot separate them)."
              : "Model letter not two-sourced yet.",
    }),
    seg(6, 8, vin, "Engine (PSA engine type code)", e?.name ?? null, e ? {} : { note: "Engine code not two-sourced yet." }),
    seg(10, 10, vin, "Production year", year ? String(year) : null, {
      note: year ? "PSA position 10 is the production (build) year, not a model year."
                 : "A digit here is the older PSA layout (plant/serial digit), not a year.",
    }),
    seg(11, 11, vin, "Assembly plant", plant, plant ? {} : { note: "Plant code not confirmed for this layout." }),
  ];
  return { segments, summary: s };
}

export const peugeot: MakeRule = {
  id: "peugeot", make: "Peugeot", wmis: ["VF3", "VR3"],
  checkDigit: "mixed", modelYear: "mixed", years: [2010, 2039],
  decode: (vin) => psaDecode(vin, "Peugeot"),
};

export const citroen: MakeRule = {
  id: "citroen", make: "Citroën", wmis: ["VF7", "VR7"],
  checkDigit: "mixed", modelYear: "mixed", years: [2010, 2039],
  decode: (vin) => psaDecode(vin, "Citroën"),
};

// ═══ Fiat-group "type code" layout (Fiat, Abarth, older Alfa Romeo) ════════════════════════════════
// Positions 4–6 = the Fiat type code, 7–9 = 000 [MITO: "vehicle type (ZAR 955000)"], then the serial.
// On Australian VINs position 10 is also 0 and position 11 is the plant letter [AU] + [WB-FIAT plant table].
// Newer Ducato (2024+) moved to an ISO layout: 7–8 = 00, 9 check digit, 10 model year [AU, check digit verified].
const FIAT_TYPE: Record<string, [model: string, series: string, make?: string]> = {
  "312": ["500 / Abarth 595 / 695", "Type 312", "Fiat / Abarth"],   // [WP] + [AU]; Abarth shares the Fiat type code
  "334": ["500X", "Type 334"],                                       // [WP] + [AU]
  "250": ["Ducato", "X250 / X290"],                                  // [WP] model code 250 + [AU]
  "244": ["Ducato", "X244 (second generation)"],                     // [WP] Ducato 244 owner's manual link + [AU]
};
const ALFA_TYPE: Record<string, [model: string, series: string]> = {
  "940": ["Giulietta", "Type 940"],   // [WP] + [AU]
  "960": ["4C", "Type 960"],          // [WP] + [AU]
  "955": ["MiTo", "Type 955"],        // [MITO] + [WP]
};
// Plant, position 11, on the type-code layout and the new layout [WB-FIAT]/[WB-ALFA] + matching [AU] VINs.
const FCA_IT_PLANT: Record<string, string> = {
  J: "Tychy, Poland", P: "Melfi (SATA), Italy", "2": "Sevel Sud, Atessa, Italy", "7": "Cassino, Italy",
  M: "Maserati Modena plant, Italy", "3": "Pomigliano d'Arco, Italy", X: "Mirafiori, Turin, Italy", F: "Ranjangaon, India",
};

function typeLayout(vin: string, table: Record<string, [string, string, string?]>, plants: Record<string, string>, defaultMake: string): MakeDecode {
  const s: Partial<VinSummary> = { make: defaultMake };
  const t = table[vin.slice(3, 6)];
  if (t) { s.model = t[0]; s.series = t[1]; if (t[2]) s.make = t[2]; }
  const iso = vin.slice(6, 8) === "00" && vin[8] !== "0" && LETTER_YEAR.test(vin[9]);
  const segments: VinSegment[] = [
    seg(4, 6, vin, "Type code", t ? `${t[0]} (${t[1]})` : null, t ? {} : { note: "Type code not two-sourced yet." }),
  ];
  if (iso) {
    const y = resolveModelYear(vin[9], 2015, 2039); s.modelYear = y;
    segments.push(
      filler(7, 8, vin, "00 on this layout."),
      seg(10, 10, vin, "Model year", y ? String(y) : null),
      seg(11, 11, vin, "Assembly plant", null, { note: "Plant letter on the new Ducato layout not confirmed." }),
    );
  } else {
    // Only a LETTER here is a plant code: a digit can be the first digit of the serial (Ducato X244 VINs carry 7
    // although that van was built at Sevel Sud), so digits are not read as plants on this layout.
    const plant = /[A-Z]/.test(vin[10]) ? plants[vin[10]] ?? null : null; s.plant = plant;
    segments.push(
      filler(7, 10, vin, "Zeros on Fiat-group type-code VINs (owner's manual: chassis marking 'type 955000')."),
      seg(11, 11, vin, "Assembly plant", plant, plant ? {} : { note: /[0-9]/.test(vin[10]) ? "A digit here is not a reliable plant code on this layout (it can be part of the serial)." : "Plant code not confirmed." }),
    );
  }
  return { segments, summary: s };
}

// New Stellantis Italy layout (Fiat ~2021+): 4 restraint, 5 brand, 6 model line, 7 series, 8 engine,
// 9 check digit, 10 model year, 11 plant. Only what two sources agree on is decoded.
function fiatNew(vin: string): MakeDecode {
  const s: Partial<VinSummary> = { make: "Fiat / Abarth" };
  const line = vin[5] === "1" ? "500 / Abarth 595 / 695 (Type 312 family)" : null;   // [AU] Fiat 500 + Abarth, [CB] Fiat 500 + Abarth 500/595
  if (line) { s.model = "500 / Abarth 595 / 695"; s.series = "Type 312 family (2021+ VIN layout)"; }
  const e = vin[7] === "H" ? E("1.4L turbo petrol (FIRE T-Jet)", "1.4", "4", "Petrol") : undefined; // [WB-FIAT] H = 1.4 turbo FIRE + [AU]/[CB] Abarth 1.4T
  applyEngine(s, e);
  const y = resolveModelYear(vin[9], 2015, 2039); s.modelYear = y;
  const plant = FCA_IT_PLANT[vin[10]] ?? null; s.plant = plant;
  return {
    segments: [
      seg(4, 4, vin, "Restraint system", null, { note: "Rest-of-world code not published." }),
      seg(5, 5, vin, "Brand", vin[4] === "F" ? "Fiat" : null),
      seg(6, 6, vin, "Model line", line),
      seg(7, 7, vin, "Series / trim", null, { note: "Not published for rest-of-world VINs." }),
      seg(8, 8, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not two-sourced yet." }),
      seg(10, 10, vin, "Model year", y ? String(y) : null),
      seg(11, 11, vin, "Assembly plant", plant),
    ],
    summary: s,
  };
}

export const fiat: MakeRule = {
  id: "fiat", make: "Fiat", wmis: ["ZFA"],
  checkDigit: "mixed", modelYear: "mixed", years: [1990, 2039],
  decode(vin) {
    if (/^[0-9]{3}$/.test(vin.slice(3, 6))) return typeLayout(vin, FIAT_TYPE, FCA_IT_PLANT, "Fiat");
    return fiatNew(vin);
  },
};

// ═══ Alfa Romeo (ZAR, ZAA) ═══════════════════════════════════════════════════════════════════════
const ALFA_LINE: Record<string, [model: string, series: string]> = {
  E: ["Giulia", "952"],            // [WB-ALFA] E = Giulia + [AU] every Giulia 2017–2026
  H: ["Stelvio", "949"],           // [AU] + vf.vin Stelvio listings with ZARPAH (https://vf.vin/en/cars/21/alfa_romeo_stelvio)
  S: ["Tonale", "mild hybrid"],    // [AU] + [CB]
  T: ["Tonale", "plug-in hybrid Q4"], // [WB-ALFA] T = Tonale AWD + [AU] Tonale PHEV Q4
};
const ALFA_ENGINE: Record<string, Eng> = {
  N: E("2.0L turbo petrol (GME T4)", "2.0", "4", "Petrol"),                   // [WB-ALFA] + [AU]
  V: E("2.9L twin-turbo V6 petrol (690T)", "2.9", "6", "Petrol"),            // [WB-ALFA] + [AU]
  W: E("1.3L turbo petrol plug-in hybrid (GSE Firefly)", "1.3", "4", "Petrol / electric (PHEV)"), // [WB-ALFA] + [AU]
};

export const alfaRomeo: MakeRule = {
  id: "alfa-romeo", make: "Alfa Romeo", wmis: ["ZAR", "ZAA"],
  checkDigit: "mixed", modelYear: "mixed", years: [1990, 2039],
  decode(vin) {
    if (vin.startsWith("ZAA")) {
      // ZAA = Alfa Romeo Junior (Europe 2024–) [WB-WMI] + [AU] Junior listings.
      const y = resolveModelYear(vin[9], 2024, 2039);
      const plant = FCA_IT_PLANT[vin[10]] ?? null;
      return {
        segments: [
          seg(4, 8, vin, "Vehicle descriptor", null, { note: "Junior descriptor codes not published." }),
          seg(10, 10, vin, "Model year", y ? String(y) : null),
          seg(11, 11, vin, "Assembly plant", plant),
        ],
        summary: { make: "Alfa Romeo", model: "Junior", modelYear: y, plant },
      };
    }
    if (/^[0-9]{3}$/.test(vin.slice(3, 6))) {
      const d = typeLayout(vin, ALFA_TYPE, FCA_IT_PLANT, "Alfa Romeo");
      return d;
    }
    const s: Partial<VinSummary> = { make: "Alfa Romeo" };
    const l = vin[4] === "A" ? ALFA_LINE[vin[5]] : undefined;
    if (l) { s.model = l[0]; s.series = l[1]; }
    const e = ALFA_ENGINE[vin[7]]; applyEngine(s, e);
    const y = resolveModelYear(vin[9], 2015, 2039); s.modelYear = y;
    const plant = FCA_IT_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Restraint system", null, { note: "Rest-of-world code differs from the North-American one; not published." }),
        seg(5, 5, vin, "Brand", vin[4] === "A" ? "Alfa Romeo" : null),
        seg(6, 6, vin, "Model line", l ? `${l[0]} (${l[1]})` : null),
        seg(7, 7, vin, "Series / trim", null, { note: "Rest-of-world trim letters not published." }),
        seg(8, 8, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not two-sourced yet." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ═══ Maserati (ZAM cars, ZN6 SUVs) ═══════════════════════════════════════════════════════════════
// Rest-of-world layout on Australian VINs (to 2023): 4 engine, 5 restraint, 6–7 model type, 8 market,
// 9 = 0, 10 = 0 (no model year), 11 plant [WB-MAS 2002–2009 layout + engine letters; every AU VIN fits].
// 2023+ layout (GranTurismo II, Grecale from MY24): 4 restraint, 5 M, 6 body/line, 7 trim, 8 engine,
// 10 model year, 11 plant [WB-MAS].
const MAS_TYPE: Record<string, [model: string, series: string]> = {
  "39": ["Quattroporte", "M139 (fifth generation)"], "45": ["GranTurismo", "M145"], "56": ["Quattroporte", "M156 (sixth generation)"],
  "57": ["Ghibli", "M157"], "61": ["Levante", "M161"], "82": ["Grecale", "M182"], "24": ["MC20", "M240"],
}; // [WB-MAS] + [AU]
const MAS_ENGINE: Record<string, Eng> = {
  F: E("4.2L V8 petrol (M139 A, F136)", "4.2", "8", "Petrol"),
  K: E("4.7L V8 petrol (M139 S / M145, F136)", "4.7", "8", "Petrol"),
  P: E("3.8L twin-turbo V8 petrol (F154)", "3.8", "8", "Petrol"),
  R: E("3.0L twin-turbo V6 petrol (F160, 404 hp)", "3.0", "6", "Petrol"),
  X: E("3.0L twin-turbo V6 petrol (F160, 345 hp)", "3.0", "6", "Petrol"),
  Y: E("3.0L twin-turbo V6 petrol (F160, 424 hp)", "3.0", "6", "Petrol"),
  Z: E("3.8L twin-turbo V8 petrol (F154, M161 A)", "3.8", "8", "Petrol"),
  T: E("3.0L V6 turbo diesel (A630)", "3.0", "6", "Diesel"),
  A: E("2.0L turbo petrol mild hybrid (GME T4)", "2.0", "4", "Petrol / mild hybrid"),
  B: E("3.0L twin-turbo V6 petrol (Nettuno)", "3.0", "6", "Petrol"),
}; // [WB-MAS] + [AU] variant engine/power on each code
const MAS_PLANT: Record<string, string> = { "0": "Modena, Italy", "1": "Grugliasco, Italy", X: "Mirafiori, Turin, Italy", "7": "Cassino, Italy" };
// 2023+ layout tables [WB-MAS] + [AU]
const MAS_NEW_LINE: Record<string, string> = { V: "GranTurismo (coupe)", X: "GranCabrio (convertible)", D: "Grecale" };
const MAS_NEW_ENGINE: Record<string, Record<string, Eng>> = {
  D: { A: E("2.0L turbo petrol mild hybrid (GME T4)", "2.0", "4", "Petrol / mild hybrid") }, // C (Nettuno V6) and 2 (Folgore) await an AU VIN with a variant
  V: { B: E("3.0L twin-turbo V6 petrol (Nettuno)", "3.0", "6", "Petrol"), "1": E("Electric motors (Folgore)", "", "", "Electric") },
  X: { B: E("3.0L twin-turbo V6 petrol (Nettuno)", "3.0", "6", "Petrol") },
};

export const maserati: MakeRule = {
  id: "maserati", make: "Maserati", wmis: ["ZAM", "ZN6"],
  checkDigit: "mixed", modelYear: "mixed", years: [2002, 2039],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Maserati" };
    if (vin[4] === "M" && /[A-Z]/.test(vin[5])) {
      const line = MAS_NEW_LINE[vin[5]] ?? null;
      const model = line ? line.split(" ")[0] : null;
      if (model) { s.model = model; s.body = line?.includes("convertible") ? "Convertible" : line?.includes("coupe") ? "Coupe" : "SUV"; }
      const e = MAS_NEW_ENGINE[vin[5]]?.[vin[7]]; applyEngine(s, e);
      const y = resolveModelYear(vin[9], 2023, 2039); s.modelYear = y;
      const plant = MAS_PLANT[vin[10]] ?? null; s.plant = plant;
      return {
        segments: [
          seg(4, 4, vin, "Restraint system", null, { note: "Restraint letter not decoded (no fitment effect)." }),
          seg(5, 5, vin, "Brand", "Maserati"),
          seg(6, 6, vin, "Model / body", line),
          seg(7, 7, vin, "Trim level", null, { note: "Trim follows from the engine letter for fitment; not decoded separately." }),
          seg(8, 8, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not confirmed." }),
          seg(10, 10, vin, "Model year", y ? String(y) : null),
          seg(11, 11, vin, "Assembly plant", plant),
        ],
        summary: s,
      };
    }
    const t = MAS_TYPE[vin.slice(5, 7)];
    if (t) { s.model = t[0]; s.series = t[1]; }
    const e = MAS_ENGINE[vin[3]]; applyEngine(s, e);
    const plant = MAS_PLANT[vin[10]] ?? null; s.plant = plant;
    return {
      segments: [
        seg(4, 4, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not two-sourced yet." }),
        seg(5, 5, vin, "Restraint system", null, { note: "Not decoded (no fitment effect)." }),
        seg(6, 7, vin, "Model type", t ? `${t[0]} (${t[1]})` : null),
        seg(8, 8, vin, "Market specification", null, { note: "D on every Australian Maserati seen; meaning not published by Maserati for this code." }),
        seg(9, 9, vin, "Check digit", "Not used on rest-of-world Maseratis (0)", { status: "standard" }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "0 on rest-of-world Maseratis — the build date is on the compliance plate." }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ═══ Ferrari (ZFF) ════════════════════════════════════════════════════════════════════════════════
// [WB-FER]: from c.2010 positions 4–5 = model number, 6 engine, 7 safety system; before that 4 engine,
// 5 safety, 6–7 model. 8 market (D = Australia / New Zealand, right-hand drive). Europe/AU: 9 = 0, 10 = 0.
// 11 = 0 Maranello. Every AU VIN checked fits [AU].
const FER_MODEL: Record<string, string> = {
  "65": "California", "82": "GTC4Lusso / GTC4Lusso T", "89": "Portofino", "98": "Roma", "06": "Purosangue",
}; // [WB-FER] + [AU]. Other Wikibooks model numbers are single-sourced until an AU VIN confirms them. "09" (Roma Spider per Wikibooks) conflicts with an AU listing (Roma coupe) — not decoded.
const FER_ENGINE: Record<string, Eng> = {
  L: E("4.3L V8 petrol (F136 IB)", "4.3", "8", "Petrol"),
  F: E("3.9L twin-turbo V8 petrol (F154 BE)", "3.9", "8", "Petrol"),
  R: E("3.9L twin-turbo V8 petrol (F154 BH)", "3.9", "8", "Petrol"),
  Y: E("3.9L twin-turbo V8 petrol (F154 BD)", "3.9", "8", "Petrol"),
  V: E("6.5L V12 petrol (F140 IA)", "6.5", "12", "Petrol"),
}; // [WB-FER] + [AU] (only letters whose model is also on an AU VIN; the same letter means a different engine in other models, so it is keyed with the model below)
const FER_ENGINE_FOR: Record<string, string> = { "65": "L", "89": "F", "98": "R", "82": "Y", "06": "V" };

export const ferrari: MakeRule = {
  id: "ferrari", make: "Ferrari", wmis: ["ZFF"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Ferrari" };
    const newer = /^[0-9]{2}$/.test(vin.slice(3, 5));
    const code = newer ? vin.slice(3, 5) : vin.slice(5, 7);
    const engLetter = newer ? vin[5] : vin[3];
    const model = FER_MODEL[code] ?? null;
    if (model) s.model = model;
    const e = FER_ENGINE_FOR[code] === engLetter ? FER_ENGINE[engLetter] : undefined; applyEngine(s, e);
    const market = vin[7] === "D" ? "Australia / New Zealand (right-hand drive)" : null;
    const plant = vin[10] === "0" ? "Maranello, Italy" : null; s.plant = plant;
    const modelSeg = newer ? seg(4, 5, vin, "Model", model) : seg(6, 7, vin, "Model", model);
    const engSeg = newer ? seg(6, 6, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not confirmed for this model." })
                         : seg(4, 4, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not confirmed for this model." });
    const safety = newer ? seg(7, 7, vin, "Safety system", null, { note: "Not decoded (no fitment effect)." })
                         : seg(5, 5, vin, "Safety system", null, { note: "Not decoded (no fitment effect)." });
    return {
      segments: [
        modelSeg, engSeg, safety,
        seg(8, 8, vin, "Market", market),
        seg(9, 9, vin, "Check digit", vin[8] === "0" ? "Not used on European / Australian Ferraris (0)" : null, { status: "standard" }),
        seg(10, 10, vin, "Model year", null, { status: "filler", note: "0 on European / Australian Ferraris — no model year in the VIN." }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

// ═══ Jeep built outside North America (MCA India, ZAC Italy/Poland) ═══════════════════════════════
// MCA = FCA India (Fiat, Jeep) [WB-WMI]; the only Jeep built there for Australia is the Compass MP/M6,
// assembled at Ranjangaon [WP Jeep Compass] — every AU MCA VIN is a Compass [AU]. ISO layout with a real
// check digit [AU, verified]. Position 8 B = 2.4L Tigershark [WB-FIAT engine table + AU Compass 2.4].
// ZAC = Jeep Italy/Poland (Compass EU-market, Renegade [WB-WMI]; AU Avenger also uses ZAC [AU]) — the model
// letter is not two-sourced, so only year and plant are decoded.
export const jeepEurope: MakeRule = {
  id: "jeep-europe", make: "Jeep", wmis: ["MCA", "ZAC"],
  match: (vin) => vin.startsWith("ZAC") || vin[4] === "J",
  checkDigit: "yes", modelYear: "yes", years: [2014, 2039],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Jeep" };
    const india = vin.startsWith("MCA");
    if (india) { s.model = "Compass"; s.series = "MP / M6 (India-built)"; }
    const e = india && vin[7] === "B" ? E("2.4L petrol (Tigershark MultiAir)", "2.4", "4", "Petrol") : undefined;
    applyEngine(s, e);
    const y = resolveModelYear(vin[9], 2014, 2039); s.modelYear = y;
    const plant = (india ? (vin[10] === "F" ? "Ranjangaon, India" : null) : (vin[10] === "P" ? "Melfi (SATA), Italy" : vin[10] === "J" ? "Tychy, Poland" : null));
    s.plant = plant;
    return {
      segments: [
        seg(4, 7, vin, "Model line / drive / series", india ? "Compass (MP / M6)" : null, {
          note: india ? "Drive and trim letters in 6–7 are not published for India-built VINs." : "ZAC model letters not two-sourced yet (Avenger, Compass, Renegade share this WMI).",
        }),
        seg(8, 8, vin, "Engine", e?.name ?? null, e ? {} : { note: "Engine letter not two-sourced yet." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  },
};

export const STELLANTIS_EU_RULES: MakeRule[] = [peugeot, citroen, fiat, alfaRomeo, maserati, ferrari, jeepEurope];
