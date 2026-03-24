import { NextRequest, NextResponse } from "next/server";
import { findByRego, getVehicle, extractRbc, normaliseVehicle } from "../../lib/redbook";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state")?.trim();
  const rego  = req.nextUrl.searchParams.get("rego")?.trim().toUpperCase();

  if (!state || !rego) {
    return NextResponse.json({ error: "state and rego are required." }, { status: 400 });
  }

  if (!process.env.REDBOOK_API_KEY) {
    return NextResponse.json({ error: "Redbook API not configured." }, { status: 503 });
  }

  try {
    const match = await findByRego(state, rego);
    if (!match) {
      return NextResponse.json({ error: "Vehicle not found for this registration." }, { status: 404 });
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
