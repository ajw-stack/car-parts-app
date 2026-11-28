// Elroco VIN Decoding Code — Code Rule 31 (docs/vin-decoder-rules.md).
// Volkswagen Group (VW, Audi) — rest-of-world VIN layout used on Australian-delivered cars.
// Positions 4–6 and 9 are "Z" fillers, 7–8 the platform (type) code, 10 model year
// (1 Aug–31 Jul VW model year), 11 plant, 12–17 serial.
// Source: "VW VIN Codes" (Elroco folder). Audi platform codes are added from research once two-sourced.

import { seg, filler, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

export const VW_PLATFORM: Record<string, string> = {
  "13": "Scirocco 3", "14": "Caddy 1", "15": "Golf Cabriolet (Mk1)", "16": "Jetta 6 (1B)",
  "17": "Golf 1", "19": "Golf 2 (early)", "1C": "New Beetle", "1E": "Golf 3 Cabriolet", "1F": "Eos",
  "1G": "Golf / Jetta 2 (late)", "1H": "Golf / Vento 3", "1J": "Golf / Bora 4", "1K": "Golf / Jetta 5 or 6",
  "1T": "Touran", "1Y": "New Beetle Cabriolet", "24": "Transporter T3 pick-up", "25": "Transporter T3",
  "2D": "LT", "2E": "Crafter 1", "2H": "Amarok", "2K": "Caddy 3", "31": "Passat 2", "32": "Santana",
  "33": "Passat 2 Variant", "3A": "Passat 3 / 4", "3B": "Passat 5", "3C": "Passat 6/7/8 or CC",
  "3D": "Phaeton", "3H": "Arteon", "50": "Corrado (early)", "53": "Scirocco 1/2", "5K": "Golf / Jetta 6",
  "5M": "Golf Plus", "5N": "Tiguan 1/2 or Tiguan Allspace", "60": "Corrado (late)", "6K": "Polo Classic",
  "6N": "Polo 3", "6R": "Polo 5", "6X": "Lupo", "70": "Transporter T4", "7H": "Transporter / Multivan T5, T6 or T6.1",
  "7L": "Touareg 1", "7M": "Sharan", "7P": "Touareg 2", "86": "Polo 1/2",
  "87": "Polo Coupe", "9C": "New Beetle", "9K": "Caddy 2 van", "9N": "Polo 4", "9U": "Caddy 2 pick-up",
  "A1": "T-Roc", "AA": "up!", "AU": "Golf 7", "AW": "Polo 6", "C1": "T-Cross", "CD": "Golf 8",
  "SK": "Caddy 5", "SY": "Crafter 2",
  // Audit 2026-11-28 vs real AU VINs (Pickles, Autosports Group, MyMoto, Grays, automarkets; scratchpad audit_vag/findings.txt).
  // Corrected: 16 = Jetta 6 (Puebla), 7H covers T5/T6/T6.1 (7J never seen), SK = Caddy 5 (Caddy 4 MY16–20 carries 2K).
  CT: "Tiguan 3 (CT)", R4: "Tayron (R4)", CR: "Touareg 3 (CR)", E2: "ID.4 or ID.5 (E2 — shared)", ST: "Multivan T7 (ST)",
};

const VW_PLANT: Record<string, string> = {
  A: "Ingolstadt, Germany", B: "Brussels, Belgium", C: "Chattanooga, USA", D: "Bratislava, Slovakia",
  E: "Emden, Germany", F: "Resende, Brazil", G: "Graz, Austria", H: "Hanover, Germany",
  K: "Osnabrück, Germany", M: "Puebla, Mexico", N: "Neckarsulm, Germany", R: "Martorell, Spain",
  S: "Salzgitter, Germany", U: "Uitenhage, South Africa", W: "Wolfsburg, Germany", X: "Poznań, Poland",
  Y: "Pamplona, Spain", "1": "Győr, Hungary", "2": "Anting, China", "3": "Changchun, China",
  "4": "Curitiba, Brazil", "8": "Dresden, Germany or General Pacheco, Argentina",
  "9": "Września, Poland",
  // Added 2026-11-28 (Wikibooks + real AU VINs): P = Zwickau (Golf 6/7, ID.5, Q4 e-tron), V = Palmela (T-Roc, Eos, Scirocco).
  P: "Zwickau, Germany", V: "Palmela, Portugal",
};

// Audi Sport (WMI WUA, quattro GmbH) type codes on rest-of-world VINs — added 2026-11-28. Each code seen on
// Australian VINs from two independent sellers (automarkets dealer/Retro Rides/Collecting Cars pages, old.com.au,
// gemcars, vasliprestige, drive.com.au, MyMoto); S models carry WAU, not WUA (AU S6/SQ8 VINs + Audi's 2024 NHTSA
// VIN sheet). The VIN does NOT separate RS6 from RS7, nor standard from performance (same 4G/F2 code, mixed serials).
// kW: GoAuto + CarExpert (C7), Audi AU magazine 14 Sep 2023 + CarExpert (C8). Evidence: scratchpad wua/wua_findings.md.
// The 8J TT RS uses WMI TRU, not WUA. Codes 8U, 8K, 8T, FV, 8P, 8D, 4B, 4F are single-source and not decoded.
interface WuaModel { label: string; model: string; series: string; engine?: string; litres?: string; cyl?: string; note?: string }
const WUA_RS: Record<string, WuaModel> = {
  "4G": { label: "RS 6 Avant or RS 7 Sportback (C7)", model: "RS 6 Avant / RS 7 Sportback", series: "C7",
    engine: "4.0L TFSI twin-turbo V8", litres: "4.0", cyl: "8",
    note: "The VIN can't tell RS 6 from RS 7, or standard (412 kW, to early 2016) from performance (445 kW, Australian launch April 2016) — check the badge or build sticker." },
  F2: { label: "RS 6 Avant or RS 7 Sportback (C8)", model: "RS 6 Avant / RS 7 Sportback", series: "C8",
    engine: "4.0L TFSI twin-turbo V8 (mild hybrid)", litres: "4.0", cyl: "8",
    note: "The VIN can't tell RS 6 from RS 7, or standard (441 kW, from 2020) from performance (463 kW, from late 2023) — check the badge or build sticker." },
  "8V": { label: "RS 3 (8V)", model: "RS 3", series: "8V", engine: "2.5L TFSI 5-cylinder turbo", litres: "2.5", cyl: "5" },
  GY: { label: "RS 3 (8Y)", model: "RS 3", series: "8Y", engine: "2.5L TFSI 5-cylinder turbo", litres: "2.5", cyl: "5" },
  F4: { label: "RS 4 Avant (B9)", model: "RS 4 Avant", series: "B9", engine: "2.9L TFSI twin-turbo V6", litres: "2.9", cyl: "6" },
  "8E": { label: "RS 4 (B7)", model: "RS 4", series: "B7", engine: "4.2L V8", litres: "4.2", cyl: "8" },
  F5: { label: "RS 5 Coupe or Sportback (B9)", model: "RS 5", series: "B9", engine: "2.9L TFSI twin-turbo V6", litres: "2.9", cyl: "6",
    note: "Coupe or Sportback is not shown by the VIN." },
  F3: { label: "RS Q3 (F3)", model: "RS Q3", series: "F3" },
  F1: { label: "RS Q8", model: "RS Q8", series: "4M" },
  "42": { label: "R8 (Type 42)", model: "R8", series: "Type 42", note: "V8 or V10 is not shown by the VIN." },
  FX: { label: "R8 (Type 4S)", model: "R8", series: "Type 4S" },
};

const VW_PRE2010 = new Set(["14", "15", "17", "19", "1C", "1E", "1G", "1H", "1J", "1Y", "24", "25", "2D", "31", "32", "33", "3A", "3B",
  "50", "53", "60", "6K", "6N", "6X", "70", "86", "87", "9C", "9K", "9N", "9U"]);
const AUDI_PRE2010 = new Set(["4A", "4B", "8L", "8E", "8H", "8N"]);

function decodeVAG(make: string, platforms: Record<string, string>) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const out: VinSegment[] = [];
    const rowSpec = vin.slice(3, 6) === "ZZZ";
    if (rowSpec) out.push(filler(4, 6, vin));
    else out.push(seg(4, 6, vin, "Body / engine / restraint (US-market layout)", null, { note: "Non-Australian layout — not decoded." }));
    if (vin.startsWith("WV4")) {
      // Second-generation Amarok (2022 on), built by Ford at Silverton, South Africa.
      // Its positions 7–9 do not follow the classic two-letter platform + Z pattern.
      // WV4 + TV = Transporter T7 (Ford-built, Kocaeli plant K) — Autosports Group 10 + MyMoto 1 (2026-11-28).
      const t7 = vin.slice(6, 8) === "TV";
      if (t7) { s.model = "Transporter"; s.series = "T7 (Ford-built)"; }
      else if (vin.slice(6, 8) === "T1") { s.model = "Amarok"; s.series = "2nd generation (2022 on)"; }
      // T1 = 2nd-gen Amarok model code on all 1,422 VINs in Australian recall lists REC-005829/005838/
      // 006190/006441 ("all variants"); it does not split cab or engine. Position 9 is a real check digit.
      out.push(seg(7, 8, vin, "Model code", vin.slice(6, 8) === "T1" ? "Amarok (2nd generation)" : t7 ? "Transporter T7" : null,
        vin.slice(6, 8) === "T1" ? { note: "Does not identify the cab or engine." } : t7 ? {} : { note: "Not yet confirmed." }));
    } else {
      let p = platforms[vin.slice(6, 8)] ?? null;
      // 3C from model year 2017 (H) on can only be a Passat B8: the CC ended in 2016 (replaced by the
      // Arteon, platform 3H) — Australian recall REC-001397 "Passat" sheet holds WVWZZZ3CZ…J… VINs while
      // its Arteon sheet is all 3H; Wikipedia VW CC production 2008–2016 (added 2026-11-20).
      const vy = resolveModelYear(vin[9], 1980);
      if (vin.slice(6, 8) === "3C" && vy !== null && vy >= 2017) p = "Passat 8 (B8 — sedan, wagon or Alltrack)";
      if (p) { s.model = p.replace(/\s*\(.*\)$/, "").split(" / ")[0]; s.series = p.match(/\(([^)]+)\)/)?.[1] ?? p; }
      const rs = vin.startsWith("WUA") ? WUA_RS[vin.slice(6, 8)] : undefined;
      if (rs) {
        s.model = rs.model; s.series = rs.series;
        if (rs.engine) Object.assign(s, { engine: rs.engine, engineLitres: rs.litres, engineCylinders: rs.cyl, fuel: "Petrol" });
        out.push(seg(7, 8, vin, "Platform / model", `${rs.label}${rs.engine ? ", " + rs.engine : ""}`, rs.note ? { note: rs.note } : {}));
      } else out.push(seg(7, 8, vin, "Platform / model", p));
      if (vin[8] === "Z") out.push(filler(9, 9, vin, "Filler — no check digit on rest-of-world VW Group VINs."));
    }
    // Platforms whose production ended before 2010 can't carry a 2010+ year: without this the 30-year cycle read a 1989 T3
    // as 2019 and a 1994 Audi S4 (C4) as 2024 (audit 2026-11-28).
    const old = (make === "Audi" ? AUDI_PRE2010 : VW_PRE2010).has(vin.slice(6, 8));
    const y = resolveModelYear(vin[9], 1980, old ? 2009 : undefined);
    s.modelYear = y;
    out.push(seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "VW Group model year runs 1 August to 31 July." }));
    // "8" is shared by Dresden and General Pacheco; the Argentine Amarok carries WMI 8AW.
    let plant: string | null = VW_PLANT[vin[10]] ?? null;
    if (vin[10] === "8") plant = vin.startsWith("8A") ? "General Pacheco, Argentina" : "Dresden, Germany";
    // 1st-gen Amarok (2H) with A = General Pacheco, not Ingolstadt (Pickles 24/26, Autosports 5/5, MyMoto 8/10; the
    // Amarok was built only at Pacheco and Hanover). Audi Q5 FY/GU with 2 = San José Chiapa, Mexico (260+ AU VINs).
    if (vin[10] === "A" && vin.slice(6, 8) === "2H") plant = "General Pacheco, Argentina";
    if (vin[10] === "2" && make === "Audi" && (vin.slice(6, 8) === "FY" || vin.slice(6, 8) === "GU")) plant = "San José Chiapa, Mexico";
    // WV4: S = Silverton, South Africa (Ford) — 100% of Australian 2nd-gen Amarok recall VINs, and the
    // Amarok is assembled exclusively at Ford Silverton. (S means Salzgitter on older VW Group VINs.)
    if (vin.startsWith("WV4")) plant = vin[10] === "S" ? "Silverton, South Africa (Ford)" : vin[10] === "K" && vin.slice(6, 8) === "TV" ? "Kocaeli, Turkey (Ford Otosan)" : null;
    s.plant = plant;
    out.push(seg(11, 11, vin, "Assembly plant", plant));
    return { segments: out, summary: s };
  };
}

