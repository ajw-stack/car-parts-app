import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../lib/billing/stripe";
import { getUserFromRequest, getSubscriptionRow } from "../../../lib/billing/entitlement";
import { SITE_URL } from "../../../lib/billing/config";

export const dynamic = "force-dynamic";

/** POST /api/billing/portal -> { url } for the Stripe customer portal (update card, cancel, invoices). */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const row = await getSubscriptionRow(user.id);
  if (!row?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet. Start a subscription from the pricing page." }, { status: 404 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${SITE_URL}/account`,
  });
  return NextResponse.json({ url: session.url });
}
