import Header from "../components/Header";
import Footer from "../components/Footer";
import { PLAN } from "../lib/billing/config";

export const metadata = {
  title: "Elroco — VIN Decoder for Australian vehicles",
  description: "Decode any Australian-delivered VIN. The full Elroco parts catalogue is coming soon.",
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <section className="bg-[#02070d] px-4 pt-16 pb-14 text-center">
          <p
            style={{ fontFamily: "var(--font-michroma, 'Michroma', sans-serif)", letterSpacing: "0.1em" }}
            className="text-3xl uppercase text-white leading-none"
          >
            Elroco
          </p>
          <h1 className="mt-6 text-4xl font-bold text-white tracking-tight">Parts catalogue coming soon.</h1>
          <p className="mt-4 text-base text-white/60 max-w-xl mx-auto">
            A vehicle-first parts catalogue for Australian mechanics, trade and enthusiasts is on its way.
            The VIN decoder is open now.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/pricing" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#02070d] hover:bg-white/85 transition-colors">
              Start your {PLAN.trialDays}-day trial
            </a>
            <a href="/pricing" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white hover:bg-white/10 transition-colors">
              Skip the trial and subscribe
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 grid gap-6 sm:grid-cols-3">
          <Card title="Built for AU-delivered cars" text="Position-by-position decoding with Australian market rules, not a US database with gaps." />
          <Card title="Model, series, engine, plant" text="Make, model, series code, engine, body, drive, transmission and build plant where the VIN carries them." />
          <Card title={`${PLAN.monthlyDecodes} decodes a month`} text={`${PLAN.priceLabel} a month after a ${PLAN.trialDays}-day trial. Cancel any time from your account.`} />
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-[#111827]">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}
