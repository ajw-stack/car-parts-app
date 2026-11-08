// Subscription plan constants (user decisions 2026-10-14 and 2026-10-22).
// The entitlement is generic ("has an active or trialing subscription"); these
// numbers only shape the trial and the fair-use limits.

export const PLAN = {
  priceAud: 12.95,
  priceLabel: "A$12.95",
  interval: "month",
  trialDays: 2,
  trialDecodes: 3,       // decodes allowed during the trial
  monthlyDecodes: 100,   // advertised allowance per billing period
  dailyDecodes: 20,      // quiet burst cap, fair-use only (terms, not pricing page)
  refundDays: 7,
} as const;

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@elroco.com.au";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://elroco.com.au";

/** Subscription statuses that unlock the decoder. */
export const ENTITLED_STATUSES = new Set(["trialing", "active"]);

/** True while the public site is gated to the VIN decoder only. */
export const COMING_SOON = (process.env.NEXT_PUBLIC_COMING_SOON ?? "true") !== "false";
