import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, signAdminCookie } from "../../../lib/auth/adminCookie";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/** POST (Bearer token): if the caller is an admin, set the signed admin cookie. */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ admin: false }, { status: 403 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get("Authorization")!.slice(7));
  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, await signAdminCookie(user!.id), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

/** DELETE: clear the admin cookie (sign-out). */
export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
