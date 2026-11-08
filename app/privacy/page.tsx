import Header from "../components/Header";
import Footer from "../components/Footer";
import { SUPPORT_EMAIL } from "../lib/billing/config";

export const metadata = { title: "Privacy Policy" };

const UPDATED = "22 October 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 mx-auto max-w-2xl px-4 py-12 text-sm text-[#111827] leading-relaxed">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-xs text-gray-500">Last updated {UPDATED}</p>

        <h2 className="mt-8 font-bold">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account details:</strong> your email address and a hashed password, held by our authentication provider (Supabase).</li>
          <li><strong>Billing details:</strong> handled by Stripe. We receive your Stripe customer ID, subscription status and a card fingerprint used only to prevent repeat free trials. We never see or store your full card number.</li>
          <li><strong>Usage:</strong> the VINs you decode and when, so we can apply your plan limits and improve decoding rules.</li>
          <li><strong>Technical data:</strong> standard server logs (IP address, browser, pages requested) kept for security and debugging.</li>
        </ul>

        <h2 className="mt-6 font-bold">How we use it</h2>
        <p>To run your account and subscription, send transactional emails (trial start, renewal, receipts), apply fair-use limits, prevent abuse, and improve the decoder. We do not sell personal information and we do not send marketing email without your consent.</p>

        <h2 className="mt-6 font-bold">VINs</h2>
        <p>A VIN identifies a vehicle, not a person. Decoded patterns are cached so repeat lookups are faster. We do not link VINs to registration or ownership records.</p>

        <h2 className="mt-6 font-bold">Who we share with</h2>
        <p>Service providers that help us run the Service: Supabase (database and login), Stripe (payments), Vercel (hosting) and our email provider. Each only receives what it needs. Some are located outside Australia.</p>

        <h2 className="mt-6 font-bold">Keeping and deleting data</h2>
        <p>We keep account data while your account exists and billing records for seven years as required by Australian tax law. To delete your account, email {SUPPORT_EMAIL} from the address on the account.</p>

        <h2 className="mt-6 font-bold">Your rights</h2>
        <p>You can ask for a copy of the personal information we hold about you, or ask us to correct it, by emailing {SUPPORT_EMAIL}. We handle personal information in line with the Australian Privacy Principles. If you have a complaint we cannot resolve, you can contact the Office of the Australian Information Commissioner.</p>

        <h2 className="mt-6 font-bold">Cookies</h2>
        <p>We use only the cookies and local storage needed to keep you signed in and remember your settings. No advertising trackers.</p>

        <h2 className="mt-6 font-bold">Contact</h2>
        <p>{SUPPORT_EMAIL}</p>
      </main>
      <Footer />
    </div>
  );
}
