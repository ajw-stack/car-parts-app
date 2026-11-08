"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

/** Client-side check used only to decide what to SHOW. The database and API enforce access. */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (active) setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (active) setIsAdmin(data?.role === "admin");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return isAdmin;
}
