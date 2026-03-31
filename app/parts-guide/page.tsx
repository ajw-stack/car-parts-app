"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

export default function PartsGuidePage() {
  const router = useRouter();

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [xrefQuery, setXrefQuery] = useState("");
  const [xrefLoading, setXrefLoading] = useState(false);
  const [xrefError, setXrefError] = useState("");

  async function handleLookup() {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError("");

    const { data: parts, error } = await supabase
      .from("parts")
      .select("id")
      .ilike("part_number", lookupQuery.trim());

    if (error || !parts || parts.length === 0) {
      setLookupError("No part found with that part number.");
      setLookupLoading(false);
      return;
    }

    router.push(`/part/${parts[0].id}`);
  }

  async function handleXref() {
    if (!xrefQuery.trim()) return;
    setXrefLoading(true);
    setXrefError("");

    const { data: parts, error } = await supabase
      .from("parts")
      .select("id")
      .ilike("part_number", xrefQuery.trim());

    if (error || !parts || parts.length === 0) {
      setXrefError("No part found with that part number.");
      setXrefLoading(false);
      return;
    }

    router.push(`/part/${parts[0].id}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 w-full bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">Parts Guide</h1>
          <p className="mt-2 text-sm text-[#374151]">Look up a part number or find cross-reference equivalents.</p>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">

            {/* Part Number Lookup */}
            <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6">
              <h2 className="text-lg font-semibold text-[#1F2937]">Part Number Lookup</h2>
              <p className="mt-1 text-xs text-[#6B7280]">Enter a part number to view details, specs and vehicle fitments.</p>

              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 text-sm outline-none focus:border-[#9CA3AF]"
                  placeholder="e.g. R2690P"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
                <button
                  onClick={handleLookup}
                  disabled={!lookupQuery.trim() || lookupLoading}
                  className="rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-40 cursor-pointer"
                >
                  {lookupLoading ? "..." : "Search"}
                </button>
              </div>

              {lookupError && (
                <p className="mt-4 text-sm text-red-500">{lookupError}</p>
              )}
            </section>

            {/* Cross Reference */}
            <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6">
              <h2 className="text-lg font-semibold text-[#1F2937]">Cross Reference</h2>
              <p className="mt-1 text-xs text-[#6B7280]">Find equivalent parts from other brands.</p>

              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 text-sm outline-none focus:border-[#9CA3AF]"
                  placeholder="e.g. R2690P"
                  value={xrefQuery}
                  onChange={(e) => setXrefQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleXref()}
                />
                <button
                  onClick={handleXref}
                  disabled={!xrefQuery.trim() || xrefLoading}
                  className="rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-40 cursor-pointer"
                >
                  {xrefLoading ? "..." : "Search"}
                </button>
              </div>

              {xrefError && (
                <p className="mt-4 text-sm text-red-500">{xrefError}</p>
              )}
            </section>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-6 text-sm text-white/70">
        <div className="mx-auto max-w-5xl text-center">
          © {new Date().getFullYear()} Global Parts Catalogue. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
