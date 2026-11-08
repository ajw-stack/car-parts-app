"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabaseClient";
import { PLAN, SUPPORT_EMAIL } from "../lib/billing/config";

// Computed once per page load (module scope, not during render) so the lint purity rule is satisfied.
const TRIAL_ENDS_ON = new Date(Date.now() + PLAN.trialDays * 86_400_000)
  .toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "long" });

function PricingBody() {
  const trialEndsOn = TRIAL_ENDS_ON;
  const params = useSearchParams();
  const cancelled = params.get("checkout") === "cancelled";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  async function startTrial(skipTrial = false) {
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { location.href = `/signup?next=${encodeURIComponent("/pricing")}`; return; }
    setBusy(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ skipTrial }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.url) { setError(data.error ?? "Could not start checkout."); return; }
    location.href = data.url;
  }

  return (
    <main className="flex-1">
      <section className="bg-[#02070d] px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">VIN Decoder subscription</h1>
        <p className="mt-2 text-sm text-white/50">One plan. Try it free for {PLAN.trialDays} days.</p>
      </section>

      <section className="mx-auto max-w-md px-4 py-10">
        {cancelled && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Checkout was cancelled. Nothing has been charged.
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-[#02070d] px-6 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Monthly</p>
            <p className="mt-2 text-4xl font-bold text-white">{PLAN.priceLabel}<span className="text-base font-normal text-white/50"> / month</span></p>
            <p className="mt-1 text-xs text-white/50">Billed monthly in Australian dollars. Cancel any time.</p>
          </div>

          <ul className="px-6 py-5 space-y-2 text-sm text-[#111827]">
            <li>✓ Up to {PLAN.monthlyDecodes} VIN decodes a month</li>
            <li>✓ Australian-market decoding</li>
            <li>✓ {PLAN.trialDays}-day free trial with {PLAN.trialDecodes} decodes included</li>
            <li>✓ Cancel from your account page in two clicks</li>
          </ul>

          <div className="px-6 pb-6">
            <button
              onClick={() => startTrial(false)}
              disabled={busy || signedIn === null}
              className="w-full rounded-xl bg-[#CC0000] px-4 py-3 text-sm font-semibold text-white hover:bg-[#aa0000] disabled:opacity-40 transition-colors"
            >
              {busy ? "Opening checkout…" : signedIn ? `Start my ${PLAN.trialDays}-day free trial` : "Create an account to start the trial"}
            </button>

            {signedIn && (
              <button
                onClick={() => startTrial(true)}
                disabled={busy}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#111827] hover:border-gray-400 disabled:opacity-40 transition-colors"
              >
                Skip the trial and subscribe now
              </button>
            )}

            {/* Auto-renewal disclosure: shown before the card is collected (ACCC guidance). */}
            <p className="mt-4 text-xs text-gray-600 leading-relaxed">
              <strong>How the trial works.</strong> You add a card today and nothing is charged for {PLAN.trialDays} days.
              Your trial ends on <strong suppressHydrationWarning>{trialEndsOn}</strong> and your subscription then starts automatically at {PLAN.priceLabel} a month,
              unless you cancel first from your account page. You will get an email with the trial end date when you sign up.
              If you skip the trial, {PLAN.priceLabel} is charged today and your {PLAN.monthlyDecodes} decodes a month start straight away.
              If you are charged and did not mean to continue, email {SUPPORT_EMAIL} within {PLAN.refundDays} days for a full refund.
            </p>

            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          <a href="/terms" className="underline">Terms</a> · <a href="/refunds" className="underline">Refunds</a> · <a href="/privacy" className="underline">Privacy</a>
        </p>
      </section>
    </main>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <Suspense fallback={null}>
        <PricingBody />
      </Suspense>
      <Footer />
    </div>
  );
}
