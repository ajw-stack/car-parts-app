// Elroco VIN Decoding Code — VW Group extra makes: Skoda, SEAT / Cupra, Porsche, Lamborghini, Bentley.
// Rest-of-world (Australian) VIN layouts. Every code below has two agreeing sources; codes with only one
// source are left undecoded with a note. Source key used in the comments:
//
//  [AU]   Australian Government recall VIN lists, vehiclerecalls.gov.au/recalls/rec-NNNNNN (each list names
//         the model; about 34,000 Australian VINs read for these five makes, 2026-11-13).
//  [STC]  "Porsche VIN decoder", Stuttcars.com (local copy: Desktop\Elroco\VIN info\
//         374848441-Porsche-VIN-Decoder-Stuttcars.pdf, page 2, "Europe/RoW" section).
//  [P565] Porsche Part 565 VIN filings, NHTSA vPIC Manufacturer Information Database
//         (vpic.nhtsa.dot.gov/mid, filings ORG26720 MY2026 and ORG24415 MY2025).
//  [WBP]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Porsche/VIN Codes".
//  [L565] Lamborghini Part 565 VIN filings, vpic.nhtsa.dot.gov/mid (ORG12107/12108 MY2016, ORG12995 MY2017,
//         ORG13957 MY2017, ORG15438 MY2018, ORG16219 MY2019, ORG18440 MY2021, ORG18892 MY2021, ORG19772
//         MY2022, ORG21325 MY2023, ORG21548 MY2023, ORG21959 MY2024, ORG23871 MY2025, ORG26192 MY2026,
//         ORG24427 MY2004).
//  [WBL]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Lamborghini/VIN Codes".
//  [B565] Bentley Part 565 VIN filings, vpic.nhtsa.dot.gov/mid (ORG12698 Bentayga MY2017 — the only filing
//         that gives the rest-of-world codes; ORG13635 Continental/Flying Spur MY2017 "VIN Structure 3W";
//         ORG13153 Mulsanne MY2017 "VIN Structure 3Y"; ORG22973 Continental MY2013; ORG15297 Mulsanne
//         MY2019; ORG27044–27049 and ORG26758–26761 MY2027).
//  [WBB]  Wikibooks "Vehicle Identification Numbers (VIN codes)/Bentley/VIN Codes".
//  [BTSB] Bentley field campaign SC22/12 VIN list, static.nhtsa.gov/odi/tsbs/2023/MC-10238926-0001.pdf.
//  [SKS]  Skoda Storyboard (Skoda Auto), "What can VIN codes tell you?", skoda-storyboard.com/en/skoda-world/
//         innovation-and-technology/technology/what-can-vin-codes-tell-you/ (13 June 2023).
//  [YCS]  youcanic.com/wiki/skoda-vin-decoder (Skoda model-code table).
//  [SKB]  shop.skoda.be SmartLink+ compatibility page (model type codes FABIA (NJ), RAPID (NH), YETI (5L),
//         KAROQ (NU), KODIAQ (NS)).
//  [CZR]  Czech vehicle-register / Cebia history records with VIN and model: hlidacstatu.cz/vozidla/vin/
//         TMBJM7NE2G0199410 (Octavia), andy-auta.cz Cebia reports TMBJR7NU9L5045721 and
//         TMBJF7NUXP5091623 (Karoq).
//  [CBT]  carsbat.com VIN sale records (e.g. VSSZZZKM6RR044299 Formentor, VSSZZZKL1RR032763 Leon,
//         VSSZZZK1ZNP007993 Born, VSSZZZ5F4R6529085 Ateca, VSSZZZKP3S1036191 Terramar,
//         VSSZZZKR2RA004862 Tavascan, TMBJH7NP9P7037173 Superb).
//  [VWD]  "VW VIN Codes" (local: Desktop\Elroco\VW VIN Codes.docx) — VW Group fillers ZZZ / Z.
//  [CLS]  classic.com listings of 2012 Aventador LP700-4 with VINs ZHWEC1470CLA007.. and ZHWEC1473CLA00937.
//
// Fitment facts the rest-of-world VIN does NOT carry (the app must ask): Porsche, SEAT/Cupra — body, engine,
// gearbox, drive (positions 4–6 are ZZZ). Skoda — positions 4–6 carry body/engine/restraint but Skoda has not
// published the tables, so engine/body/gearbox/drive stay undecoded. Bentley — engine (rest-of-world engine
// letters differ from the published North-American ones), gearbox, drive. Lamborghini — gearbox.

