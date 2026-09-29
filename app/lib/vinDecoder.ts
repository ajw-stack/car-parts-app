// VIN decode: Elroco's own position-by-position rules first (Australian-market VINs),
// then the US NHTSA vPIC service to fill gaps — useful mainly for North-American-built
// vehicles (Jeep, Mustang, Chrysler 300, US-built Nissan/Honda). Where both answer, the
// local rule wins: vPIC has no data for most Japanese, Thai or Australian-built VINs.

import { lookupWMI } from "./wmi";
import { decodeVinPositions, type VinBreakdown } from "./vin/engine";
import type { DecodedVehicle, DecodeResult } from "./vin/types";

type Nhtsa = (key: string) => string | null;

async function fetchNhtsa(vin: string): Promise<Nhtsa | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`,
      { signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r: Record<string, string> = data?.Results?.[0] ?? {};
    return (key: string) => {
      const v = r[key];
      return v && v !== "0" && v !== "Not Applicable" && v.trim() !== "" ? v.trim() : null;
    };
  } catch {
    return null;
  }
}

// vPIC only has real data for VINs built to the North American layout.
function nhtsaUseful(vin: string): boolean {
  return /^[1-5]/.test(vin) || (vin.startsWith("7") && !/^7[A-E]/.test(vin));
}

function confidenceOf(v: DecodedVehicle): "high" | "partial" | "low" {
  const core = [v.make, v.model, v.year, v.bodyClass, v.engineDisplacementL].filter(Boolean).length;
  if (core >= 4) return "high";
  if (core >= 2) return "partial";
  return "low";
}

/** Build the vehicle record from a breakdown, optionally topped up with vPIC fields. */
export function vehicleFromBreakdown(bd: VinBreakdown, nh: Nhtsa | null = null): DecodedVehicle {
  const s = bd.summary;
  const wmiName = lookupWMI(bd.vin);
  const nhYear = nh?.("ModelYear");
  const v: DecodedVehicle = {
    vin: bd.vin,
    year: s.modelYear ?? (nhYear ? parseInt(nhYear, 10) : null),
    make: s.make ?? nh?.("Make") ?? (wmiName ? wmiName.replace(/\s*\(.*?\)/g, "").replace(/\s*\/.*$/, "").trim() : null),
    model: s.model ?? nh?.("Model") ?? null,
    trim: nh?.("Trim") ?? nh?.("Series") ?? null,
    bodyClass: s.body ?? nh?.("BodyClass") ?? null,
    engineCylinders: s.engineCylinders ?? nh?.("EngineCylinders") ?? null,
    engineDisplacementL: s.engineLitres ?? nh?.("DisplacementL") ?? null,
    fuelType: s.fuel ?? nh?.("FuelTypePrimary") ?? null,
    transmission: s.transmission ?? nh?.("TransmissionStyle") ?? null,
    driveType: s.drive ?? nh?.("DriveType") ?? null,
    manufacturer: s.manufacturer ?? nh?.("Manufacturer") ?? null,
    plantCountry: nh?.("PlantCountry") ?? null,
    countryOfManufacture: s.country,
    serialNumber: s.serial,
    modelSeries: s.series,
    trimLevel: s.trim,
    assemblyPlant: s.plant,
    source: "nhtsa",
    confidence: "low",
    rawErrors: null,
  };
  v.confidence = confidenceOf(v);
  return v;
}

export type DecodeVinResult = DecodeResult;

export async function decodeVin(rawVin: string): Promise<DecodeResult> {
  const bd = decodeVinPositions(rawVin);
  if (!bd.valid) return { ok: false, error: bd.error ?? "Could not decode this VIN." };

  // Ask vPIC for North-American-layout VINs, and for any VIN the local rules could not name a model for.
  const nh = nhtsaUseful(bd.vin) || !bd.summary.model ? await fetchNhtsa(bd.vin) : null;
  const vehicle = vehicleFromBreakdown(bd, nh);

  if (!vehicle.make && !bd.summary.country) {
    return { ok: false, error: "This VIN's manufacturer code is not recognised.", breakdown: bd };
  }
  return { ok: true, vehicle, breakdown: bd };
}
