import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { decodeVin } from "../../../lib/vinDecoder";
import { vinFingerprint } from "../../../lib/vinFingerprint";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { rego?: string; state?: string; vin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const rego  = body.rego?.trim().toUpperCase();
  const state = body.state?.trim().toUpperCase();
  const vin   = body.vin?.trim().toUpperCase();

  if (!rego || !state || !vin || vin.length !== 17) {
    return NextResponse.json(
      { ok: false, error: "rego, state, and a valid 17-character vin are required." },
      { status: 400 },
    );
  }

  // Atomic upsert + increment via RPC
  await supabaseServer.rpc("increment_rego_confirmed_count", {
    p_state: state,
    p_rego: rego,
    p_vin: vin,
  });

  // Pre-populate vehicle_patterns if not already cached (fire-and-forget)
  const fp = vinFingerprint(vin);
  supabaseServer
    .from("vehicle_patterns")
    .select("fingerprint")
    .eq("fingerprint", fp)
    .maybeSingle()
    .then(async ({ data }) => {
      if (!data) {
        const decoded = await decodeVin(vin);
        if (decoded.ok && decoded.vehicle) {
          await supabaseServer.from("vehicle_patterns").upsert(
            {
              fingerprint: fp,
              vin_sample: vin,
              make: decoded.vehicle.make,
              model: decoded.vehicle.model,
              year: decoded.vehicle.year ? String(decoded.vehicle.year) : null,
              raw_json: decoded.vehicle,
            },
            { onConflict: "fingerprint" },
          );
        }
      }
    });

  return NextResponse.json({ ok: true });
}
