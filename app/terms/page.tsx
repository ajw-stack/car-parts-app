import Header from "../components/Header";
import Footer from "../components/Footer";
import { PLAN, SUPPORT_EMAIL } from "../lib/billing/config";

export const metadata = { title: "Terms of Service — Elroco" };

const UPDATED = "22 October 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 mx-auto max-w-2xl px-4 py-12 text-sm text-[#111827] leading-relaxed">
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-xs text-gray-500">Last updated {UPDATED}</p>

        <h2 className="mt-8 font-bold">1. Who we are</h2>
        <p>Elroco (&quot;we&quot;, &quot;us&quot;) provides the Elroco website and VIN decoder service (the &quot;Service&quot;). Contact: {SUPPORT_EMAIL}.</p>

        <h2 className="mt-6 font-bold">2. The Service</h2>
        <p>The VIN decoder returns vehicle details derived from a vehicle identification number using published manufacturer coding rules and public data. Results are provided for information. They may be incomplete or wrong for some vehicles, and they are not a substitute for a physical inspection, a registration check or a PPSR search. Always confirm critical details against the vehicle&apos;s compliance plate and official records before relying on them.</p>

        <h2 className="mt-6 font-bold">3. Accounts</h2>
        <p>You need an account to use the decoder. Keep your password private. You are responsible for activity under your account. One person per account; accounts may not be shared or resold.</p>

        <h2 className="mt-6 font-bold">4. Free trial and subscription</h2>
        <p>The subscription is {PLAN.priceLabel} per month (Australian dollars, GST not applicable). New subscribers receive a {PLAN.trialDays}-day free trial that includes {PLAN.trialDecodes} decodes. A payment card is required to start the trial. <strong>When the trial ends your subscription starts automatically and your card is charged {PLAN.priceLabel}, then the same amount each month, until you cancel.</strong> The trial end date is shown before you add your card, on your account page, and in the email we send when the trial starts. One free trial per person and per payment card.</p>

        <h2 className="mt-6 font-bold">5. Cancelling</h2>
        <p>You can cancel at any time from your account page (Manage billing, then Cancel plan). Cancelling during the trial means you are never charged. Cancelling after the trial stops future charges; access continues to the end of the period already paid.</p>

        <h2 className="mt-6 font-bold">6. Refunds</h2>
        <p>Our refund policy is at <a href="/refunds" className="underline">elroco.com.au/refunds</a>. In short: if you are charged and did not intend to continue, email us within {PLAN.refundDays} days for a full refund. Nothing in these terms limits your rights under the Australian Consumer Law.</p>

        <h2 className="mt-6 font-bold">7. Fair use</h2>
        <p>The subscription includes up to {PLAN.monthlyDecodes} decodes per billing period, with a fair-use limit of {PLAN.dailyDecodes} decodes per day. Automated access, scraping, bulk querying or reselling of results is not permitted. If you need higher volumes, email {SUPPORT_EMAIL}.</p>

        <h2 className="mt-6 font-bold">8. Payments</h2>
        <p>Payments are processed by Stripe. We do not store your card number. Prices may change with at least 30 days&apos; notice by email; a price change takes effect at your next renewal after the notice period.</p>

        <h2 className="mt-6 font-bold">9. Changes and availability</h2>
        <p>We may change or withdraw features of the Service. If we withdraw the VIN decoder subscription, we will stop charging you and refund any unused part of the current month.</p>

        <h2 className="mt-6 font-bold">10. Liability</h2>
        <p>To the extent permitted by law, we are not liable for loss arising from reliance on decoder results. Where the Australian Consumer Law applies a guarantee that cannot be excluded, our liability is limited to resupplying the Service or refunding the amount paid for it.</p>

        <h2 className="mt-6 font-bold">11. Governing law</h2>
        <p>These terms are governed by the laws of Victoria, Australia.</p>
      </main>
      <Footer />
    </div>
  );
}
