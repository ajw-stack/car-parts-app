import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/**
 * True only when the request carries a valid Supabase session whose profile role is
 * "admin". Signing in is not enough: since the VIN subscription launch anyone can
 * create an account.
 */
export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!user) return false;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}
