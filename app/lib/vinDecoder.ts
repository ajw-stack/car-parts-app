import { lookupWMI } from "./wmi";
import type { DecodedVehicle, DecodeResult } from "./vin/types";

const CORE_FIELDS = ["Make","Model","ModelYear","BodyClass","EngineCylinders","FuelTypePrimary"] as const;

function scoreConfidence(row: Record<string, string>, val: (k: string) => string | null): "high" | "partial" | "low" {
  const filled = CORE_FIELDS.filter((f) => val(f)).length;
  if (filled >= 5) return "high";
  if (filled >= 3) return "partial";
  return "low";
}

// ─── Holden lookup tables ──────────────────────────────────────────────────────

const HOLDEN_MODEL: Record<string, string> = {
  E:"VE", F:"VF", Y:"VY", Z:"VZ",
  K:"Statesman/Caprice WK", L:"Statesman/Caprice WL",
  M:"Statesman/Caprice WM", N:"Caprice WN",
};
const HOLDEN_VARIANT: Record<string, string | Record<string, string>> = {
  K:{ Y:"Executive", Z:"SV6 / SV6000", E:"SV6 / SV8 / SS", F:"Executive / SS", default:"Executive" },
  L:"Berlina", X:"Calais", Z:"Caprice", Y:"Statesman", P:"SSV",
  C:"SS", B:"SV6", J:"Calais V", E:"SS V Redline", F:"HSV Maloo", A:"International",
};
const COMMODORE_CHARS = new Set(["E","F","Y","Z"]);
const HOLDEN_BODY: Record<string, string> = {
  "0":"Cab Chassis / 1 Tonne Ute","1":"2 Door Coupe","3":"4 Door Ute (Crewman)",
  "4":"Ute","5":"4 Door Sedan","8":"Wagon",
};
const HOLDEN_PLANT: Record<string, string> = { L:"Australia" };
const HOLDEN_FUEL: Record<string, string> = { E:"Petrol/E85", default:"Petrol" };

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

  const errorText = val("ErrorText");
  const confidence = scoreConfidence(r, val);
  const fatalCodes = (r.ErrorCode ?? "0").split(";")
    .map((s) => s.trim())
    .filter((c) => !["0","1","5","14","400"].includes(c));
  const isKnownAuWmi = vin.startsWith("6G1");
  if (fatalCodes.length > 0 && confidence === "low" && !isKnownAuWmi) {
    return { ok: false, error: errorText ?? "Could not decode this VIN." };
  }

  // Base fields
  const rawWmi = lookupWMI(vin);
  const wmiMake = rawWmi ? rawWmi.replace(/\s*\(.*?\)/g, "").replace(/\s*\/.*$/, "").trim() : null;

  let make        = val("Make") ?? wmiMake;
  let model       = val("Model");
  let trim        = val("Trim") ?? val("Series");
  let bodyClass   = val("BodyClass");
  let plantCountry = val("PlantCountry");
  let finalConfidence = confidence;

  // Holden overrides (WMI 6G1)
  if (vin.startsWith("6G1")) {
    make = "Holden";
    const mc = vin[3], vc = vin[4], bc = vin[5], pc = vin[10];

    if (mc && HOLDEN_MODEL[mc])  model = HOLDEN_MODEL[mc];
    if (vc && mc && COMMODORE_CHARS.has(mc)) {
      const entry = HOLDEN_VARIANT[vc];
      if (entry) {
        trim = typeof entry === "string"
          ? entry
          : ((entry as Record<string,string>)[mc] ?? (entry as Record<string,string>).default ?? trim);
      }
    }
    if (bc && HOLDEN_BODY[bc])    bodyClass    = HOLDEN_BODY[bc];
    if (pc && HOLDEN_PLANT[pc])   plantCountry = HOLDEN_PLANT[pc];

    // Holden data is reliable from our tables — upgrade confidence if we have model
    if (model) finalConfidence = "high";
  }

  const year = val("ModelYear") ? parseInt(val("ModelYear")!, 10) : null;

  const vehicle: DecodedVehicle = {
    vin,
    year,
    make,
    model,
    trim,
    bodyClass,
    engineCylinders:    val("EngineCylinders"),
    engineDisplacementL: val("DisplacementL"),
    fuelType:           val("FuelTypePrimary"),
    transmission:       val("TransmissionStyle"),
    driveType:          val("DriveType"),
    manufacturer:       val("Manufacturer"),
    plantCountry,
    source:             "nhtsa",
    confidence:         finalConfidence,
    rawErrors:          fatalCodes.length > 0 ? errorText : null,
  };

  return { ok: true, vehicle };
}