import { seg, filler, type MakeRule, type MakeDecode, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

const NOW = new Date().getFullYear() + 1;

function yearSeg(vin: string, lo: number, hi: number, s: Partial<VinSummary>, note?: string): VinSegment {
  const y = resolveModelYear(vin[9], lo, hi);
  s.modelYear = y;
  return seg(10, 10, vin, "Model year", y ? String(y) : null, note ? { note } : {});
}

function serialSeg(from: number, vin: string, s: Partial<VinSummary>): VinSegment {
  s.serial = vin.slice(from - 1);
  return { from, to: 17, chars: vin.slice(from - 1), label: "Production sequence number", value: vin.slice(from - 1), status: "standard" };
}

// ════════════════════════════════════════════════════════════════════════════
// PORSCHE (WP0 cars, WP1 SUVs)
// Rest-of-world layout [STC] + 19,186 Australian recall VINs [AU]: 4–6 ZZZ, 7–8 first two characters of the
// Porsche type number, 9 Z, 10 model year, 11 plant, 12 third character of the type number (when the type
// has three characters), 13–17 serial. [P565] states the same split: "Positions 7, 8 (1st & 2nd digit of
// type) [eventually 12 (3rd digit of type)]". Body, engine and gearbox are NOT in a rest-of-world VIN.
// ════════════════════════════════════════════════════════════════════════════

type PType = { model: string; series: string; years: [number, number] };

// Key = VIN positions 7, 8 and 12. Type number meaning: [STC] + [WBP]; [AU] list named in brackets.
const PORSCHE_TYPE3: Record<string, PType> = {
  "911": { model: "911", series: "911 G-model (to 1989)", years: [1981, 1989] },
  "930": { model: "911 Turbo", series: "930 (911 G-model Turbo)", years: [1981, 1989] },
  "924": { model: "924", series: "924", years: [1981, 1988] },
  "928": { model: "928", series: "928", years: [1981, 1995] },
  "931": { model: "924 Turbo", series: "931", years: [1981, 1985] },
  "944": { model: "944", series: "944", years: [1982, 1991] },
  "951": { model: "944 Turbo", series: "951", years: [1985, 1991] },
  "964": { model: "911", series: "964 (1989–1994)", years: [1989, 1994] },
  "968": { model: "968", series: "968 (1992–1995)", years: [1992, 1995] },
  "993": { model: "911", series: "993 (1994–1998)", years: [1994, 1998] },
  "996": { model: "911", series: "996 (1998–2005)", years: [1998, 2005] },
  "997": { model: "911", series: "997 (2004–2012)", years: [2004, 2012] },
  "991": { model: "911", series: "991 (2011–2019)", years: [2011, 2019] },          // [AU] REC-001152, 003762
  "992": { model: "911", series: "992 (2019 on)", years: [2019, NOW] },              // [AU] REC-005837, 005936; [WBP] pos 12 "2"
  "986": { model: "Boxster", series: "986 (1996–2004)", years: [1996, 2004] },       // [AU] REC-002601
  "987": { model: "Boxster / Cayman", series: "987 (2004–2012)", years: [2004, 2012] },
  "981": { model: "Boxster / Cayman", series: "981 (2012–2016)", years: [2012, 2016] }, // [AU] REC-004963
  "982": { model: "718 Boxster / 718 Cayman", series: "982 (2016 on)", years: [2016, NOW] }, // [AU] REC-001151
  "980": { model: "Carrera GT", series: "980 (2003–2006)", years: [2003, 2006] },    // [AU] REC-005653
  "970": { model: "Panamera", series: "970 (2009–2016)", years: [2009, 2016] },      // [AU] REC-001153
  "971": { model: "Panamera", series: "971 (2016–2023)", years: [2016, 2024] },      // [AU] REC-001149, 005627
  "9PA": { model: "Cayenne", series: "9PA (955/957, 2002–2010)", years: [2002, 2010] }, // [AU] REC-001154
  "92A": { model: "Cayenne", series: "92A (958, 2010–2018)", years: [2010, 2018] },  // [AU] REC-001147
  "9YA": { model: "Cayenne", series: "9Y (E3, 2017 on) — SUV or Coupé", years: [2017, NOW] }, // [AU] REC-001148/1156/1635; [WBP]
  "95B": { model: "Macan", series: "95B (2014 on)", years: [2014, NOW] },            // [AU] REC-001157
  "Y1A": { model: "Taycan", series: "Y1 (J1, 2019 on) — sedan, Cross Turismo or Sport Turismo", years: [2019, NOW] }, // [AU] REC-006030; [P565] Y1A→J1
  // North-American layout (A-prefixed type characters, 2010 on): [WBP] + [P565].
  "A92": { model: "911", series: "992 (North-American VIN)", years: [2019, NOW] },
  "A82": { model: "718 Boxster / 718 Cayman", series: "982 (North-American VIN)", years: [2016, NOW] },
  "A5B": { model: "Macan", series: "95B (North-American VIN)", years: [2014, NOW] },
  "AYA": { model: "Cayenne", series: "9Y (North-American VIN)", years: [2017, NOW] },
};
// Two-character type codes: position 12 is already the serial. [WBP] + [P565] (+ [AU] REC-006455 for YA).
const PORSCHE_TYPE2: Record<string, PType> = {
  YA: { model: "Panamera", series: "976 (G3, 2023 on)", years: [2023, NOW] },
  XA: { model: "Macan Electric", series: "XAB (H2, 2024 on)", years: [2024, NOW] },
  X1: { model: "Cayenne Electric", series: "E4 (2026 on)", years: [2025, NOW] },
};
// [STC] + [WBP]; S/L/D also [P565]. D = Bratislava on all 9Y Cayenne VINs in [AU].
const PORSCHE_PLANT: Record<string, string> = {
  S: "Stuttgart-Zuffenhausen, Germany", L: "Leipzig, Germany", K: "Osnabrück, Germany (VW, ex-Karmann)",
  D: "Bratislava, Slovakia (VW)", U: "Uusikaupunki, Finland (Valmet)", N: "Neckarsulm, Germany (Audi)",
};

function decodePorsche(vin: string): MakeDecode {
  const s: Partial<VinSummary> = { make: "Porsche" };
  const out: VinSegment[] = [];
  const row = vin.slice(3, 6) === "ZZZ";
  if (row) out.push(filler(4, 6, vin, "ZZZ filler on rest-of-world Porsches — body, engine and restraint are not in the VIN (Stuttcars; all Australian recall VINs)."));
  else out.push(seg(4, 6, vin, "Body / engine / restraint (North-American layout)", null, { note: "North-American layout; Porsche's codes vary by model year — not decoded." }));

  const k2 = vin.slice(6, 8);
  const t3 = PORSCHE_TYPE3[k2 + vin[11]];
  const t2 = t3 ? undefined : PORSCHE_TYPE2[k2];
  const t = t3 ?? t2 ?? null;
  if (t) { s.model = t.model; s.series = t.series; }
  out.push(seg(7, 8, vin, "Porsche type number (first two characters)", t ? `${t.model} — type ${t.series}` : null,
    t ? {} : { note: "Type not yet confirmed from two sources." }));

  if (vin[8] === "Z") out.push(filler(9, 9, vin, "Z filler — no check digit on rest-of-world Porsches (Stuttcars)."));
  out.push(yearSeg(vin, t ? t.years[0] : 1981, t ? t.years[1] : NOW, s));
  const plant = PORSCHE_PLANT[vin[10]] ?? null; s.plant = plant;
  out.push(seg(11, 11, vin, "Assembly plant", plant));
  if (t3) {
    out.push(seg(12, 12, vin, "Porsche type number (third character)", `Type ${k2}${vin[11]}`));
    out.push(serialSeg(13, vin, s));
  }
  return { segments: out, summary: s };
}

export const porsche: MakeRule = {
  id: "porsche", make: "Porsche", wmis: ["WP0", "WP1"],
  checkDigit: "mixed", modelYear: "yes", years: [1981, NOW],
  decode: decodePorsche,
};

// ════════════════════════════════════════════════════════════════════════════
// LAMBORGHINI (ZHW cars, ZPB Urus)
// 2011-on layout [L565] + [WBL], confirmed on 568 Australian recall VINs [AU]: 4 market (E = Europe /
// rest of world on every Australian car), 5 body/restraint (per line), 6 engine (per line), 7–8 line,
// 9 check digit (valid on every Australian VIN), 10 model year, 11 plant, 12 fixed "A", 13–17 serial.
// ════════════════════════════════════════════════════════════════════════════

type LEng = { engine: string; litres: string; cyl: string; fuel: string; drive?: string };
const V12_L539: LEng = { engine: "6.5L V12 (L539)", litres: "6.5", cyl: "12", fuel: "Petrol" };
const V12_L541: LEng = { engine: "6.5L V12 (L541)", litres: "6.5", cyl: "12", fuel: "Petrol" };

const LAMBO_LINE: Record<string, { model: string; body: Record<string, string>; engine: Record<string, LEng> }> = {
  ZD: {
    model: "Aventador",
    // [L565] MY2016–2022 + [WBL]; D (50º Anniversario) = [WBL] + [AU] REC-000822.
    body: {
      C: "LP 700-4 Coupé", R: "LP 700-4 Roadster", D: "LP 720-4 50° Anniversario Coupé", F: "SV LP 750-4 Coupé",
      T: "SV LP 750-4 Roadster", G: "S LP 740-4 Coupé", V: "S LP 740-4 Roadster", Y: "Centenario Coupé",
      Z: "Centenario Roadster", M: "SVJ LP 770-4 Coupé", N: "SVJ LP 770-4 Roadster", J: "Sián FKP 37 Coupé",
      K: "Sián Roadster", P: "LP 780-4 Ultimae Coupé", U: "LP 780-4 Ultimae Roadster",
    },
    engine: {
      "1": { ...V12_L539, engine: "6.5L V12 (L539), 515 kW" },
      "2": { ...V12_L539, engine: "6.5L V12 (L539), 530 kW (50° Anniversario)" },
      "3": { ...V12_L539, engine: "6.5L V12 (L539), 552 kW (SV)" },
      "4": { ...V12_L539, engine: "6.5L V12 (L539) (S)" },
      "6": { ...V12_L541, engine: "6.5L V12 (L541) (SVJ)" },
      "7": { ...V12_L541, engine: "6.5L V12 (L541) + 48 V electric motor (Sián)", fuel: "Petrol hybrid" },
      "8": { ...V12_L541, engine: "6.5L V12 (L541) (Ultimae)" },
      "9": { ...V12_L541, engine: "6.5L V12 (L541) + 48 V electric motor (Countach LPI 800-4)", fuel: "Petrol hybrid" },
    },
  },
  ZF: {
    model: "Huracán",
    body: { C: "Coupé (LP 610-4 or LP 580-2)", R: "Spyder (LP 610-4 or LP 580-2)", D: "Performante Coupé", S: "Performante Spyder",
      F: "EVO Coupé (AWD or RWD)", T: "EVO Spyder (AWD or RWD)", B: "Tecnica", G: "Sterrato" },
    // [L565] gives kW and driven wheels; [WBL] agrees. Engine letters change by year (CSJ to MY2017, DKB
    // MY2018–19, DGF Performante/EVO on), so only the 5.2 V10 and output are given.
    engine: {
      "1": { engine: "5.2L V10, 449 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "AWD" },
      "2": { engine: "5.2L V10, 426 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "RWD" },
      "4": { engine: "5.2L V10 (DGF), 470 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "AWD" },
      "5": { engine: "5.2L V10 (DGF), 449 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "RWD" },
      "6": { engine: "5.2L V10 (DGF), 470 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "RWD" },
      "7": { engine: "5.2L V10 (DGF), 449 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "AWD" },
    },
  },
  ZX: {
    model: "Huracán STO", body: { A: "STO Coupé" },
    engine: { "6": { engine: "5.2L V10 (DGF), 470 kW", litres: "5.2", cyl: "10", fuel: "Petrol", drive: "RWD" } },
  },
  ZL: {
    model: "Urus", body: { A: "Urus", B: "Urus S", C: "Urus Performante", D: "Urus SE" },
    // 1 and 3 match [AU]; the North-American SE code (6) differs from the Australian SE VINs (5), so the
    // SE engine is not decoded.
    engine: {
      "1": { engine: "4.0L twin-turbo V8 (DHU)", litres: "4.0", cyl: "8", fuel: "Petrol" },
      "3": { engine: "4.0L twin-turbo V8 (DWN)", litres: "4.0", cyl: "8", fuel: "Petrol" },
    },
  },
  ZM: {
    model: "Revuelto", body: { C: "Coupé" },
    engine: { "1": { engine: "6.5L V12 (L545) plug-in hybrid", litres: "6.5", cyl: "12", fuel: "Petrol PHEV" } },
  },
  ZC: {
    model: "Temerario", body: { C: "Coupé" },
    engine: { "1": { engine: "4.0L twin-turbo V8 (DZS) plug-in hybrid", litres: "4.0", cyl: "8", fuel: "Petrol PHEV" } },
  },
};
// Early (2011–2012) rest-of-world Aventadors carry "47" in 7–8 [AU REC-000822 + CLS]; body/engine as ZD.
LAMBO_LINE["47"] = { ...LAMBO_LINE.ZD, model: "Aventador" };

const LAMBO_MARKET: Record<string, string> = { E: "Europe / rest of world", U: "USA", C: "Canada" }; // [L565] + [WBL]

function decodeLamborghini(vin: string): MakeDecode {
  const s: Partial<VinSummary> = { make: "Lamborghini" };
  const out: VinSegment[] = [];
  const line = LAMBO_LINE[vin.slice(6, 8)];
  if (line) {
    s.model = line.model;
    out.push(seg(4, 4, vin, "Market", LAMBO_MARKET[vin[3]] ?? null));
    const body = line.body[vin[4]] ?? null;
    if (body) { s.series = body; s.trim = body; }
    s.body = line.model === "Urus" ? "SUV" : body ? (/(Roadster|Spyder)/.test(body) ? "Roadster / Spyder" : "Coupé") : null;
    out.push(seg(5, 5, vin, "Body / restraint system", body, body ? {} : { note: "Not confirmed from two sources." }));
    const e = line.engine[vin[5]];
    if (e) Object.assign(s, { engine: e.engine, engineLitres: e.litres, engineCylinders: e.cyl, fuel: e.fuel, ...(e.drive ? { drive: e.drive } : {}) });
    out.push(seg(6, 6, vin, "Engine", e ? e.engine + (e.drive ? `, ${e.drive}` : "") : null, e ? {} : { note: "Not confirmed from two sources for rest-of-world cars." }));
    out.push(seg(7, 8, vin, "Make / line", line.model));
    out.push(yearSeg(vin, 2011, NOW, s));
    s.plant = vin[10] === "L" ? "Sant'Agata Bolognese, Italy" : null;   // [L565] + [WBL]
    out.push(seg(11, 11, vin, "Assembly plant", s.plant));
    out.push({ from: 12, to: 12, chars: vin[11], label: "Serial prefix", value: "Fixed serial prefix", status: "standard" });
    out.push(serialSeg(13, vin, s));
    return { segments: out, summary: s };
  }
  // 2003–2014 Murciélago / Gallardo layout: 4 model, 5 market, 6 body, 7 engine or drive, 8 gearbox.
  const OLD: Record<string, string> = { B: "Murciélago", G: "Gallardo" }; // [L565 ORG24427] + [WBL]
  const m = OLD[vin[3]];
  if (m) {
    s.model = m;
    out.push(seg(4, 4, vin, "Model", m));
    const MKT: Record<string, string> = { E: "Europe / rest of world", U: "USA", C: "Canada", A: "Arabian countries" };
    out.push(seg(5, 5, vin, "Market", MKT[vin[4]] ?? null));
    out.push(seg(6, 7, vin, "Body / restraint, engine or drive", null, { note: "Codes change by model year; not two-sourced for every year — not decoded." }));
    const y = resolveModelYear(vin[9], 2002, 2014);
    const gb = y && y <= 2009 ? ({ M: "6-speed manual", S: "e-gear (automated manual)" } as Record<string, string>)[vin[7]] ?? null : null;
    if (gb) s.transmission = gb;
    out.push(seg(8, 8, vin, "Gearbox", gb, gb ? {} : { note: "Only M and S (to model year 2009) are confirmed." }));
    out.push(yearSeg(vin, 2002, 2014, s));
    s.plant = vin[10] === "L" ? "Sant'Agata Bolognese, Italy" : null;
    out.push(seg(11, 11, vin, "Assembly plant", s.plant));
    return { segments: out, summary: s };
  }
  out.push(seg(4, 8, vin, "Vehicle descriptor", null, { note: "Line code not yet confirmed from two sources." }));
  return { segments: out, summary: s };
}

export const lamborghini: MakeRule = {
  id: "lamborghini", make: "Lamborghini", wmis: ["ZHW", "ZPB"],
  checkDigit: "mixed", modelYear: "yes", years: [2002, NOW],
  decode: decodeLamborghini,
};

// ════════════════════════════════════════════════════════════════════════════
// BENTLEY (SCB cars, SJA Bentayga)
// Layout [B565] + [WBB], confirmed on 635 Australian recall VINs [AU] (every one with a valid ISO check
// digit): 4 body, 5 engine, 6 restraint, 7–8 vehicle type, 9 check digit, 10 model year, 11 plant,
// 12 leading zero, 13–17 serial.
// ════════════════════════════════════════════════════════════════════════════

// [B565] rest-of-world / internal type designations + [AU] / [BTSB].
const BENTLEY_TYPE: Record<string, { model: string; series: string; years: [number, number] }> = {
  "4V": { model: "Bentayga", series: "4V (2016 on)", years: [2015, NOW] },                 // ORG12698 "4V RoW"; AU REC-000074/75, 003749, 005762
  "3S": { model: "Continental GT / Flying Spur", series: "3S (3rd generation, 2018 on)", years: [2018, NOW] }, // AU REC-000071/72/76, 001669, 005668; BTSB
  "3W": { model: "Continental GT / GTC / Flying Spur", series: "3W (2003–2018)", years: [2003, 2019] },      // ORG13635 "VIN Structure 3W", ORG22973 [3W]; AU REC-000073
  "3Y": { model: "Mulsanne", series: "3Y (2010–2020)", years: [2010, 2020] },              // ORG13153 "VIN Structure 3Y"; AU REC-000070
  // North-American & Gulf type identifiers [B565] (not used on Australian cars).
  ZV: { model: "Bentayga", series: "Bentayga (North-American VIN)", years: [2016, NOW] },
  ZG: { model: "Continental GT / Flying Spur", series: "3rd generation (North-American VIN)", years: [2019, NOW] },
  ZH: { model: "Mulsanne", series: "Mulsanne (North-American VIN)", years: [2010, 2020] },
};
// Body letters for the current generations only (3S/ZG, 4V/ZV, 3Y/ZH): [B565] MY2016–2027 + [AU] bodies.
const BENTLEY_BODY: Record<string, Record<string, [model: string, body: string]>> = {
  "3S": { B: ["Flying Spur", "Saloon"], C: ["Continental GT", "Coupé"], D: ["Continental GTC", "Convertible"] },
  "4V": { A: ["Bentayga", "SUV"] },
  "3Y": { B: ["Mulsanne", "Saloon"] },
};
BENTLEY_BODY.ZG = BENTLEY_BODY["3S"]; BENTLEY_BODY.ZV = { A: ["Bentayga", "SUV"], H: ["Bentayga EWB", "SUV (extended wheelbase)"] };
BENTLEY_BODY.ZH = BENTLEY_BODY["3Y"];

function decodeBentley(vin: string): MakeDecode {
  const s: Partial<VinSummary> = { make: "Bentley" };
  const out: VinSegment[] = [];
  const code = vin.slice(6, 8);
  const t = BENTLEY_TYPE[code] ?? null;
  if (t) { s.model = t.model; s.series = t.series; }
  const b = BENTLEY_BODY[code]?.[vin[3]];
  if (b) { s.model = b[0]; s.body = b[1]; }
  out.push(seg(4, 4, vin, "Body type", b ? `${b[1]} (${b[0]})` : null, b ? {} : { note: "Body letters for this generation not two-sourced." }));
  out.push(seg(5, 5, vin, "Engine type", null, { note: "Rest-of-world engine letters differ from Bentley's published North-American table — not decoded." }));
  out.push(seg(6, 6, vin, "Restraint system", null, { note: "Market-specific code — not decoded." }));
  out.push(seg(7, 8, vin, "Vehicle type", t ? `${t.model} — ${t.series}` : null, t ? {} : { note: "Type code not yet confirmed from two sources." }));
  out.push(yearSeg(vin, t ? t.years[0] : 1981, t ? t.years[1] : NOW, s));
  s.plant = vin[10] === "C" ? "Crewe, England" : null;   // [B565] + [WBB]
  out.push(seg(11, 11, vin, "Assembly plant", s.plant));
  if (t) {
    out.push({ from: 12, to: 12, chars: vin[11], label: "Leading zero", value: "Leading zero of the serial", status: "standard" });
    out.push(serialSeg(13, vin, s));
  }
  return { segments: out, summary: s };
}

export const bentley: MakeRule = {
  id: "bentley", make: "Bentley", wmis: ["SCB", "SJA"],
  // Pre-2004 Crewe cars use a different layout (Wikibooks); only the 2003-on VW-era layout is decoded here.
  checkDigit: "yes", modelYear: "yes", years: [1981, NOW],
  decode: decodeBentley,
};

// ════════════════════════════════════════════════════════════════════════════
// SKODA (TMB)
// Layout [SKS] (Skoda Auto): 4 body + steering + driven axles, 5 engine/power, 6 restraint, 7–8 model
// series, 9 security (check) code, 10 model year, 11 plant. Every one of 5,438 Australian recall VINs [AU]
// has a valid ISO check digit. Skoda has not published its position 4–6 tables, so they stay undecoded.
// ════════════════════════════════════════════════════════════════════════════

const SKODA_MODEL: Record<string, [model: string, series: string]> = {
  "1Z": ["Octavia", "Octavia II (1Z)"],   // [YCS] + [AU] REC-001198 (Octavia only)
  "3T": ["Superb", "Superb II (3T)"],     // [YCS] + [AU] REC-001200 (Superb II only)
  "5L": ["Yeti", "Yeti (5L)"],            // [YCS] + [SKB]
  NH: ["Rapid", "Rapid (NH)"],            // [YCS] + [SKB]
  NJ: ["Fabia", "Fabia III (NJ)"],        // [YCS] + [SKB] + [AU] REC-005025
  NE: ["Octavia", "Octavia III (NE)"],    // [YCS] + [CZR] TMBJM7NE2G0199410
  NS: ["Kodiaq", "Kodiaq (NS, 1st generation)"], // [SKB] + [AU] REC-003887 (Kodiaq only). [YCS] "55" not seen on any AU VIN.
  NU: ["Karoq", "Karoq (NU)"],            // [SKB] + [CZR] Cebia reports
  NP: ["Superb", "Superb III (NP)"],      // [AU] REC-003777 (Superb only) + [CBT]
  NX: ["Octavia", "Octavia IV (NX)"],     // [SKS] + [AU] REC-005899
};
// [SKS] "0 to 4 … Mladá Boleslav … 5 to 9 Kvasiny … not a strict rule" and "Y … Mladá Boleslav";
// [YCS] agrees on 0–4, 5 and 9 but gives 7–8 as Vrchlabí, so 6–8 are left undecoded.
const SKODA_PLANT: Record<string, string> = {
  "0": "Mladá Boleslav, Czech Republic", "1": "Mladá Boleslav, Czech Republic", "2": "Mladá Boleslav, Czech Republic",
  "3": "Mladá Boleslav, Czech Republic", "4": "Mladá Boleslav, Czech Republic", Y: "Mladá Boleslav, Czech Republic",
  "5": "Kvasiny, Czech Republic", "9": "Kvasiny, Czech Republic",
};

function decodeSkoda(vin: string): MakeDecode {
  const s: Partial<VinSummary> = { make: "Skoda" };
  const m = SKODA_MODEL[vin.slice(6, 8)] ?? null;
  if (m) { s.model = m[0]; s.series = m[1]; }
  const plant = SKODA_PLANT[vin[10]] ?? null; s.plant = plant;
  const segments = [
    seg(4, 4, vin, "Body / steering / driven axles", null, { note: "Skoda has not published this table — not decoded." }),
    seg(5, 5, vin, "Engine / power", null, { note: "Skoda has not published this table — not decoded." }),
    seg(6, 6, vin, "Restraint system", null, { note: "Not decoded." }),
    seg(7, 8, vin, "Model series", m ? m[1] : null, m ? {} : { note: "Model code not yet confirmed from two sources." }),
    yearSeg(vin, 1990, NOW, s),
    seg(11, 11, vin, "Assembly plant", plant, plant ? {} : { note: "Plant code not confirmed from two sources." }),
  ];
  return { segments, summary: s };
}

export const skoda: MakeRule = {
  id: "skoda", make: "Skoda", wmis: ["TMB"],
  checkDigit: "yes", modelYear: "yes", years: [1990, NOW],
  decode: decodeSkoda,
};

// ════════════════════════════════════════════════════════════════════════════
// SEAT / CUPRA (VSS)
// VW Group rest-of-world layout [VWD], confirmed on all 4,728 Australian recall VINs [AU]: 4–6 ZZZ,
// 7–8 model, 9 Z or (from about MY2024) a valid ISO check digit, 10 model year, 11 plant.
// The VIN does not say whether a Leon or Ateca is badged SEAT or Cupra.
// ════════════════════════════════════════════════════════════════════════════

const SEAT_MODEL: Record<string, [make: string, model: string]> = {
  KM: ["Cupra", "Formentor"],   // [CBT] + [AU] REC-005610 / 005900 (Leon and Formentor; KM the majority code)
  KL: ["SEAT / Cupra", "Leon (4th generation)"], // [CBT] + [AU] REC-005610
  K1: ["Cupra", "Born"],        // [CBT] + [AU] REC-006596 (Born only)
  "5F": ["SEAT / Cupra", "Ateca"], // [CBT] + [AU] REC-006608
  KP: ["Cupra", "Terramar"],    // [CBT] + [AU] REC-006614 (Terramar only)
  KR: ["Cupra", "Tavascan"],    // [CBT] + [AU] REC-006687 (Tavascan only)
};

function decodeSeat(vin: string): MakeDecode {
  const m = SEAT_MODEL[vin.slice(6, 8)] ?? null;
  const s: Partial<VinSummary> = { make: m ? m[0] : "SEAT / Cupra" };
  if (m) { s.model = m[1]; s.series = m[1]; }
  const out: VinSegment[] = [];
  if (vin.slice(3, 6) === "ZZZ") out.push(filler(4, 6, vin, "ZZZ filler on rest-of-world VW Group cars — body, engine and restraint are not in the VIN."));
  else out.push(seg(4, 6, vin, "Vehicle descriptor", null, { note: "Not the rest-of-world layout — not decoded." }));
  out.push(seg(7, 8, vin, "Model", m ? m[1] : null, m ? {} : { note: "Model code not yet confirmed from two sources." }));
  if (vin[8] === "Z") out.push(filler(9, 9, vin, "Z filler — no check digit on this VIN."));
  out.push(yearSeg(vin, 1990, NOW, s, "VW Group model year runs 1 August to 31 July."));
  out.push(seg(11, 11, vin, "Assembly plant", null, { note: "Plant codes not confirmed from two sources." }));
  return { segments: out, summary: s };
}

export const seat: MakeRule = {
  id: "seat", make: "SEAT / Cupra", wmis: ["VSS"],
  checkDigit: "mixed", modelYear: "yes", years: [1990, NOW],
  decode: decodeSeat,
};

export const VAG_EXTRA_RULES: MakeRule[] = [skoda, seat, porsche, lamborghini, bentley];
