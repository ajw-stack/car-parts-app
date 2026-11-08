import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ENTITLED_STATUSES, PLAN, SUPPORT_EMAIL } from "./config";

/** Service-role client: bypasses RLS. Server only. */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_used: boolean;
  note: string | null;
  updated_at: string;
};

export type BillingReason =
  | "ok" | "not_signed_in" | "no_subscription" | "subscription_inactive"
  | "trial_limit" | "daily_limit" | "monthly_limit";

export type BillingStatus = {
  signedIn: boolean;
  email: string | null;
  status: string;            // none | trialing | active | past_due | canceled | blocked | ...
  entitled: boolean;         // may decode right now (subscription ok AND under the limits)
  reason: BillingReason;
  trialEnd: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialUsed: boolean;
  usage: {
    trialUsed: number; trialLimit: number;
    monthUsed: number; monthLimit: number;
    dayUsed: number; dayLimit: number;
  };
};

/** Resolve the Supabase user from an `Authorization: Bearer <access_token>` header. */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getSubscriptionRow(userId: string): Promise<SubscriptionRow | null> {
  const { data } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

function melbourneParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

/** UTC instant of the most recent midnight in Melbourne. */
export function melbourneMidnightUtc(now = new Date()): Date {
  const p = melbourneParts(now);
  const localAsUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  const offsetMs = localAsUtc - now.getTime();
  return new Date(Date.UTC(p.y, p.m - 1, p.d) - offsetMs);
}

/** UTC instant of the first midnight of the current month in Melbourne (fallback window before Stripe sets a period). */
export function melbourneMonthStartUtc(now = new Date()): Date {
  const p = melbourneParts(now);
  return new Date(melbourneMidnightUtc(now).getTime() - (p.d - 1) * 86_400_000);
}

async function countUsageSince(userId: string, since: Date): Promise<number> {
  const { count } = await supabaseAdmin
    .from("decode_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/** Full billing picture for a user: subscription state plus usage against the limits. */
export async function getBillingStatus(user: User | null): Promise<BillingStatus> {
  const base: BillingStatus = {
    signedIn: !!user,
    email: user?.email ?? null,
    status: "none",
    entitled: false,
    reason: user ? "no_subscription" : "not_signed_in",
    trialEnd: null,
    periodEnd: null,
    cancelAtPeriodEnd: false,
    trialUsed: false,
    usage: { trialUsed: 0, trialLimit: PLAN.trialDecodes, monthUsed: 0, monthLimit: PLAN.monthlyDecodes, dayUsed: 0, dayLimit: PLAN.dailyDecodes },
  };
  if (!user) return base;

  // Admins decode without a subscription or limits.
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    base.status = "admin";
    base.entitled = true;
    base.reason = "ok";
    return base;
  }

  const row = await getSubscriptionRow(user.id);
  if (!row) return base;

  base.status = row.status;
  base.trialEnd = row.trial_end;
  base.periodEnd = row.current_period_end;
  base.cancelAtPeriodEnd = row.cancel_at_period_end;
  base.trialUsed = row.trial_used;

  if (!ENTITLED_STATUSES.has(row.status)) {
    base.reason = row.status === "none" ? "no_subscription" : "subscription_inactive";
    return base;
  }

  const now = new Date();
  const periodStart = row.current_period_start ? new Date(row.current_period_start) : melbourneMonthStartUtc(now);
  const [monthUsed, dayUsed] = await Promise.all([
    countUsageSince(user.id, periodStart),
    countUsageSince(user.id, melbourneMidnightUtc(now)),
  ]);
  base.usage.monthUsed = monthUsed;
  base.usage.dayUsed = dayUsed;

  const inTrial = row.status === "trialing" && !!row.trial_end && new Date(row.trial_end) > now;
  if (inTrial) {
    const trialStart = row.trial_start ? new Date(row.trial_start) : periodStart;
    base.usage.trialUsed = await countUsageSince(user.id, trialStart);
    if (base.usage.trialUsed >= PLAN.trialDecodes) { base.reason = "trial_limit"; return base; }
  } else {
    if (dayUsed >= PLAN.dailyDecodes) { base.reason = "daily_limit"; return base; }
    if (monthUsed >= PLAN.monthlyDecodes) { base.reason = "monthly_limit"; return base; }
  }

  base.entitled = true;
  base.reason = "ok";
  return base;
}

/** Record one successful decode. */
export async function recordDecode(userId: string, vin: string): Promise<void> {
  await supabaseAdmin.from("decode_usage").insert({ user_id: userId, vin });
}

/** Human message for a non-entitled status, used by the API and the UI. */
export function reasonMessage(s: BillingStatus): string {
  switch (s.reason) {
    case "not_signed_in": return "Sign in to decode a VIN.";
    case "no_subscription": return "Start your 2-day trial to decode VINs.";
    case "subscription_inactive":
      if (s.status === "past_due" || s.status === "unpaid") return "Your last payment failed. Update your card from the account page to keep decoding.";
      if (s.status === "blocked") return `This card has already been used for a free trial. Email ${SUPPORT_EMAIL} if you think that is wrong.`;
      return "Your subscription has ended. Restart it from the pricing page.";
    case "trial_limit": return `You've used the ${PLAN.trialDecodes} decodes included in your trial. Your subscription starts automatically when the trial ends, or you can cancel from the account page.`;
    case "daily_limit": return `Daily limit reached (${PLAN.dailyDecodes}). It resets at midnight Melbourne time. Need more? Email ${SUPPORT_EMAIL}.`;
    case "monthly_limit": return `Monthly allowance used (${PLAN.monthlyDecodes}). It renews on your billing date. Need more? Email ${SUPPORT_EMAIL}.`;
    default: return "";
  }
}
