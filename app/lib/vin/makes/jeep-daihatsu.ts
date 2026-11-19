// Elroco VIN Decoding Code — Melfi-built Jeep Renegade (WMI 1C4, rest-of-world layout) and Daihatsu (WMI JDA).
// docs/vin-decoder-rules.md, Part 1 evidence standard: every decoded code has two agreeing sources; anything
// weaker is left null with a note. Researched 2026-11-19.
//
// Source keys used below:
//  [VPIC]   NHTSA vPIC decode of 1C4BU0000FPC32852 — https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1C4BU0000FPC32852?format=json
//           (ModelYear 2015, PlantCity MELFI, PlantCountry ITALY; error 1 "check digit does not calculate", error 14
//           "unable to provide information for some of the characters" — i.e. FCA's US filing does not describe 4–8).
//  [WB-FIAT] Wikibooks "Vehicle Identification Numbers (VIN codes)/Fiat/VIN Codes", plant table position 11:
//           "P — Fiat Melfi (SATA) plant, Melfi, Italy".
//  [WP-REN] Wikipedia "Jeep Renegade (BU)" — model code BU, assembly Melfi, Italy.
//  [CX]     CarExpert Renegade spec page: "released to the Australian market on 4th October 2015 classified as a BU",
//           country of origin Italy — https://carexpert.com.au/jeep/renegade/2015-limited-a6c81ac8
//  [AU-REN] Australian listings with VIN (three platforms): drive.com.au (5 listings, RedBook variant "BU … [MY15/16/17]"),
//           Pickles stock 61884290 (1C4BU0000HPF91857, "BU MY17 Limited", build date 06/2017), Carbids lot 1551593
//           (1C4BU0000GPD49374, "Trailhawk (AWD) BU MY17 … 2.4L … 9 Sp Automatic"). Every fixture is in
//           scripts/vin/fixtures-jeep-daihatsu.json with its URL.
//  [DH-REC] Australian Government recall REC-004565 (Daihatsu Sirion, 14 Oct 1999, 4,044 units; headlight/horn coupler
//           terminals) — https://www.vehiclerecalls.gov.au/recalls/rec-004565 — and the same recall as reported by
//           australiancar.reviews with its VIN range "JDA M100 S000 500079 to JDA M100 S000 525616", built April 1998 to
//           March 1999 — https://www.australiancar.reviews/recalls-faults-daihatsu-m100-sirion-1998-05/
//  [DH-REC2] Australian Government recall REC-002745 (Daihatsu Delta Tipper, 2005): "VIN number ranges: VDX: 00V138
//           VIS: 00050006-00050320" — https://vehiclerecalls.gov.au/recalls/rec-002745
//  [CS]     carsensor.net (Recruit) Japanese catalogue spec pages, one per grade, giving 型式 (frame/model code), engine
//           型式, displacement, cylinders and 駆動方式 (drive). URLs per code in the DAIHATSU_CODE table below.
//  [WP-JA]  Japanese Wikipedia model articles (e.g. ダイハツ・ストーリア 車両型式: "M100S – 1,000cc FF車", "M101S – 1,300cc FF車").
//  [WP-EN]  English Wikipedia model articles (Daihatsu Terios, Sirion, Charade, Applause, Pyzar, YRV, Copen, Boon).
//  [AU-DH]  Australian listings with VIN: shopforcars.com.au 2003 Sirion M100RS (JDAM100S000551053, 989 cc, 3 cyl, manual).
//
// Fitment facts the VIN does NOT carry (the app must ask):
//  Renegade — engine (1.4 MultiAir turbo vs 2.4 Tigershark), drive (FWD vs 4x4), gearbox (6-speed manual, 6-speed DDCT,
//             9-speed auto) and trim: positions 6–8 are 000 on every Australian Renegade, the 1.4 FWD Sport and the 2.4 AWD
//             Trailhawk alike [AU-REN]. Model year / series (MY15–MY21) only through position 10.
//  Daihatsu — trim/grade, gearbox (manual or auto share one chassis code [CS]), body (3-door vs 5-door hatch, sedan, on
//             Charade/Applause) and build date: positions 9–17 are a running serial with no year, plant or check digit.
//             Engine and drive follow from the chassis code only where the table below says so.

