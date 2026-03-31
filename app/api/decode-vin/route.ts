import { NextRequest, NextResponse } from "next/server";
import { lookupWMI } from "../../lib/wmi";

export const dynamic = "force-dynamic";

// ─── VIN year decode ──────────────────────────────────────────────────────────
// Position 10 (index 9) encodes the model year.
// Letters A-Y (excluding I, O, Q, U, Z) repeat in two 30-year cycles.
// Digits 1-9 are unambiguous (2001-2009).
const YEAR_MAP: Record<string, [number, number?]> = {
  A: [1980, 2010], B: [1981, 2011], C: [1982, 2012], D: [1983, 2013],
  E: [1984, 2014], F: [1985, 2015], G: [1986, 2016], H: [1987, 2017],
  J: [1988, 2018], K: [1989, 2019], L: [1990, 2020], M: [1991, 2021],
  N: [1992, 2022], P: [1993, 2023], R: [1994, 2024], S: [1995, 2025],
  T: [1996, 2026], V: [1997, 2027], W: [1998, 2028], X: [1999, 2029],
  Y: [2000, 2030],
  "1": [2001], "2": [2002], "3": [2003], "4": [2004], "5": [2005],
  "6": [2006], "7": [2007], "8": [2008], "9": [2009],
};

function decodeModelYear(vin: string): string | null {
  const ch = vin[9]?.toUpperCase();
  const entry = YEAR_MAP[ch];
  if (!entry) return null;
  if (entry.length === 1) return String(entry[0]);

  // Ambiguous — two possible cycles. Heuristic:
  // European VINs use Z at position 9 (check digit) and often pad positions
  // 4-8 with Z. If either is true, the VIN is post-2009 (new cycle).
  const isEuropeanFormat = vin[8] === "Z" || vin.substring(3, 9).includes("Z");
  return String(isEuropeanFormat ? entry[1] : entry[0]);
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin")?.trim().toUpperCase();

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: "A valid 17-character VIN is required." }, { status: 400 });
  }

  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "NHTSA API unavailable. Please try again." }, { status: 502 });
  }

  const data = await res.json();
  const r = data?.Results?.[0];

  if (!r) {
    return NextResponse.json({ error: "No result returned for this VIN." }, { status: 404 });
  }

  const val = (key: string) => {
    const v = r[key];
    return v && v !== "0" && v.trim() !== "" ? v.trim() : null;
  };

  // Parse all error codes (NHTSA returns them semicolon-separated)
  const errorCodes = (r.ErrorCode ?? "0")
    .split(";")
    .map((s: string) => parseInt(s.trim(), 10))
    .filter((n: number) => !isNaN(n));

  const hasFatalError = errorCodes.some((c: number) => c !== 0 && c !== 1 && c !== 5 && c !== 14 && c !== 400);

  if (hasFatalError) {
    return NextResponse.json({ error: r.ErrorText || "VIN could not be decoded." }, { status: 422 });
  }

  // European VINs (Z check digit or ZZZ padding) cause NHTSA to mis-decode the
  // model year. For those, use our own decoder. For all other VINs, trust NHTSA.
  const isEuropean = vin[8] === "Z" || vin.substring(3, 9).includes("Z");
  const nhtsaYear = val("ModelYear");
  const year = isEuropean ? (decodeModelYear(vin) ?? nhtsaYear) : (nhtsaYear ?? decodeModelYear(vin));

  // Only surface a warning if NHTSA had real decode issues beyond EU formatting
  const hasWarning = errorCodes.some((c: number) => c !== 0) && !isEuropean;

  // WMI-derived make: strip qualifiers like "(post 2002)" and "/ alternate"
  const rawWmi = lookupWMI(vin);
  const wmiMake = rawWmi
    ? rawWmi.replace(/\s*\(.*?\)/g, "").replace(/\s*\/.*$/, "").trim()
    : null;

  // ── Holden VIN decoder (6G1 prefix) ─────────────────────────────────────────
  // Digit 4 = model series, digit 5 = variant/luxury level
  const HOLDEN_MODEL_CODES: Record<string, string> = {
    E: "VE", F: "VF", Y: "VY", Z: "VZ",
    K: "Statesman/Caprice WK", L: "Statesman/Caprice WL",
    M: "Statesman/Caprice WM", N: "Caprice WN",
  };
  // Digit 5 variant — K has model-dependent meaning on Commodores
  const HOLDEN_VARIANT_CODES: Record<string, string | Record<string, string>> = {
    K: { Y: "Executive", Z: "SV6 / SV6000", E: "SV6 / SV8 / SS", F: "Executive / SS", default: "Executive" },
    L: "Berlina",
    X: "Calais",
    Z: "Caprice",
    Y: "Statesman",
    P: "SSV",
    C: "SS",
    B: "SV6",
    J: "Calais V",
    E: "SS V Redline",
    F: "HSV Maloo",
    A: "International",
  };
  // Only decode digit 5 variant for Commodore model codes (not Statesman/Caprice LWB)
  const COMMODORE_CHARS = new Set(["E", "F", "Y", "Z"]);
  // Digit 6 = body style
  const HOLDEN_BODY_CODES: Record<string, string> = {
    "0": "Cab Chassis / 1 Tonne Ute",
    "1": "2 Door Coupe",
    "3": "4 Door Ute (Crewman)",
    "4": "Ute",
    "5": "4 Door Sedan",
    "8": "Wagon",
  };
  // Digit 11 = assembly plant
  const HOLDEN_PLANT_CODES: Record<string, { city: string; country: string }> = {
    L: { city: "Elizabeth", country: "Australia" },
  };
  // Digit 8 = engine code
  const HOLDEN_ENGINE_CODES: Record<string, string> = {
    A: "3.8L V6 Ecotec",
    B: "3.6L V6 Alloytec 175kW Dual Fuel LY7",
    "7": "3.6L V6 Alloytec 190 195kW LY7",
    R: "3.8L V6 Supercharged Ecotec (L67)",
    "5": "3.0L V6 SIDI LF1 190kW",
    "3": "3.6L V6 210kW LLT Petrol",
    V: "3.6L V6 210kW LFX Petrol/E85",
    F: "5.7L V8 Gen III",
    S: "5.7L V8 (CV8 Monaro)",
    "2": "6.0L V8 LS2 / L76 / L77",
    U: "6.0L V8 LS2 307kW",
    H: "6.0L V8 L98 270kW",
    Y: "6.0L V8 L77 270kW",
    W: "6.2L V8 LS3",
    P: "6.2L V8 Supercharged (HSV)",
  };
  // Digit 7 = restraint system
  const HOLDEN_RESTRAINT_CODES: Record<string, string> = {
    "1": "Active seat belts",
    "2": "Active belts with driver & passenger airbags",
    "3": "Active belts with driver airbag",
    "4": "Active belts with driver, passenger & side airbags",
    "5": "Active belts with driver, passenger & side airbags (HSV GTS)",
    "E": "Active belts with load limiters — driver, passenger & side airbags",
  };

  // VIN prefix overrides for other makes (longest match wins)
  const VIN_PREFIX_OVERRIDES: Record<string, { make?: string; model?: string }> = {
    "6G1": { make: "Holden" },
  };

  let resolvedMake       = val("Make");
  let resolvedModel      = val("Model");
  let resolvedSeries     = val("Series");
  let resolvedBody       = val("BodyClass");
  let resolvedRestraints = null as string | null;
  let resolvedEngine     = val("EngineModel");
  let resolvedPlantCity    = val("PlantCity");
  let resolvedPlantCountry = val("PlantCountry");

  if (vin.startsWith("6G1")) {
    resolvedMake = "Holden";
    const modelChar     = vin[3];
    const variantChar   = vin[4];
    const bodyChar      = vin[5];
    const restraintChar = vin[6];
    const engineChar    = vin[7];
    const plantChar     = vin[10];
    if (modelChar && HOLDEN_MODEL_CODES[modelChar]) {
      resolvedModel = HOLDEN_MODEL_CODES[modelChar];
    }
    if (variantChar && modelChar && COMMODORE_CHARS.has(modelChar)) {
      const entry = HOLDEN_VARIANT_CODES[variantChar];
      if (entry) {
        resolvedSeries = typeof entry === "string"
          ? entry
          : (entry[modelChar] ?? entry.default ?? resolvedSeries);
      }
    }
    if (bodyChar && HOLDEN_BODY_CODES[bodyChar]) {
      resolvedBody = HOLDEN_BODY_CODES[bodyChar];
    }
    if (restraintChar && HOLDEN_RESTRAINT_CODES[restraintChar]) {
      resolvedRestraints = HOLDEN_RESTRAINT_CODES[restraintChar];
    }
    if (engineChar && HOLDEN_ENGINE_CODES[engineChar]) {
      resolvedEngine = HOLDEN_ENGINE_CODES[engineChar];
    }
    if (plantChar && HOLDEN_PLANT_CODES[plantChar]) {
      resolvedPlantCity    = HOLDEN_PLANT_CODES[plantChar].city;
      resolvedPlantCountry = HOLDEN_PLANT_CODES[plantChar].country;
    }
  } else {
    const prefixMatch =
      VIN_PREFIX_OVERRIDES[vin.substring(0, 4)] ??
      VIN_PREFIX_OVERRIDES[vin.substring(0, 3)] ??
      {};
    resolvedMake  = prefixMatch.make  ?? resolvedMake;
    resolvedModel = prefixMatch.model ?? resolvedModel;
  }

  return NextResponse.json({
    vin,
    year,
    make: resolvedMake,
    wmiMake,
    model: resolvedModel,
    series: resolvedSeries,
    trim: val("Trim"),
    bodyClass: resolvedBody,
    restraints: resolvedRestraints,
    doors: val("Doors"),
    vehicleType: val("VehicleType"),
    manufacturer: val("Manufacturer"),
    plantCountry: resolvedPlantCountry,
    plantCity: resolvedPlantCity,
    displacementL: val("DisplacementL"),
    cylinders: val("EngineCylinders"),
    engineModel: resolvedEngine,
    fuelType: val("FuelTypePrimary"),
    driveType: val("DriveType"),
    transmissionStyle: val("TransmissionStyle"),
    transmissionSpeeds: val("TransmissionSpeeds"),
    brakeSystem: val("BrakeSystemType"),
    steeringType: val("SteeringType"),
    errorText: hasWarning ? r.ErrorText : null,
  });
}
