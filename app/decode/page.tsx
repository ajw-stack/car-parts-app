"use client";

import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import VinDecoder from "../components/VinDecoder";
import RegoLookup from "../components/RegoLookup";

export default function DecodePage() {
  const [tab, setTab] = useState<"vin" | "rego">("vin");

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      {/* Hero */}
      <div className="bg-[#141414] px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">VIN &amp; Rego Decoder</h1>
        <p className="mt-2 text-sm text-white/50">
          Decode any vehicle identification number or Australian registration plate
        </p>

        <div className="mt-8 inline-flex rounded-full bg-white/10 p-1">
          {(["vin", "rego"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "bg-[#E8000D] text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "vin" ? "VIN Decoder" : "Rego Lookup"}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-xl px-4 py-8">
          {tab === "vin" ? <VinDecoder /> : <RegoLookup />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
