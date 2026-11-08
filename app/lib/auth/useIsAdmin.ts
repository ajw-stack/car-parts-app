"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// One role lookup per page load, shared by every component that asks.
let cached: Promise<boolean> | null = null;
const FLAG = "elroco_admin_cookie";

async function lookup(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Signed out: drop the admin cookie if this tab had set one.
    try {
      if (sessionStorage.getItem(FLAG)) { sessionStorage.removeItem(FLAG); await fetch("/api/admin/session", { method: "DELETE" }); }
    } catch { /* storage unavailable */ }
    return false;
  }
  const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  const admin = data?.role === "admin";
  if (admin) {
    let already = false;
    try { already = !!sessionStorage.getItem(FLAG); } catch { /* ignore */ }
    if (!already) {
      const res = await fetch("/api/admin/session", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        try { sessionStorage.setItem(FLAG, "1"); } catch { /* ignore */ }
        // The home page was served as the coming-soon page before the cookie existed.
        if (location.pathname === "/") location.reload();
      }
    }
  }
  return admin;
}

/**
 * Client-side admin check, used to decide what to SHOW and to open the coming-soon gate
 * for the admin. The database (RLS) and the API routes enforce the actual access.
 */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    if (!cached) cached = lookup();
    cached.then((v) => { if (active) setIsAdmin(v); });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        cached = lookup();
        cached.then((v) => { if (active) setIsAdmin(v); });
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return isAdmin;
}

/** True when the public coming-soon gate applies to this viewer (everyone except admins). */
export function useGated(comingSoon: boolean): boolean {
  const admin = useIsAdmin();
  return comingSoon && admin !== true;
}
