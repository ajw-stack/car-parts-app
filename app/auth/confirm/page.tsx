"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";

/**
 * Landing page for the sign-up confirmation email. The email links here on elroco.com.au
 * (not to supabase.co) so the link domain matches the sender, which keeps mail filters happy.
 * Link: /auth/confirm?token_hash=...&type=email&next=/pricing
 */
function Confirm() {
  const params = useSearchParams();
  const [state, setState] = useState<"working" | "failed">(params.get("token_hash") ? "working" : "failed");

  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const type = (params.get("type") ?? "email") as "email" | "signup" | "invite" | "magiclink" | "email_change";
    const next = params.get("next") ?? "/pricing";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/pricing";
    if (!tokenHash) return;
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) { setState("failed"); return; }
      location.replace(safeNext);
    });
  }, [params]);

  return (
    <div className="w-full max-w-sm text-center">
      {state === "working" ? (
        <p className="text-sm text-gray-600">Confirming your email…</p>
      ) : (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-black">Link expired</h1>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This confirmation link has expired or has already been used. If your email is already confirmed you can
            sign in now.
          </div>
          <a href="/login" className="inline-block rounded-xl bg-[#02070d] px-5 py-3 text-sm font-semibold text-white">
            Go to sign in
          </a>
        </div>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense fallback={null}>
          <Confirm />
        </Suspense>
      </main>
    </div>
  );
}