import { filler, seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

// ═══ Jeep Renegade BU, built at Melfi (SATA), Italy — rest-of-world layout on WMI 1C4 ══════════════════════════
// 1–3 1C4 · 4–5 BU = Renegade [WP-REN] + [CX] + every [AU-REN] VIN · 6–8 000 (no engine/drive/gearbox; see above) ·
// 9 0 on 2015–2017 builds (not a check digit: none of the [AU-REN] VINs calculates) or a real ISO check digit on later
// builds (a 2021 European VIN 1C4BU000XLP007840 carries a valid X) · 10 year code [VPIC] + [AU-REN] (Pickles: H, build
// 06/2017; drive.com.au: F = MY15, G = MY16) · 11 P = Melfi [VPIC] + [WB-FIAT] + [WP-REN] · 12–17 serial.
// North-American 1C4 Jeeps never have 000 at 6–8 (position 7 is a series letter and 8 the engine letter there), so
// this match leaves them to fcaNorthAmerica.
const RENEGADE_RE = /^1C4BU000[0-9X][A-HJ-NPR-TV-Y1-9]P/;

export const jeepMelfi: MakeRule = {
  id: "jeep-melfi", make: "Jeep", wmis: ["1C4"],
  match: (vin) => RENEGADE_RE.test(vin),
  checkDigit: "mixed", modelYear: "yes", years: [2014, 2039],
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Jeep", model: "Renegade", series: "BU", body: "5-door SUV (hatch)", plant: "Melfi (SATA), Italy" };
    const y = resolveModelYear(vin[9], 2014, 2039); s.modelYear = y;
    const segments: VinSegment[] = [
      seg(4, 5, vin, "Vehicle line", "Jeep Renegade (BU)"),
      seg(6, 8, vin, "Engine / drive / gearbox", null, {
        note: "000 on every Australian Renegade (1.4 turbo FWD and 2.4 AWD Trailhawk alike), so the VIN does not say which engine, drive or gearbox the car has — check the build plate or ask.",
      }),
    ];
    if (vin[8] === "0") {
      segments.push({ from: 9, to: 9, chars: "0", label: "Check digit", value: "Not used (0) on this Melfi-built VIN", note: "2015–2017 Renegades for Australia carry 0 here; later builds use a real check digit.", status: "standard" });
    }
    segments.push(
      seg(10, 10, vin, "Model year", y ? String(y) : null, { status: y ? "standard" : "not-decoded", note: "ISO year code. On Australian Renegades it matches the build year (a build-plate 06/2017 car carries H), not always the MY badge." }),
      seg(11, 11, vin, "Assembly plant", "Melfi (SATA), Italy"),
    );
    return { segments, summary: s };
  },
};