export const volkswagen: MakeRule = {
  id: "volkswagen", make: "Volkswagen",
  wmis: ["WVW", "WVG", "WV1", "WV2", "WV3", "WV4", "AAV", "8AW", "VWV", "3VW", "9BW"],
  checkDigit: "no", modelYear: "yes", years: [1980, new Date().getFullYear() + 1],
  decode: decodeVAG("Volkswagen", VW_PLATFORM),
};

// Audi platform table is populated from research (see audi.ts once two-sourced); until then
// the Audi rule decodes the shared VW Group positions only.
// Confirmed on Australian Pickles listings: 8K (A4 B8), 8R (Q5), FY (Q5 2nd gen), 8X (A1), GB (A1 2nd gen).
// The remaining codes are Audi's published type numbers for the same generations.
export const AUDI_PLATFORM: Record<string, string> = {
  "8L": "A3 (8L)", "8P": "A3 (8P)", "8V": "A3 (8V)", GY: "A3 (8Y)",
  "8X": "A1 (8X)", GB: "A1 (GB)",
  "8E": "A4 (B6/B7)", "8H": "A4 Cabriolet (B6/B7)", "8K": "A4 (B8)", F4: "A4 (B9)",
  "8T": "A5 (8T)", "8F": "A5 Cabriolet (8F)", F5: "A5 (F5)", FU: "A5 (B10)",
  "4B": "A6 (C5)", "4F": "A6 (C6)", "4G": "A6 / A7 (C7)", "4A": "100 / A6 (C4)",
  F2: "A6 / A7 (C8)",   // added 2026-11-28: AU WUAZZZF2… RS 6/7 C8 VINs + Audi's 2024 NHTSA VIN sheet (A6/S6/A7/S7 = F2)
  "4E": "A8 (D3)", "4H": "A8 (D4)", "4N": "A8 (D5)",
  "8U": "Q3 (8U)", F3: "Q3 (F3)", FJ: "Q3 (3rd generation)", GA: "Q2 (GA)",
  "8R": "Q5 (8R)", FY: "Q5 (FY)", GU: "Q5 (3rd generation)", "4L": "Q7 (4L)", "4M": "Q7 (4M)", F1: "Q8 (4M)",
  FZ: "Q4 e-tron (FZ)", GE: "e-tron / Q8 e-tron (GE)",
  "8N": "TT (8N)", "8J": "TT (8J)", FV: "TT (FV)", "42": "R8 (42)", FX: "R8 (4S)",
  // Audit 2026-11-28 vs real AU VINs (Pickles, Autosports Group, MyMoto, Grays, automarkets; scratchpad audit_vag/findings.txt).
  // Corrected: 8Y→GY, 8W→F4, 4A is the C4 (C8 A6 = F2), 4M is Q7 only (Q8 = F1), 4S→FX. 4N (A8 D5) is suspect (one
  // D5 VIN shows F8) and left in until a second source.
};

export const audi: MakeRule = {
  id: "audi", make: "Audi",
  wmis: ["WAU", "WA1", "WUA", "TRU"],   // WUA = Audi Sport (RS models, R8) — see WUA_RS
  checkDigit: "no", modelYear: "yes", years: [1980, new Date().getFullYear() + 1],
  decode: decodeVAG("Audi", AUDI_PLATFORM),
};
