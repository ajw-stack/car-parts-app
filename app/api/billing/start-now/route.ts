import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../lib/billing/stripe";
import { getUserFromRequest, getSubscriptionRow } from "../../../lib/billing/entitlement";
import { upsertSubscription } from "../../../lib/billing/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/start-now  (Authorization: Bearer <supabase access token>)
 * Ends a trial early: Stripe charges the first month today and the subscription becomes
 * active, so the full monthly allowance applies from now. The row is synced here as well
 * as by the webhook so the next decode sees the new state at once.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const row = await getSubscriptionRow(user.id);
  if (!row?.stripe_subscription_id || row.status !== "trialing") {
    return NextResponse.json({ error: "There is no trial to end on this account." }, { status: 409 });
  }

  try {
    const sub = await stripe().subscriptions.update(row.stripe_subscription_id, {
      trial_end: "now",
      cancel_at: "",   // asking to pay now also undoes a cancellation made during the trial
      proration_behavior: "none",
      payment_behavior: "error_if_incomplete",
    });
    await upsertSubscription(sub, user.id);
    return NextResponse.json({ ok: true, status: sub.status });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? "";
    console.error("start-now failed", msg);
    return NextResponse.json(
      { error: "Your card could not be charged, so the trial is still running. Update your card from the account page and try again." },
      { status: 402 },
    );
  }
}