// ═══ Daihatsu, WMI JDA (export / Australian layout, 1989–2006) ═══════════════════════════════════════════════
// 1–3 JDA · 4–8 the Daihatsu chassis (frame) model code, exactly as Daihatsu writes it (M100S, J102G, L880K …) ·
// 9–17 a running serial padded with zeros. No check digit (none of the Australian VINs calculates), no model year and
// no plant code: the Australian Sirion recall range JDAM100S000500079–JDAM100S000525616 [DH-REC] spans builds from
// April 1998 to March 1999 with positions 9–11 staying 000, so those positions are not a year. The chassis code matches
// the Australian series name on Australian listings (Sirion "M100RS", Terios J102) [AU-DH] and the Japanese 型式 on
// [CS] / [WP-JA] / [WP-EN].
// Light trucks (Delta) put two zeros first and a 4-character code after them: "VDX 00V138" [DH-REC2] — single source,
// so the Delta code itself is not decoded.
//
// Each code below: [CS] spec page (path given) + a Wikipedia article, plus [AUR] australiancar.reviews (Australian spec)
// where the model was sold here. [AUR] pages (https://www.australiancar.reviews/…): review-daihatsu-terios-1997-05,
// review-daihatsu-m100-sirion-1998-05, review-daihatsu-m300-sirion-2005, review-daihatsu-m201-yrv-2001-04,
// review-daihatsu-g300-pyzar-1997-00, review-daihatsu-l880-copen-2003-06.
// Where Japan used two engines on one chassis code (a turbo and a non-turbo), both are named — the VIN cannot tell them apart.
// au = false only where a source says the Australian cars (or all export cars) used a different code.
interface DhCode { model: string; series: string; engine: string; litres: string; cyl: string; drive: string; au: boolean }
const DH = (model: string, series: string, engine: string, litres: string, cyl: string, drive: string, au = true): DhCode => ({ model, series, engine, litres, cyl, drive, au });
const DAIHATSU_CODE: Record<string, DhCode> = {
  // Terios J1 — [CS] terios/F001/M001G001 (J100G HC-EJ 1295 cc 4WD), M003G001 (J102G K3-VE 4WD), M003G007 (J102G K3-VET),
  // M003G004 (J122G K3-VE rear-drive "FR"); [WP-EN] Daihatsu Terios (J100G HC-EJ 4WD 1997–99, J102G K3-VE / K3-VET 4WD,
  // J122G 2WD); [AUR] J100 1.3 HC-EJ 4WD (Jul 1997–2000), J102 1.3 K3-VE (Oct 2000–2005).
  J100G: DH("Terios", "J100", "1.3L 4-cyl SOHC petrol (HC-EJ)", "1.3", "4", "4WD"),
  J102G: DH("Terios", "J102", "1.3L 4-cyl DOHC petrol (K3-VE; the Japanese-market K3-VET turbo shares this code)", "1.3", "4", "4WD"),
  J122G: DH("Terios", "J122 (2WD)", "1.3L 4-cyl DOHC petrol (K3-VE or K3-VET turbo)", "1.3", "4", "2WD (rear-wheel drive)"),
  // Sirion / Storia M100 — [CS] storia/F001/M005G005 (M100S EJ-VE 989 cc 3-cyl FF), M005G003 (M101S K3-VE FF),
  // M005G013 (M110S EJ-VE 4WD), M005G011 (M111S K3-VE 4WD), M005G017 (M112S 713 cc 4WD); [WP-JA] ダイハツ・ストーリア 車両型式
  // (M100S 1,000cc FF; M101S 1,300cc FF; M110S 1,000cc 4WD; M111S 1,300cc 4WD; M112S X4 713cc JC-DET);
  // [AUR] Sirion 1.0 EJ-VE FWD, GTvi 1.3 K3-VE FWD. Early Japanese M100S used EJ-DE (to May 2000) [WP-JA].
  M100S: DH("Sirion", "M100", "1.0L 3-cyl DOHC petrol (EJ-VE; early Japanese Storia EJ-DE)", "1.0", "3", "FWD"),
  M101S: DH("Sirion", "M101 (1.3; Sirion GTvi in Australia)", "1.3L 4-cyl DOHC petrol (K3-VE)", "1.3", "4", "FWD"),
  M110S: DH("Sirion / Storia", "M110 (4WD)", "1.0L 3-cyl DOHC petrol (EJ series)", "1.0", "3", "4WD", false),
  M111S: DH("Sirion / Storia", "M111 (4WD)", "1.3L 4-cyl DOHC petrol (K3-VE)", "1.3", "4", "4WD", false),
  M112S: DH("Storia", "M112 (X4)", "0.7L 4-cyl turbo petrol (JC-DET)", "0.7", "4", "4WD", false),
  // Sirion / Boon M300 — [CS] boon/F001/M001G001 (M300S 1KR-FE 996 cc FF), M001G003 (M301S K3-VE 1297 cc FF), M001G005
  // (M310S 1KR-FE 4WD), M002G013 (M312S KJ-VET 936 cc 4WD); [WP-EN] Daihatsu Boon (1KR-FE 996 cc, K3-VE 1298 cc, KJ-VET
  // 936 cc X4 4WD); [AUR] Australian M300 Sirion (Mar 2005) 1.3 K3-VE FWD only.
  M300S: DH("Sirion / Boon", "M300 (1.0)", "1.0L 3-cyl DOHC petrol (1KR-FE)", "1.0", "3", "FWD", false),
  M301S: DH("Sirion", "M300 series (M301, 1.3)", "1.3L 4-cyl DOHC petrol (K3-VE)", "1.3", "4", "FWD"),
  M310S: DH("Sirion / Boon", "M310 (1.0 4WD)", "1.0L 3-cyl DOHC petrol (1KR-FE)", "1.0", "3", "4WD", false),
  M312S: DH("Boon", "M312 (X4)", "0.9L 4-cyl turbo petrol (KJ-VET)", "0.9", "4", "4WD", false),
  // YRV — [CS] yrv/F001/M001G009 (M200G EJ-VE 989 cc FF), M001G003 / G001 (M201G K3-VE and K3-VET FF), M001G012 / G011
  // (M211G K3-VE / K3-VET 4WD); [WP-EN] Daihatsu YRV (EJ-VE 989 cc, K3-VE, K3-VET turbo; 4WD option); [AUR] Australian
  // M201 YRV 1.3 K3-VE FWD.
  M200G: DH("YRV", "M200 (1.0)", "1.0L 3-cyl DOHC petrol (EJ-VE)", "1.0", "3", "FWD", false),
  M201G: DH("YRV", "M201", "1.3L 4-cyl DOHC petrol (K3-VE; the K3-VET turbo shares this code)", "1.3", "4", "FWD"),
  M211G: DH("YRV", "M211 (4WD)", "1.3L 4-cyl DOHC petrol (K3-VE or K3-VET turbo)", "1.3", "4", "4WD", false),
  // Pyzar G300 — [CS] pyzar/F001/M001G001 (G303G HE-EG 1498 cc FF), M001G005 (G313G HE-EG 4WD), M002G005 (G301G HD-EP
  // 1589 cc FF), M002G007 (G311G HD-EP 4WD); [WP-EN] Daihatsu Pyzar (G303/G313 HE-EG 1.5, G301/G311 HD-EP 1.6, 4WD Japan
  // only); [AUR] Australian Series I 1.5 (Feb 1997), Series II 1.6 HD-EP (Sep 1998), FWD.
  G303G: DH("Pyzar", "G300 Series I (G303, 1.5)", "1.5L 4-cyl SOHC petrol (HE-EG)", "1.5", "4", "FWD"),
  G301G: DH("Pyzar", "G300 Series II (G301, 1.6)", "1.6L 4-cyl SOHC petrol (HD-EP)", "1.6", "4", "FWD"),
  G313G: DH("Pyzar", "G313 (1.5 4WD)", "1.5L 4-cyl SOHC petrol (HE-EG)", "1.5", "4", "4WD", false),
  G311G: DH("Pyzar", "G311 (1.6 4WD)", "1.6L 4-cyl SOHC petrol (HD-EP)", "1.6", "4", "4WD", false),
  // Copen L880 — [CS] copen/F001/M001G001 (L880K JB-DET 659 cc 4-cyl FF); [WP-EN] Daihatsu Copen (JB-DET 659 cc
  // turbo inline-four); [AUR] Australian Copen (Oct 2003–2006) JB-DET 659 cc FWD 5-speed manual.
  L880K: DH("Copen", "L880", "0.66L 4-cyl turbo petrol (JB-DET)", "0.66", "4", "FWD"),
  // Charade G100 — [CS] charade/F001/M001 (G100S CB-36 / CB-37 / CB-51 turbo / CB-70 DOHC turbo, all 993 cc FF),
  // M002G001 (G102S HC-E 1295 cc FF); [WP-EN] Daihatsu Charade third generation (G100 993 cc CB I3 FWD; G102 HC-E 1295 cc).
  G100S: DH("Charade", "G100", "1.0L 3-cyl petrol (CB series; non-turbo or turbo — not in the VIN)", "1.0", "3", "FWD"),
  // M002G009 (G112S HC-E 4WD); [WP-EN] G112 HC-E/F permanent 4WD. G102S also came with the carburettor HC-F [CS] M003G003.
  G102S: DH("Charade", "G102 (1.3)", "1.3L 4-cyl SOHC petrol (HC-E injected or HC-F carburettor)", "1.3", "4", "FWD"),
  G112S: DH("Charade", "G112 (1.3 4WD)", "1.3L 4-cyl SOHC petrol (HC-E or HC-F)", "1.3", "4", "4WD (full-time)"),
  // Charade G200 — [CS] charade/F002/M001G001 (G200S HC-E 1295 cc FF), M003G001 (G201S HD-EG 1589 cc FF), M002G001
  // (G203S HE-EG 1498 cc FF), M003G011 (G213S HE-EG 4WD); [WP-EN] Daihatsu Charade fourth generation (G200 1.3 HC FWD,
  // G201 1.6 HD, G203 1.5 HE, G213 1.5 HE 4WD "Japanese models only"). G202 (1.0 CB24, sold in Australia) has one
  // source only and is not decoded.
  G200S: DH("Charade", "G200 (1.3)", "1.3L 4-cyl SOHC petrol (HC-E)", "1.3", "4", "FWD"),
  G201S: DH("Charade", "G201 (1.6)", "1.6L 4-cyl SOHC petrol (HD-EG)", "1.6", "4", "FWD"),
  G203S: DH("Charade", "G203 (1.5)", "1.5L 4-cyl SOHC petrol (HE-EG)", "1.5", "4", "FWD"),
  G213S: DH("Charade", "G213 (1.5 4WD)", "1.5L 4-cyl SOHC petrol (HE-EG)", "1.5", "4", "4WD", false),
  // Applause — [CS] applause/F001/M001G005 (A101S HD-E 1589 cc FF), M001G001 (A101S HD-F carburettor), M001G007 (A111S
  // HD-E 4WD); [WP-EN] Daihatsu Applause (A101S front-wheel drive, A111S four-wheel drive, HD 1,589 cc; HD-F carburettor
  // 1989–92, HD-E injection).
  A101S: DH("Applause", "A101", "1.6L 4-cyl petrol (HD-E injected or HD-F carburettor)", "1.6", "4", "FWD"),
  A111S: DH("Applause", "A111 (4WD)", "1.6L 4-cyl petrol (HD-E)", "1.6", "4", "4WD (full-time)"),
};
// Not decoded (one source or none): the Delta truck V-codes, Feroza/Rocky F300, Charade L251, Cuore / Handi L701, and any
// code not listed above — the VIN says so in a note.

