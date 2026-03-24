import { NextRequest, NextResponse } from "next/server";

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

  // European VINs (Z check digit, ZZZ padding) cause NHTSA to mis-decode the
  // model year. Always recalculate from position 10 and prefer our value.
  const ourYear = decodeModelYear(vin);
  const nhtsaYear = val("ModelYear");
  const year = ourYear ?? nhtsaYear;

  // Only surface a warning if NHTSA had real decode issues beyond EU formatting
  const isEuropean = vin[8] === "Z" || vin.substring(3, 9).includes("Z");
  const hasWarning = errorCodes.some((c: number) => c !== 0) && !isEuropean;

  return NextResponse.json({
    vin,
    year,
    make: val("Make"),
    model: val("Model"),
    series: val("Series"),
    trim: val("Trim"),
    bodyClass: val("BodyClass"),
    doors: val("Doors"),
    vehicleType: val("VehicleType"),
    manufacturer: val("Manufacturer"),
    plantCountry: val("PlantCountry"),
    plantCity: val("PlantCity"),
    displacementL: val("DisplacementL"),
    cylinders: val("EngineCylinders"),
    engineModel: val("EngineModel"),
    fuelType: val("FuelTypePrimary"),
    driveType: val("DriveType"),
    transmissionStyle: val("TransmissionStyle"),
    transmissionSpeeds: val("TransmissionSpeeds"),
    brakeSystem: val("BrakeSystemType"),
    steeringType: val("SteeringType"),
    errorText: hasWarning ? r.ErrorText : null,
  });
}
