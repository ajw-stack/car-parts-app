import type Stripe from "stripe";
import { subscriptionPeriod, tsToIso } from "./stripe";
import { supabaseAdmin } from "./entitlement";

/** Mirror a Stripe subscription into public.subscriptions. Returns the user id it was filed under. */
export async function upsertSubscription(sub: Stripe.Subscription, userIdHint: string | null): Promise<string | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId = userIdHint;
  if (!userId) {
    const { data } = await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) { console.error("webhook: no user for customer", customerId); return null; }

  const { data: existing } = await supabaseAdmin.from("subscriptions").select("status, trial_used").eq("user_id", userId).maybeSingle();
  if (existing?.status === "blocked") return userId;   // never let a later event un-block a row

  const period = subscriptionPeriod(sub);
  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      trial_start: tsToIso(sub.trial_start),
      trial_end: tsToIso(sub.trial_end),
      current_period_start: tsToIso(period.start),
      current_period_end: tsToIso(period.end),
      // Newer Stripe API versions record a portal cancellation as cancel_at (a date), not cancel_at_period_end.
      cancel_at_period_end: !!sub.cancel_at_period_end || !!sub.cancel_at,
      trial_used: !!(existing?.trial_used || sub.trial_start),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return userId;
}