export const daihatsu: MakeRule = {
  id: "daihatsu", make: "Daihatsu", wmis: ["JDA"],
  checkDigit: "no", modelYear: "no",
  decode(vin) {
    const s: Partial<VinSummary> = { make: "Daihatsu" };
    const padded = vin.slice(3, 5) === "00";
    const code = padded ? vin.slice(5, 9) : vin.slice(3, 8);
    const c = padded ? undefined : DAIHATSU_CODE[code];
    if (c) {
      Object.assign(s, { model: c.model, series: c.series, engine: c.engine, engineLitres: c.litres, engineCylinders: c.cyl, fuel: "Petrol", drive: c.drive });
    }
    const note = c
      ? (c.au ? undefined : "Australian-delivered cars of this model used a different chassis code (or the sources call this version Japan-only), so this car is most likely a private import.")
      : `Daihatsu chassis code ${code} is not in the confirmed table yet.`;
    s.serial = padded ? vin.slice(9) : vin.slice(8);
    const segments: VinSegment[] = padded
      ? [
          filler(4, 5, vin, "Two zeros before a 4-character chassis code (Daihatsu light-truck layout, recall REC-002745)."),
          seg(6, 9, vin, "Daihatsu chassis (model) code", null, { note: `Chassis code ${code}: not two-sourced yet.` }),
          { from: 10, to: 17, chars: vin.slice(9), label: "Serial number", value: vin.slice(9), status: "standard" },
        ]
      : [
          seg(4, 8, vin, "Daihatsu chassis (model) code", c ? `${code} — ${c.model} ${c.series}, ${c.engine}, ${c.drive}` : null, note ? { note } : {}),
          {
            from: 9, to: 17, chars: vin.slice(8), label: "Serial number", value: vin.slice(8), status: "standard",
            note: "Daihatsu export VINs have no check digit, model year or plant code: these positions are a running serial (zeros pad the front). The build date is on the compliance plate.",
          },
        ];
    return { segments, summary: s };
  },
};

export const JEEP_DAIHATSU_RULES: MakeRule[] = [jeepMelfi, daihatsu];
