import { NextRequest, NextResponse } from "next/server";
import { findByVin, getVehicle, extractRbc, normaliseVehicle } from "../../lib/redbook";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin")?.trim().toUpperCase();

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: "A valid 17-character VIN is required." }, { status: 400 });
  }

  if (!process.env.REDBOOK_API_KEY) {
    return NextResponse.json({ error: "Redbook API not configured." }, { status: 503 });
  }

  try {
    const match = await findByVin(vin);
    if (!match) {
      return NextResponse.json({ error: "Vehicle not found for this VIN." }, { status: 404 });
    }

    const rbc = extractRbc(match);
    const detail = rbc ? await getVehicle(rbc) : null;
    const vehicle = normaliseVehicle(detail ?? match);

    return NextResponse.json(vehicle);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Redbook lookup failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
