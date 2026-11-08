import Header from "../components/Header";
import Footer from "../components/Footer";
import { SUPPORT_EMAIL } from "../lib/billing/config";

export const metadata = {
  title: "Contact",
  description: "Contact Elroco support about the VIN decoder, your account or your subscription.",
};

const QUICK_LINKS = [
  { title: "Cancel or change your subscription", text: "Open your account, then Manage billing. You can cancel, update your card or download invoices there.", href: "/account", label: "Go to your account" },
  { title: "Forgotten your password?", text: "We will email you a link to set a new one.", href: "/forgot-password", label: "Reset your password" },
  { title: "Plans and pricing", text: "What is included, how the trial works and what it costs.", href: "/pricing", label: "See pricing" },
  { title: "Terms and refunds", text: "The terms of service and refund policy for the VIN decoder.", href: "/terms", label: "Read the terms" },
];

export default function ContactPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Elroco support")}`;
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <section className="bg-[#02070d] px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm text-white/60">Questions about the VIN decoder, your account or your subscription.</p>
        </section>

        <section className="mx-auto max-w-2xl px-4 py-10 space-y-8">
          <div className="rounded-2xl border border-gray-200 px-6 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Email support</p>
            <p className="mt-2 text-lg font-semibold text-[#111827] break-all">{SUPPORT_EMAIL}</p>
            <a
              href={mailto}
              className="mt-4 inline-block rounded-xl bg-[#02070d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] transition-colors"
            >
              Send us an email
            </a>
            <p className="mt-4 text-sm text-gray-600">We will get back to you as soon as we can.</p>
          </div>

          <div className="rounded-2xl bg-gray-50 px-6 py-5">
            <p className="text-sm font-semibold text-[#111827]">To help us answer quickly, please include:</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc pl-5">
              <li>The email address on your Elroco account</li>
              <li>For a decoding question, the 17-character VIN and what you expected to see</li>
              <li>For a billing question, the date and amount of the charge</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#111827]">You might find the answer here</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {QUICK_LINKS.map((q) => (
                <div key={q.href} className="rounded-2xl border border-gray-200 px-5 py-4">
                  <p className="text-sm font-semibold text-[#111827]">{q.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{q.text}</p>
                  <a href={q.href} className="mt-3 inline-block text-sm font-semibold text-[#111827] underline">{q.label}</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
