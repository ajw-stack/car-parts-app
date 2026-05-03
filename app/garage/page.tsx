"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import VinDecoder from "../components/VinDecoder";
import RegoLookup from "../components/RegoLookup";
import VehicleSelector from "../components/VehicleSelector";
import { supabase } from "../lib/supabaseClient";
import type { DecodedVehicle } from "../lib/vin/types";
import type { AusState } from "../lib/rego/validate";

type Tab = "vin" | "rego" | "select";

type GarageRow = {
  id: string;
  user_id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  nickname: string | null;
  rego: string | null;
  rego_state: string | null;
  created_at: string;
};

export default function GaragePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [vehicles, setVehicles] = useState<GarageRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addTab, setAddTab] = useState<Tab>("vin");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setListLoading(true);
    supabase
      .from("garage_vehicles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVehicles((data as GarageRow[]) ?? []);
        setListLoading(false);
      });
  }, [userId]);

  const handleSaved = async (
    vehicle: DecodedVehicle,
    meta?: { rego?: string; state?: AusState; nickname?: string } | string,
  ) => {
    if (!userId) return;
    const nickname = typeof meta === "string" ? meta : meta?.nickname;
    const rego     = typeof meta === "object" && meta !== null ? meta.rego  : undefined;
    const state    = typeof meta === "object" && meta !== null ? meta.state : undefined;

    const { data, error } = await supabase
      .from("garage_vehicles")
      .insert({
        user_id:               userId,
        vin:                   vehicle.vin,
        year:                  vehicle.year,
        make:                  vehicle.make,
        model:                 vehicle.model,
        trim:                  vehicle.trim,
        body_class:            vehicle.bodyClass,
        engine_cylinders:      vehicle.engineCylinders,
        engine_displacement_l: vehicle.engineDisplacementL,
        fuel_type:             vehicle.fuelType,
        transmission:          vehicle.transmission,
        drive_type:            vehicle.driveType,
        manufacturer:          vehicle.manufacturer,
        plant_country:         vehicle.plantCountry,
        source:                vehicle.source,
        confidence:            vehicle.confidence,
        raw_errors:            vehicle.rawErrors,
        nickname:              nickname ?? null,
        rego:                  rego ?? null,
        rego_state:            state ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      const row = data as GarageRow;
      setVehicles((prev) => [row, ...prev]);
      setSelectedId(row.id);
      setShowAdd(false);
    }
  };

  const handleSelectVehicle = async (v: {
    id: string; make: string; model: string;
    year_from: number; year_to: number | null;
    series: string | null; trim_code: string | null;
    engine_code: string | null; engine_litres: number | null;
    engine_kw: number | null; fuel_type: string | null;
    chassis: string | null; notes: string | null;
  }) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("garage_vehicles")
      .insert({
        user_id:  userId,
        vin:      v.id, // no VIN — store vehicle DB id as reference
        year:     v.year_from,
        make:     v.make,
        model:    v.model,
        trim:     [v.series, v.trim_code].filter(Boolean).join(" ") || null,
        fuel_type: v.fuel_type,
        source:   "manual",
        confidence: "high",
      })
      .select()
      .single();
    if (!error && data) {
      const row = data as GarageRow;
      setVehicles((prev) => [row, ...prev]);
      setSelectedId(row.id);
      setShowAdd(false);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("garage_vehicles").delete().eq("id", id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#141414]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────────
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-[#141414]">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-8">
            {/* Garage bay illustration */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-16 h-20 rounded-t-xl border-2 border-[#2A2A2A] bg-[#1A1A1A] flex flex-col items-center justify-end pb-3 gap-1"
                >
                  <div className="w-10 h-0.5 bg-[#2A2A2A] rounded-full" />
                  <div className="w-10 h-0.5 bg-[#2A2A2A] rounded-full" />
                  <div className="w-4 h-0.5 bg-[#E8000D]/40 rounded-full" />
                </div>
              ))}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white">My Garage</h1>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Save your vehicles and find compatible parts in one tap — every time you visit.
              </p>
            </div>

            <ul className="text-left space-y-3">
              {[
                "Save unlimited vehicles by VIN or rego plate",
                "One tap to search parts that fit your car",
                "Your vehicles remembered across every visit",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="shrink-0 text-[#E8000D] font-bold mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <a
                href="/login"
                className="block rounded-xl bg-[#E8000D] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="block rounded-xl border border-[#2A2A2A] px-8 py-3.5 text-sm font-semibold text-white hover:border-white/30 transition-colors"
              >
                Create Account
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — parking bays ── */}
        <aside className="w-64 shrink-0 bg-[#141414] flex flex-col border-r border-[#1F1F1F]">
          <div className="px-5 pt-6 pb-4 border-b border-[#1F1F1F]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E8000D]">My Garage</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {listLoading ? "Loading…" : `${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5">
            {vehicles.map((v, idx) => {
              const title = v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown";
              const sub   = v.nickname
                ? [v.year, v.make, v.model].filter(Boolean).join(" ")
                : v.rego
                  ? `${v.rego}${v.rego_state ? ` · ${v.rego_state}` : ""}`
                  : null;
              const active = selectedId === v.id;

              return (
                <button
                  key={v.id}
                  onClick={() => { setSelectedId(v.id); setShowAdd(false); }}
                  className={`w-full text-left rounded-xl px-3.5 py-3 transition-all border ${
                    active
                      ? "bg-[#E8000D]/10 border-[#E8000D]/40"
                      : "border-transparent hover:bg-white/5 hover:border-white/5"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 text-[10px] font-mono text-zinc-600 mt-0.5 leading-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate leading-tight ${active ? "text-white" : "text-zinc-300"}`}>
                        {title}
                      </p>
                      {sub && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{sub}</p>
                      )}
                    </div>
                    {active && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#E8000D] mt-1.5" />
                    )}
                  </div>
                </button>
              );
            })}

            {!listLoading && vehicles.length === 0 && (
              <p className="px-3 py-4 text-xs text-zinc-600 leading-relaxed">
                No vehicles yet. Hit &ldquo;+ Add Vehicle&rdquo; to get started.
              </p>
            )}
          </div>

          <div className="px-3 py-3 border-t border-[#1F1F1F]">
            <button
              onClick={() => { setShowAdd(true); setSelectedId(null); }}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                showAdd
                  ? "border-[#E8000D]/40 bg-[#E8000D]/10 text-white"
                  : "border-[#2A2A2A] text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              + Add Vehicle
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto bg-[#F3F4F6]">

          {/* Nothing selected */}
          {!selectedVehicle && !showAdd && (
            <div className="h-full flex items-center justify-center px-8">
              <div className="text-center max-w-xs">
                <div className="flex justify-center gap-2 mb-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-16 rounded-t-lg border-2 border-gray-200 bg-white flex flex-col items-center justify-end pb-2 gap-1"
                    >
                      <div className="w-8 h-px bg-gray-200" />
                      <div className="w-8 h-px bg-gray-200" />
                      <div className="w-4 h-px bg-gray-300" />
                    </div>
                  ))}
                </div>
                <p className="font-semibold text-[#111827]">Select a vehicle</p>
                <p className="mt-1 text-sm text-gray-400">or add a new one to your garage</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-5 rounded-xl bg-[#E8000D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
                >
                  + Add Vehicle
                </button>
              </div>
            </div>
          )}

          {/* Vehicle selected */}
          {selectedVehicle && !showAdd && (
            <div className="max-w-lg px-8 py-10">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-[#141414] px-6 py-5 flex items-start justify-between gap-4">
                  <div>
                    {selectedVehicle.nickname && (
                      <p className="text-[11px] font-semibold text-[#E8000D] uppercase tracking-widest mb-1">
                        {selectedVehicle.nickname}
                      </p>
                    )}
                    <h2 className="text-xl font-bold text-white leading-tight">
                      {[selectedVehicle.year, selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                    </h2>
                    {selectedVehicle.trim && (
                      <p className="text-sm text-white/50 mt-0.5">{selectedVehicle.trim}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(selectedVehicle.id)}
                    className="shrink-0 text-white/20 hover:text-red-400 transition-colors text-xl leading-none mt-0.5"
                    aria-label="Remove vehicle"
                  >
                    ×
                  </button>
                </div>

                {/* Meta row */}
                <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                  {selectedVehicle.rego && (
                    <span className="font-mono font-bold text-[#111827]">
                      {selectedVehicle.rego}{selectedVehicle.rego_state ? ` · ${selectedVehicle.rego_state}` : ""}
                    </span>
                  )}
                  <span className="font-mono text-gray-400">VIN: {selectedVehicle.vin}</span>
                </div>

                {/* Find parts CTA */}
                <a
                  href={`/?q=${encodeURIComponent([selectedVehicle.year, selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(" "))}`}
                  className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-[#111827]">Find compatible parts</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Browse parts that fit your {selectedVehicle.make} {selectedVehicle.model}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-[#E8000D] px-5 py-2.5 text-sm font-semibold text-white whitespace-nowrap">
                    Search Parts →
                  </span>
                </a>
              </div>
            </div>
          )}

          {/* Add vehicle */}
          {showAdd && (
            <div className="max-w-lg px-8 py-10">
              <h2 className="text-lg font-bold text-[#111827] mb-5">Add a Vehicle</h2>

              <div className="mb-5 inline-flex rounded-full bg-gray-200 p-1">
                {([["vin", "By VIN"], ["rego", "By Rego"], ["select", "Browse"]] as const).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setAddTab(t)}
                    className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
                      addTab === t ? "bg-[#E8000D] text-white" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {addTab === "vin" && (
                <VinDecoder enableSave onSaved={(v, nick) => handleSaved(v, nick)} />
              )}
              {addTab === "rego" && (
                <RegoLookup enableSave onSaved={(v, meta) => handleSaved(v, meta)} />
              )}
              {addTab === "select" && (
                <VehicleSelector onSelect={handleSelectVehicle} />
              )}
            </div>
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
