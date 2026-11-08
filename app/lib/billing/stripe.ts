import Stripe from "stripe";

let client: Stripe | null = null;

/** Server-only Stripe client. Built lazily so a missing key fails at call time, not at import. */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key, { typescript: true });
  return client;
}

export function stripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRICE_ID is not set");
  return id;
}

/** Newer Stripe API versions keep the period dates on the subscription item, older ones on the subscription. */
export function subscriptionPeriod(sub: Stripe.Subscription): { start: number | null; end: number | null } {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number }) | undefined;
  const legacy = sub as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
  return {
    start: item?.current_period_start ?? legacy.current_period_start ?? null,
    end: item?.current_period_end ?? legacy.current_period_end ?? null,
  };
}

export const tsToIso = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toISOString() : null);
