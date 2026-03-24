import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin")?.trim().toUpperCase();

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: "A valid 17-character VIN is required." }, { status: 400 });
  }

  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "NHTSA API unavailable. Please try again." }, { status: 502 });
  }

  const data = await res.json();
  const r = data?.Results?.[0];

  if (!r) {
    return NextResponse.json({ error: "No result returned for this VIN." }, { status: 404 });
  }

  // Non-zero error codes indicate a problem
  const errorCode = parseInt(r.ErrorCode ?? "0", 10);
  if (errorCode !== 0 && errorCode !== 1) {
    return NextResponse.json({ error: r.ErrorText || "VIN could not be decoded." }, { status: 422 });
  }

  const val = (key: string) => {
    const v = r[key];
    return v && v !== "0" && v.trim() !== "" ? v.trim() : null;
  };

  return NextResponse.json({
    vin: vin,
    year: val("ModelYear"),
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
    errorText: errorCode === 1 ? r.ErrorText : null, // code 1 = partial decode
  });
}
