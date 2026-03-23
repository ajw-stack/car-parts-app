"use client";

import { useState } from "react";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

type Part = {
  id: string;
  brand: string;
  part_number: string;
  name: string;
  category: string;
};

type Fitment = {
  vehicles: {
    id: string;
    make: string;
    model: string;
    year_from: number;
    year_to: number | null;
    engine_code: string | null;
    engine_litres: number | null;
    fuel_type: string | null;
  };
};

export default function PartsGuidePage() {
  // --- Part lookup ---
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<Part | null>(null);
  const [lookupFitments, setLookupFitments] = useState<Fitment[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // --- Cross reference ---
  const [xrefQuery, setXrefQuery] = useState("");
  const [xrefSource, setXrefSource] = useState<Part | null>(null);
  const [xrefResults, setXrefResults] = useState<Part[]>([]);
  const [xrefLoading, setXrefLoading] = useState(false);
  const [xrefError, setXrefError] = useState("");

  async function handleLookup() {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setLookupFitments([]);

    const { data: parts, error } = await supabase
      .from("parts")
      .select("id, brand, part_number, name, category")
      .ilike("part_number", lookupQuery.trim());

    if (error || !parts || parts.length === 0) {
      setLookupError("No part found with that part number.");
      setLookupLoading(false);
      return;
    }

    const part = parts[0];
    setLookupResult(part);

    const { data: fitments } = await supabase
      .from("fitments")
      .select(`vehicles:vehicle_id (id, make, model, year_from, year_to, engine_code, engine_litres, fuel_type)`)
      .eq("part_id", part.id);

    setLookupFitments((fitments as unknown as Fitment[]) ?? []);
    setLookupLoading(false);
  }

  async function handleXref() {
    if (!xrefQuery.trim()) return;
    setXrefLoading(true);
    setXrefError("");
    setXrefSource(null);
    setXrefResults([]);

    const { data: parts, error } = await supabase
      .from("parts")
      .select("id, brand, part_number, name, category")
      .ilike("part_number", xrefQuery.trim());

    if (error || !parts || parts.length === 0) {
      setXrefError("No part found with that part number.");
      setXrefLoading(false);
      return;
    }

    const source = parts[0];
    setXrefSource(source);

    // Query cross_references in both directions
    const [{ data: asPartA }, { data: asPartB }] = await Promise.all([
      supabase
        .from("cross_references")
        .select("cross_parts:cross_part_id (id, brand, part_number, name, category)")
        .eq("part_id", source.id),
      supabase
        .from("cross_references")
        .select("cross_parts:part_id (id, brand, part_number, name, category)")
        .eq("cross_part_id", source.id),
    ]);

    const matches: Part[] = [
      ...((asPartA ?? []).map((r: any) => r.cross_parts).filter(Boolean)),
      ...((asPartB ?? []).map((r: any) => r.cross_parts).filter(Boolean)),
    ];

    if (matches.length === 0) {
      setXrefError("No cross-reference matches found for this part.");
    } else {
      setXrefResults(matches);
    }

    setXrefLoading(false);
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
              <p className="mt-1 text-xs text-[#6B7280]">Enter a part number to see details and vehicle fitments.</p>

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

              {lookupResult && (
                <div className="mt-4">
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">{lookupResult.category}</p>
                    <p className="mt-1 text-lg font-bold text-[#1F2937]">{lookupResult.brand} {lookupResult.part_number}</p>
                    <p className="mt-1 text-sm text-[#374151]">{lookupResult.name}</p>
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-[#1F2937]">
                    Vehicle Fitments
                    <span className="ml-2 text-[#9CA3AF] font-normal">{lookupFitments.length} found</span>
                  </h3>

                  {lookupFitments.length === 0 ? (
                    <p className="mt-2 text-sm text-[#6B7280]">No vehicles linked to this part yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-[#F3F4F6] rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                      {lookupFitments.map((f, i) => {
                        const v = f.vehicles;
                        return (
                          <li key={i} className="px-4 py-3">
                            <p className="text-sm font-semibold text-[#1F2937]">{v.make} {v.model}</p>
                            <p className="text-xs text-[#6B7280]">
                              {v.year_from}{v.year_to ? `–${v.year_to}` : "+"}
                              {v.engine_litres ? ` • ${v.engine_litres}L` : ""}
                              {v.engine_code ? ` • ${v.engine_code}` : ""}
                              {v.fuel_type ? ` • ${v.fuel_type}` : ""}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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

              {xrefSource && (
                <div className="mt-4">
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Source Part</p>
                    <p className="mt-1 text-lg font-bold text-[#1F2937]">{xrefSource.brand} {xrefSource.part_number}</p>
                    <p className="mt-1 text-sm text-[#374151]">{xrefSource.name}</p>
                  </div>

                  {xrefResults.length > 0 && (
                    <>
                      <h3 className="mt-5 text-sm font-semibold text-[#1F2937]">
                        Equivalent Parts
                        <span className="ml-2 text-[#9CA3AF] font-normal">{xrefResults.length} found</span>
                      </h3>
                      <ul className="mt-2 divide-y divide-[#F3F4F6] rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                        {xrefResults.map((p) => (
                          <li key={p.id} className="px-4 py-3">
                            <p className="text-sm font-semibold text-[#1F2937]">{p.brand} {p.part_number}</p>
                            <p className="text-xs text-[#6B7280]">{p.category}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </section>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-6 text-sm text-white/70">
        <div className="mx-auto max-w-5xl text-center">
          © 2026 Global Parts Catalogue. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
