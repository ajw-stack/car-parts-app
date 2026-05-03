import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { decodeVin } from "../../../lib/vinDecoder";
import { vinFingerprint } from "../../../lib/vinFingerprint";
import type { DecodeResult } from "../../../lib/vin/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin")?.trim().toUpperCase();
  if (!vin || vin.length !== 17) {
    return NextResponse.json<DecodeResult>({ ok: false, error: "A valid 17-character VIN is required." }, { status: 400 });
  }

  const fp = vinFingerprint(vin);

  // Cache read
  const { data: cached } = await supabaseServer
    .from("vehicle_patterns")
    .select("raw_json, hit_count")
    .eq("fingerprint", fp)
    .maybeSingle();

  if (cached?.raw_json) {
    supabaseServer
      .from("vehicle_patterns")
      .update({ hit_count: (cached.hit_count ?? 1) + 1, updated_at: new Date().toISOString() })
      .eq("fingerprint", fp)
      .then(() => {});

    return NextResponse.json<DecodeResult>({ ok: true, vehicle: { ...cached.raw_json, vin } });
  }

  // Cache miss — decode via NHTSA
  const result = await decodeVin(vin);
  if (!result.ok || !result.vehicle) {
    return NextResponse.json<DecodeResult>({ ok: false, error: result.error }, { status: 422 });
  }

  // Store in patterns cache (fire-and-forget)
  supabaseServer
    .from("vehicle_patterns")
    .upsert(
      { fingerprint: fp, vin_sample: vin, make: result.vehicle.make, model: result.vehicle.model, year: result.vehicle.year ? String(result.vehicle.year) : null, raw_json: result.vehicle },
      { onConflict: "fingerprint" },
    )
    .then(() => {});

  return NextResponse.json<DecodeResult>(result);
}
