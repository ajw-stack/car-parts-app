import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, subscriptionPeriod, tsToIso } from "../../../lib/billing/stripe";
import { supabaseAdmin } from "../../../lib/billing/entitlement";
import { upsertSubscription } from "../../../lib/billing/sync";
import { sendEmail, subscriptionActiveEmail, trialStartedEmail } from "../../../lib/billing/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook  (Stripe -> us). Verifies the signature, then mirrors the
 * subscription into public.subscriptions. Events to enable on the Stripe endpoint:
 *   checkout.session.completed, customer.subscription.created, customer.subscription.updated,
 *   customer.subscription.deleted, customer.subscription.trial_will_end, invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const sub = await stripe().subscriptions.retrieve(session.subscription as string, { expand: ["default_payment_method"] });
        const userId = session.client_reference_id ?? session.metadata?.user_id ?? sub.metadata?.user_id ?? null;
        await upsertSubscription(sub, userId);
        if (userId && sub.status === "trialing") {
          const blocked = await enforceOneTrialPerCard(sub, userId);
          if (!blocked) {
            const email = session.customer_details?.email ?? session.customer_email;
            if (email) { const m = trialStartedEmail(tsToIso(sub.trial_end)); await sendEmail(email, m.subject, m.text); }
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const sub = event.data.object as Stripe.Subscription;
        const prev = (event.data.previous_attributes ?? {}) as Partial<Stripe.Subscription>;
        const userId = await upsertSubscription(sub, sub.metadata?.user_id ?? null);
        // Trial -> paid conversion: confirm by email.
        if (event.type === "customer.subscription.updated" && prev.status === "trialing" && sub.status === "active" && userId) {
          const email = await userEmail(userId);
          if (email) { const m = subscriptionActiveEmail(tsToIso(subscriptionPeriod(sub).end)); await sendEmail(email, m.subject, m.text); }
        }
        break;
      }
      case "customer.subscription.trial_will_end":
        // Fires 3 days before the trial ends, i.e. at creation for a 2-day trial. The enrolment
        // email already went out on checkout.session.completed, so nothing more to do.
        break;
      case "invoice.payment_failed":
        // The status moves to past_due through customer.subscription.updated.
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("webhook handler error", event.type, e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function userEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}


/**
 * One free trial per card. Records the card fingerprint; if another account already used
 * this card for a trial, the new subscription is cancelled at once. Returns true if blocked.
 */
async function enforceOneTrialPerCard(sub: Stripe.Subscription, userId: string): Promise<boolean> {
  const pm = sub.default_payment_method;
  const fingerprint = pm && typeof pm !== "string" ? pm.card?.fingerprint ?? null : null;
  if (!fingerprint) return false;

  const { data: prior } = await supabaseAdmin.from("trial_cards").select("user_id").eq("fingerprint", fingerprint).maybeSingle();
  if (!prior) {
    await supabaseAdmin.from("trial_cards").insert({ fingerprint, user_id: userId });
    return false;
  }
  if (prior.user_id === userId) return false;

  await stripe().subscriptions.cancel(sub.id, { prorate: false });
  await supabaseAdmin.from("subscriptions").update({
    status: "blocked",
    note: "Trial cancelled: this card has already been used for a free trial on another account.",
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return true;
}
