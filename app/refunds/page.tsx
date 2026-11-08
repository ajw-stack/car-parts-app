import Header from "../components/Header";
import Footer from "../components/Footer";
import { PLAN, SUPPORT_EMAIL } from "../lib/billing/config";

export const metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 mx-auto max-w-2xl px-4 py-12 text-sm text-[#111827] leading-relaxed">
        <h1 className="text-2xl font-bold">Refund Policy</h1>
        <p className="mt-1 text-xs text-gray-500">Last updated 22 October 2026</p>

        <h2 className="mt-8 font-bold">Didn&apos;t mean to continue after the trial?</h2>
        <p>If your card is charged when the {PLAN.trialDays}-day trial ends and you did not intend to keep the subscription, email {SUPPORT_EMAIL} within {PLAN.refundDays} days of the charge. We will cancel the subscription and refund the full amount, no questions asked.</p>

        <h2 className="mt-6 font-bold">Cancelling later</h2>
        <p>You can cancel at any time from your account page. Cancelling stops the next charge; the current month is not refunded pro rata, and you keep access until the end of the period you have paid for.</p>

        <h2 className="mt-6 font-bold">Something went wrong</h2>
        <p>If the decoder was unavailable for a sustained period or a charge was made in error, tell us and we will put it right with a refund or credit.</p>

        <h2 className="mt-6 font-bold">How refunds are paid</h2>
        <p>Refunds go back to the card that was charged, through Stripe, usually within 5 to 10 business days depending on your bank.</p>

        <h2 className="mt-6 font-bold">Your rights</h2>
        <p>This policy sits alongside your rights under the Australian Consumer Law, which this policy does not limit.</p>

        <p className="mt-8">Contact: {SUPPORT_EMAIL}</p>
      </main>
      <Footer />
    </div>
  );
}
