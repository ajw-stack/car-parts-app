import Header from "../components/Header";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 w-full bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">Contact</h1>
          <p className="mt-2 text-sm text-[#374151]">Get in touch with us.</p>
        </div>
      </main>

      <footer className="w-full border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-6 text-sm text-white/70">
        <div className="mx-auto max-w-5xl text-center">
          © 2026 Elroco. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
