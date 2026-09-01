import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Verify the calling session is an admin
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

// GET — list all capture users
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("role", "capture");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(p.id);
      return { id: p.id, email: user?.email ?? "unknown", role: p.role };
    })
  );

  return NextResponse.json({ users });
}

// POST — create a new capture user
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("profiles").upsert({
    id: data.user.id,
    role: "capture",
  });

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
}

// DELETE — remove a capture user
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  // Verify target is capture role before deleting
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (profile?.role !== "capture") {
    return NextResponse.json({ error: "Can only delete capture users" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
