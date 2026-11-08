"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabaseClient";
import { PLAN, SUPPORT_EMAIL } from "../lib/billing/config";

type Status = {
  signedIn: boolean;
  email: string | null;
  status: string;
  entitled: boolean;
  reason: string;
  trialEnd: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialUsed: boolean;
  usage: { trialUsed: number; trialLimit: number; monthUsed: number; monthLimit: number; dayUsed: number; dayLimit: number };
  message: string;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "long", year: "numeric" }) : "—";

function AccountBody() {
  const router = useRouter();
  const params = useSearchParams();
  const justSubscribed = params.get("checkout") === "success";
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the billing status. After checkout the Stripe webhook can land a second or two
  // after the redirect, so keep polling briefly until the row appears.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace(`/login?next=${encodeURIComponent("/account")}`); return; }
      const res = await fetch("/api/billing/status", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const s = (await res.json()) as Status;
      if (cancelled) return;
      setStatus(s);
      if (justSubscribed && s.status === "none" && tries++ < 10) setTimeout(run, 2000);
    };
    run();
    return () => { cancelled = true; };
  }, [router, justSubscribed]);

  async function openPortal() {
    setError(null); setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/billing/portal", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.url) { setError(data.error ?? "Could not open billing."); return; }
    location.href = data.url;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!status) return <main className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading…</main>;

  const s = status;
  const active = s.status === "trialing" || s.status === "active";
  const label: Record<string, string> = {
    none: "No subscription", trialing: "Free trial", active: "Active", past_due: "Payment failed",
    unpaid: "Payment failed", canceled: "Cancelled", incomplete: "Incomplete", incomplete_expired: "Expired",
    paused: "Paused", blocked: "Trial not available",
  };

  return (
    <main className="flex-1">
      <section className="bg-[#02070d] px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Your account</h1>
        <p className="mt-2 text-sm text-white/50">{s.email}</p>
      </section>

      <section className="mx-auto max-w-md px-4 py-10 space-y-4">
        {justSubscribed && active && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            You&apos;re in. {s.status === "trialing" ? `Your trial runs until ${fmt(s.trialEnd)}.` : "Your subscription is active."}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#111827]">Subscription</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
              {label[s.status] ?? s.status}
            </span>
          </div>

          <dl className="px-6 py-4 grid grid-cols-2 gap-y-3 text-sm">
            {s.status === "trialing" && (<>
              <dt className="text-gray-500">Trial ends</dt><dd className="text-[#111827] font-medium">{fmt(s.trialEnd)}</dd>
              <dt className="text-gray-500">Trial decodes</dt><dd className="text-[#111827] font-medium">{s.usage.trialUsed} of {s.usage.trialLimit} used</dd>
              <dt className="text-gray-500">Then</dt><dd className="text-[#111827] font-medium">{PLAN.priceLabel} / month{s.cancelAtPeriodEnd ? " (cancelled, will not charge)" : ""}</dd>
            </>)}
            {s.status === "active" && (<>
              <dt className="text-gray-500">{s.cancelAtPeriodEnd ? "Access until" : "Next renewal"}</dt><dd className="text-[#111827] font-medium">{fmt(s.periodEnd)}</dd>
              <dt className="text-gray-500">Decodes this period</dt><dd className="text-[#111827] font-medium">{s.usage.monthUsed} of {s.usage.monthLimit}</dd>
            </>)}
            {!active && s.message && (
              <dd className="col-span-2 text-gray-700">{s.message}</dd>
            )}
          </dl>

          <div className="px-6 pb-6 flex flex-col gap-2">
            {active || s.status === "past_due" || s.status === "unpaid" || s.status === "canceled" ? (
              <button onClick={openPortal} disabled={busy} className="w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] disabled:opacity-40 transition-colors">
                {busy ? "Opening…" : "Manage billing (update card, invoices, cancel)"}
              </button>
            ) : null}
            {!active && s.status !== "blocked" && (
              <a href="/pricing" className="w-full text-center rounded-xl bg-[#CC0000] px-4 py-3 text-sm font-semibold text-white hover:bg-[#aa0000] transition-colors">
                {s.trialUsed ? "Restart subscription" : `Start ${PLAN.trialDays}-day free trial`}
              </a>
            )}
            <a href="/decode" className="w-full text-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#111827] hover:border-gray-400 transition-colors">
              Open the VIN decoder
            </a>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Need help or a refund? Email {SUPPORT_EMAIL}. ·{" "}
          <button onClick={signOut} className="underline">Sign out</button>
        </p>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <Suspense fallback={null}>
        <AccountBody />
      </Suspense>
      <Footer />
    </div>
  );
}
