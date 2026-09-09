import { lookupWMI, getCountryOfManufacture, getSerialNumber, getModelSeries, getCruzeTrimLevel, getAssemblyPlant } from "./wmi";
import type { DecodedVehicle, DecodeResult } from "./vin/types";

const CORE_FIELDS = ["Make","Model","ModelYear","BodyClass","EngineCylinders","FuelTypePrimary"] as const;

function scoreConfidence(val: (k: string) => string | null, make: string | null, model: string | null): "high" | "partial" | "low" {
  const filled = CORE_FIELDS.filter((f) => val(f)).length;
  // If overrides resolved make+model, treat as at least partial
  if (make && model && filled >= 2) return "high";
  if (filled >= 5) return "high";
  if (filled >= 3) return "partial";
  if (make && model) return "partial";
  return "low";
}

// ─── Main decode ───────────────────────────────────────────────────────────────

export type DecodeVinResult = DecodeResult;

export async function decodeVin(rawVin: string): Promise<DecodeResult> {
  const vin = rawVin.trim().toUpperCase();

  let res: Response;
  try {
    res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`,
      { signal: AbortSignal.timeout(10_000), cache: "no-store" },
    );
  } catch {
    return { ok: false, error: "Decode service unreachable. Try again." };
  }

  if (!res.ok) return { ok: false, error: `Decode service error (${res.status}).` };

  const data = await res.json();
  const r: Record<string, string> = data?.Results?.[0] ?? {};

  const val = (key: string): string | null => {
    const v = r[key];
    return v && v !== "0" && v !== "Not Applicable" && v.trim() !== "" ? v.trim() : null;
  };

  const errorText  = val("ErrorText");
  const errorCodes = (r.ErrorCode ?? "0").split(";").map((s) => s.trim());
  const fatalCodes = errorCodes.filter((c) => !["0","1","5","6","8","14","400"].includes(c));

  // ── Base fields from NHTSA ────────────────────────────────────────────────
  const rawWmi = lookupWMI(vin);
  const wmiMake = rawWmi ? rawWmi.replace(/\s*\(.*?\)/g, "").replace(/\s*\/.*$/, "").trim() : null;

  let make         = val("Make") ?? wmiMake;
  let model        = val("Model");
  let trim         = val("Trim") ?? val("Series");
  let bodyClass    = val("BodyClass");
  let plantCountry = val("PlantCountry");

  // ── Holden overrides (WMI 6G1) ────────────────────────────────────────────
  if (vin.startsWith("6G1")) {
    make = "Holden";
  }

  // ── Fail only if completely unidentifiable ────────────────────────────────
  if (!make && fatalCodes.length > 0) {
    return { ok: false, error: errorText ?? "Could not decode this VIN." };
  }

  const confidence = scoreConfidence(val, make, model);

  // Surface non-zero NHTSA notes as warnings (e.g. check digit issues on EU VINs)
  const warnCodes = errorCodes.filter((c) => !["0"].includes(c));
  const rawErrors = warnCodes.length > 0 ? errorText : null;

  const year = val("ModelYear") ? parseInt(val("ModelYear")!, 10) : null;

  const vehicle: DecodedVehicle = {
    vin,
    year,
    make,
    model,
    trim,
    bodyClass,
    engineCylinders:     val("EngineCylinders"),
    engineDisplacementL: val("DisplacementL"),
    fuelType:            val("FuelTypePrimary"),
    transmission:        val("TransmissionStyle"),
    driveType:           val("DriveType"),
    manufacturer:        val("Manufacturer"),
    plantCountry,
    countryOfManufacture: getCountryOfManufacture(vin) || null,
    serialNumber:         getSerialNumber(vin) || null,
    modelSeries:          getModelSeries(vin) || null,
    trimLevel:            getCruzeTrimLevel(vin) || null,
    assemblyPlant:        getAssemblyPlant(vin) || null,
    source:              "nhtsa",
    confidence,
    rawErrors,
  };

  return { ok: true, vehicle };
}
