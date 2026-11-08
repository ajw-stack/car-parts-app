import { PLAN, SITE_URL, SUPPORT_EMAIL } from "./config";

/**
 * Transactional email via Resend's HTTP API (no SDK). Optional: when RESEND_API_KEY is
 * unset the message is logged and skipped, so the webhook never fails on email.
 * The sending domain must be verified in Resend for the from-address to work.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `Elroco <${SUPPORT_EMAIL}>`;
  if (!key) {
    console.log(`[email skipped: RESEND_API_KEY unset] to=${to} subject=${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "long", timeStyle: "short" }) : "the end of your trial";

/** Sent when a trial starts. Card-network rules require this notice at enrolment for trials under 7 days. */
export function trialStartedEmail(trialEnd: string | null) {
  return {
    subject: "Your Elroco VIN decoder trial has started",
    text: [
      `Thanks for trying the Elroco VIN decoder.`,
      ``,
      `Your free trial runs for ${PLAN.trialDays} days and includes ${PLAN.trialDecodes} VIN decodes.`,
      `It ends on ${fmtDate(trialEnd)} (Melbourne time).`,
      ``,
      `When the trial ends your subscription starts automatically and your card is charged ${PLAN.priceLabel} per month`,
      `for up to ${PLAN.monthlyDecodes} decodes a month. You can cancel at any time before then and pay nothing:`,
      `${SITE_URL}/account  ->  Manage billing  ->  Cancel plan`,
      ``,
      `Questions: ${SUPPORT_EMAIL}`,
      `Elroco`,
    ].join("\n"),
  };
}

/** Sent when a subscription converts from trial to paid. */
export function subscriptionActiveEmail(periodEnd: string | null) {
  return {
    subject: "Your Elroco subscription is active",
    text: [
      `Your Elroco VIN decoder subscription is active.`,
      `Plan: ${PLAN.priceLabel} per month, up to ${PLAN.monthlyDecodes} decodes a month.`,
      `Next renewal: ${fmtDate(periodEnd)}.`,
      ``,
      `Manage or cancel any time: ${SITE_URL}/account`,
      `Questions: ${SUPPORT_EMAIL}`,
      `Elroco`,
    ].join("\n"),
  };
}
