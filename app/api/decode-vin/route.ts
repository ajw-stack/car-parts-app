import { NextRequest, NextResponse } from "next/server";
import { decodeVin } from "../../lib/vinDecoder";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin")?.trim().toUpperCase();
  if (!vin || vin.length !== 17) {
    return NextResponse.json({ ok: false, error: "A valid 17-character VIN is required." }, { status: 400 });
  }
  return NextResponse.json(await decodeVin(vin));
}
