// Elroco VIN Decoding Code — Code Rule 31 (docs/vin-decoder-rules.md).
// Volkswagen Group (VW, Audi) — rest-of-world VIN layout used on Australian-delivered cars.
// Positions 4–6 and 9 are "Z" fillers, 7–8 the platform (type) code, 10 model year
// (1 Aug–31 Jul VW model year), 11 plant, 12–17 serial.
// Source: "VW VIN Codes" (Elroco folder). Audi platform codes are added from research once two-sourced.

import { seg, filler, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

export const VW_PLATFORM: Record<string, string> = {
  "13": "Scirocco 3", "14": "Caddy 1", "15": "Cabriolet", "16": "Jetta 1/2 (early) or Beetle (2012 on)",
  "17": "Golf 1", "19": "Golf 2 (early)", "1C": "New Beetle", "1E": "Golf 3 Cabriolet", "1F": "Eos",
  "1G": "Golf / Jetta 2 (late)", "1H": "Golf / Vento 3", "1J": "Golf / Bora 4", "1K": "Golf / Jetta 5 or 6",
  "1T": "Touran", "1Y": "New Beetle Cabriolet", "24": "Transporter T3 pick-up", "25": "Transporter T3",
  "2D": "LT", "2E": "Crafter 1", "2H": "Amarok", "2K": "Caddy 3", "31": "Passat 2", "32": "Santana",
  "33": "Passat 2 Variant", "3A": "Passat 3 / 4", "3B": "Passat 5", "3C": "Passat 6/7/8 or CC",
  "3D": "Phaeton", "3H": "Arteon", "50": "Corrado (early)", "53": "Scirocco 1/2", "5K": "Golf / Jetta 6",
  "5M": "Golf Plus", "5N": "Tiguan 1/2 or Tiguan Allspace", "60": "Corrado (late)", "6K": "Polo Classic",
  "6N": "Polo 3", "6R": "Polo 5", "6X": "Lupo", "70": "Transporter T4", "7H": "Transporter T5 / T6.1",
  "7J": "Transporter T6", "7L": "Touareg 1", "7M": "Sharan", "7P": "Touareg 2", "86": "Polo 1/2",
  "87": "Polo Coupe", "9C": "New Beetle", "9K": "Caddy 2 van", "9N": "Polo 4", "9U": "Caddy 2 pick-up",
  "A1": "T-Roc", "AA": "up!", "AU": "Golf 7", "AW": "Polo 6", "C1": "T-Cross", "CD": "Golf 8",
  "SK": "Caddy 4", "SY": "Crafter 2",
};

const VW_PLANT: Record<string, string> = {
  A: "Ingolstadt, Germany", B: "Brussels, Belgium", C: "Chattanooga, USA", D: "Bratislava, Slovakia",
  E: "Emden, Germany", F: "Resende, Brazil", G: "Graz, Austria", H: "Hanover, Germany",
  K: "Osnabrück, Germany", M: "Puebla, Mexico", N: "Neckarsulm, Germany", R: "Martorell, Spain",
  S: "Salzgitter, Germany", U: "Uitenhage, South Africa", W: "Wolfsburg, Germany", X: "Poznań, Poland",
  Y: "Pamplona, Spain", "1": "Győr, Hungary", "2": "Anting, China", "3": "Changchun, China",
  "4": "Curitiba, Brazil", "8": "Dresden, Germany or General Pacheco, Argentina",
  "9": "Września, Poland",
};

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
      s.model = "Amarok"; s.series = "2nd generation (2022 on)";
      out.push(seg(7, 9, vin, "Vehicle descriptor", null, { note: "WV4 (Ford-built Amarok) layout not yet published — not decoded." }));
    } else {
      const p = platforms[vin.slice(6, 8)] ?? null;
      if (p) { s.model = p.replace(/\s*\(.*\)$/, "").split(" / ")[0]; s.series = p.match(/\(([^)]+)\)/)?.[1] ?? p; }
      out.push(seg(7, 8, vin, "Platform / model", p));
      if (vin[8] === "Z") out.push(filler(9, 9, vin, "Filler — no check digit on rest-of-world VW Group VINs."));
    }
    const y = resolveModelYear(vin[9], 1980);
    s.modelYear = y;
    out.push(seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "VW Group model year runs 1 August to 31 July." }));
    // "8" is shared by Dresden and General Pacheco; the Argentine Amarok carries WMI 8AW.
    let plant: string | null = VW_PLANT[vin[10]] ?? null;
    if (vin[10] === "8") plant = vin.startsWith("8A") ? "General Pacheco, Argentina" : "Dresden, Germany";
    if (vin.startsWith("WV4")) plant = null; // WV4 plant letters not yet confirmed (S on Australian samples).
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
  "8L": "A3 (8L)", "8P": "A3 (8P)", "8V": "A3 (8V)", "8Y": "A3 (8Y)",
  "8X": "A1 (8X)", GB: "A1 (GB)",
  "8E": "A4 (B6/B7)", "8H": "A4 Cabriolet (B6/B7)", "8K": "A4 (B8)", "8W": "A4 (B9)",
  "8T": "A5 (8T)", "8F": "A5 Cabriolet (8F)", F5: "A5 (F5)",
  "4B": "A6 (C5)", "4F": "A6 (C6)", "4G": "A6 / A7 (C7)", "4A": "A6 (C8)",
  "4E": "A8 (D3)", "4H": "A8 (D4)", "4N": "A8 (D5)",
  "8U": "Q3 (8U)", F3: "Q3 (F3)", GA: "Q2 (GA)",
  "8R": "Q5 (8R)", FY: "Q5 (FY)", "4L": "Q7 (4L)", "4M": "Q7 / Q8 (4M)",
  "8N": "TT (8N)", "8J": "TT (8J)", FV: "TT (FV)", "42": "R8 (42)", "4S": "R8 (4S)",
};

export const audi: MakeRule = {
  id: "audi", make: "Audi",
  wmis: ["WAU", "WA1", "WUA", "TRU"],
  checkDigit: "no", modelYear: "yes", years: [1980, new Date().getFullYear() + 1],
  decode: decodeVAG("Audi", AUDI_PLATFORM),
};
