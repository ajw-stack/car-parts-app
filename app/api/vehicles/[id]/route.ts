import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowed: Record<string, unknown> = {};
  if ("image_urls"             in body) allowed.image_urls             = body.image_urls             ?? null;
  if ("manufacturer_code"      in body) allowed.manufacturer_code      = body.manufacturer_code      ?? null;
  if ("seats"                  in body) allowed.seats                  = body.seats                  ?? null;
  if ("doors"                  in body) allowed.doors                  = body.doors                  ?? null;
  if ("transmission_speeds"    in body) allowed.transmission_speeds    = body.transmission_speeds    ?? null;
  if ("drive_train"            in body) allowed.drive_train            = body.drive_train            ?? null;
  if ("transmission"           in body) allowed.transmission           = body.transmission           ?? null;
  if ("country_of_manufacture" in body) allowed.country_of_manufacture = body.country_of_manufacture ?? null;
  if ("engine_valves"          in body) allowed.engine_valves          = body.engine_valves          ?? null;
  if ("camshaft_setup"         in body) allowed.camshaft_setup         = body.camshaft_setup         ?? null;
  if ("fuel_delivery"          in body) allowed.fuel_delivery          = body.fuel_delivery          ?? null;
  if ("specs"                  in body) allowed.specs                  = body.specs                  ?? null;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("vehicles")
    .update(allowed)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
