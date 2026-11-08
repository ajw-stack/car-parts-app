"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import VinDecoder from "../components/VinDecoder";

// Rego lookup removed until the data broker works (component kept in components/RegoLookup.tsx).
export default function DecodePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      {/* Hero */}
      <div className="bg-[#02070d] px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">VIN Decoder</h1>
        <p className="mt-2 text-sm text-white/50">
          Decode any 17-character vehicle identification number, built for Australian-delivered vehicles
        </p>
      </div>

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-xl px-4 py-8">
          <VinDecoder />
        </div>
      </main>

      <Footer />
    </div>
  );
}
