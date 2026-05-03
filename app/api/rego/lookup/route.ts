import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { brokerLookup } from "../../../lib/broker";
import { decodeVin } from "../../../lib/vinDecoder";
import { vinFingerprint } from "../../../lib/vinFingerprint";
import type { RegoLookupResult } from "../../../lib/rego/types";

export const dynamic = "force-dynamic";

async function decodeAndCache(vin: string) {
  const fp = vinFingerprint(vin);
  const { data: pattern } = await supabaseServer
    .from("vehicle_patterns").select("raw_json").eq("fingerprint", fp).maybeSingle();

  if (pattern?.raw_json) return { ok: true, vehicle: { ...pattern.raw_json, vin } };

  const result = await decodeVin(vin);
  if (result.ok && result.vehicle) {
    supabaseServer.from("vehicle_patterns").upsert(
      { fingerprint: fp, vin_sample: vin, make: result.vehicle.make, model: result.vehicle.model, year: result.vehicle.year ? String(result.vehicle.year) : null, raw_json: result.vehicle },
      { onConflict: "fingerprint" },
    ).then(() => {});
  }
  return result;
}

export async function GET(req: NextRequest) {
  const rego  = req.nextUrl.searchParams.get("rego")?.trim().toUpperCase();
  const state = req.nextUrl.searchParams.get("state")?.trim().toUpperCase();

  if (!rego || !state) {
    return NextResponse.json<RegoLookupResult>({ ok: false, error: "rego and state are required." }, { status: 400 });
  }

  // 1. Community cache
  const { data: cached } = await supabaseServer
    .from("rego_vin_cache").select("vin").eq("state", state).eq("rego", rego)
    .gte("confirmed_count", 1).order("confirmed_count", { ascending: false }).limit(1).maybeSingle();

  if (cached?.vin) {
    supabaseServer.from("rego_vin_cache")
      .update({ last_seen: new Date().toISOString() })
      .eq("state", state).eq("rego", rego).eq("vin", cached.vin).then(() => {});

    const decoded = await decodeAndCache(cached.vin as string);
    if (decoded.ok) {
      return NextResponse.json<RegoLookupResult>({ ok: true, source: "community_cache", vehicle: decoded.vehicle });
    }
    return NextResponse.json<RegoLookupResult>({ ok: true, source: "community_cache", warning: "VIN found but could not decode vehicle details." });
  }

  // 2. Broker stub
  const broker = await brokerLookup(rego, state);
  if (broker?.vin) {
    const decoded = await decodeAndCache(broker.vin);
    if (decoded.ok) {
      return NextResponse.json<RegoLookupResult>({ ok: true, source: "broker_api", vehicle: decoded.vehicle });
    }
  }

  // 3. Cache miss — ask user for VIN
  return NextResponse.json<RegoLookupResult>({ ok: true, needsManualVin: true });
}
