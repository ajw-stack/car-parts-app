import { NextRequest, NextResponse } from "next/server";
import { stripe, stripePriceId } from "../../../lib/billing/stripe";
import { getUserFromRequest, getSubscriptionRow, supabaseAdmin } from "../../../lib/billing/entitlement";
import { ENTITLED_STATUSES, PLAN, SITE_URL } from "../../../lib/billing/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/checkout  (Authorization: Bearer <supabase access token>)
 * Creates a Stripe Checkout session for the monthly plan with a card-up-front trial,
 * or without the trial when the body is { "skipTrial": true }.
 * Returns { url } for the browser to redirect to.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const row = await getSubscriptionRow(user.id);
  if (row && ENTITLED_STATUSES.has(row.status)) {
    return NextResponse.json({ error: "You already have an active subscription. Manage it from the account page." }, { status: 409 });
  }
  if (row?.status === "blocked") {
    return NextResponse.json({ error: "This account cannot start a trial. Email support if you think that is wrong." }, { status: 403 });
  }

  const s = stripe();

  // Reuse the Stripe customer if we have one, otherwise create it and remember it.
  let customerId = row?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await supabaseAdmin.from("subscriptions").upsert(
      { user_id: user.id, stripe_customer_id: customerId, status: row?.status ?? "none", updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  }

  // One trial per account: a returning subscriber pays from day one. A new subscriber may
  // also choose to skip the trial and pay today ({ "skipTrial": true }).
  const body = (await req.json().catch(() => ({}))) as { skipTrial?: boolean };
  const giveTrial = !row?.trial_used && !body.skipTrial;
  const submitText = giveTrial
    ? `Your ${PLAN.trialDays}-day free trial starts today and includes ${PLAN.trialDecodes} decodes. ${PLAN.priceLabel} per month is charged automatically when the trial ends unless you cancel first from your account page.`
    : `${PLAN.priceLabel} per month, charged today and then monthly until you cancel from your account page.`;

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: stripePriceId(), quantity: 1 }],
    // Cards only: BECS and other methods are switched off in the Stripe Dashboard payment-method settings.
    payment_method_collection: "always",
    allow_promotion_codes: false,
    subscription_data: {
      metadata: { user_id: user.id },
      ...(giveTrial
        ? { trial_period_days: PLAN.trialDays, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
        : {}),
    },
    custom_text: {
      submit: { message: submitText },
      terms_of_service_acceptance: { message: `I agree to the Elroco [terms of service](${SITE_URL}/terms) and [refund policy](${SITE_URL}/refunds).` },
    },
    consent_collection: { terms_of_service: "required" },
    success_url: `${SITE_URL}/account?checkout=success`,
    cancel_url: `${SITE_URL}/pricing?checkout=cancelled`,
    metadata: { user_id: user.id, trial: giveTrial ? "1" : "0" },
  });

  return NextResponse.json({ url: session.url });
}
