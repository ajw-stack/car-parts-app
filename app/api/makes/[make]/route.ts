import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth/requireAdmin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ make: string }> }
) {
  // Admin role required, not just a login: anyone can create an account since the VIN launch.
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { make } = await params;
  const canonicalMake = decodeURIComponent(make);
  const body = await request.json();

  const { error } = await supabaseAdmin
    .from("makes")
    .upsert({ make: canonicalMake, logo_url: body.logo_url ?? null }, { onConflict: "make" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
