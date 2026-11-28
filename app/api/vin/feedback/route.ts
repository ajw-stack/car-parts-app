import { NextRequest, NextResponse } from "next/server";
import { decodeVinPositions } from "../../../lib/vin/engine";
import { getUserFromRequest, supabaseAdmin } from "../../../lib/billing/entitlement";

export const dynamic = "force-dynamic";

const FIELDS = new Set(["make", "model", "year", "engine", "body", "transmission", "drive", "plant", "trim", "other"]);
const DAILY_LIMIT = 20;
const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** POST: a signed-in user reports that a VIN decoded wrongly (or not at all). */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in to send a report." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }

  const vin = String(body.vin ?? "").trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return NextResponse.json({ ok: false, error: "A valid 17-character VIN is required." }, { status: 400 });
  }
  const wrong = Array.isArray(body.wrongFields) ? body.wrongFields.filter((f): f is string => typeof f === "string" && FIELDS.has(f)) : [];
  const row = {
    user_id: user.id,
    vin,
    wrong_fields: wrong,
    correct_make: clip(body.correctMake, 60),
    correct_model: clip(body.correctModel, 120),
    correct_year: clip(body.correctYear, 10),
    correct_details: clip(body.correctDetails, 500),
    evidence: clip(body.evidence, 60),
    comment: clip(body.comment, 2000),
  };
  if (!wrong.length && !row.correct_make && !row.correct_model && !row.correct_details && !row.comment) {
    return NextResponse.json({ ok: false, error: "Tell us what is wrong or what the vehicle actually is." }, { status: 400 });
  }

  // Simple abuse guard: at most DAILY_LIMIT reports per user per 24 hours.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabaseAdmin.from("vin_feedback").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ ok: false, error: "Thanks — you've sent a lot of reports today. Please try again tomorrow." }, { status: 429 });
  }

  // Store what OUR decoder says for this VIN right now (never trust the client's copy).
  const b = decodeVinPositions(vin);
  const decoded = { valid: b.valid, summary: b.summary };

  const { error } = await supabaseAdmin.from("vin_feedback").insert({ ...row, decoded });
  if (error) return NextResponse.json({ ok: false, error: "Could not save the report. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
