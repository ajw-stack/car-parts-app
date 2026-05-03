"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import VinDecoder from "../components/VinDecoder";
import RegoLookup from "../components/RegoLookup";
import { supabase } from "../lib/supabaseClient";
import type { DecodedVehicle } from "../lib/vin/types";
import type { AusState } from "../lib/rego/validate";

type Tab = "vin" | "rego";

// Supabase returns snake_case columns
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
  const [tab, setTab] = useState<Tab>("vin");
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [vehicles, setVehicles] = useState<GarageRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

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
      setVehicles((prev) => [data as GarageRow, ...prev]);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("garage_vehicles").delete().eq("id", id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white px-8 py-10">
              <p className="text-lg font-bold text-[#111827]">Sign in to access My Garage</p>
              <p className="mt-2 text-sm text-gray-500">
                Save vehicles by VIN or rego plate and quickly find compatible parts.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block rounded-xl bg-[#E8000D] px-8 py-3 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
              >
                Sign In
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      {/* Hero */}
      <div className="bg-[#141414] px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">My Garage</h1>
        <p className="mt-2 text-sm text-white/50">
          Save your vehicles to find compatible parts instantly
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
              {t === "vin" ? "Add by VIN" : "Add by Rego"}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-xl px-4 py-8 space-y-10">

          {/* Decoder / lookup */}
          {tab === "vin" ? (
            <VinDecoder enableSave onSaved={(v, nick) => handleSaved(v, nick)} />
          ) : (
            <RegoLookup
              enableSave
              onSaved={(v, meta) => handleSaved(v, meta)}
            />
          )}

          {/* Saved vehicles list */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Saved vehicles
            </h2>

            {listLoading && (
              <p className="text-sm text-gray-400">Loading…</p>
            )}

            {!listLoading && vehicles.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <p className="text-sm text-gray-500">No vehicles saved yet.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Decode a VIN or rego above and tap &ldquo;Save to My Garage&rdquo;.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {vehicles.map((v) => (
                <GarageCard key={v.id} row={v} onRemove={handleRemove} />
              ))}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}

function GarageCard({
  row,
  onRemove,
}: {
  row: GarageRow;
  onRemove: (id: string) => void;
}) {
  const title = [row.year, row.make, row.model].filter(Boolean).join(" ");
  const partsQuery = encodeURIComponent(title);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#141414] px-5 py-4 flex items-start justify-between gap-3">
        <div>
          {row.nickname && (
            <p className="text-xs font-semibold text-[#E8000D] uppercase tracking-wide mb-0.5">
              {row.nickname}
            </p>
          )}
          <h3 className="text-base font-bold text-white">{title || "Unknown vehicle"}</h3>
          {row.trim && <p className="text-sm text-white/60 mt-0.5">{row.trim}</p>}
        </div>
        <button
          onClick={() => onRemove(row.id)}
          className="shrink-0 text-white/30 hover:text-white/70 transition-colors text-lg leading-none mt-0.5"
          aria-label="Remove"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        {row.rego && (
          <span className="font-mono font-semibold text-[#111827]">
            {row.rego}{row.rego_state ? ` (${row.rego_state})` : ""}
          </span>
        )}
        <span className="font-mono text-gray-400">VIN: {row.vin}</span>
      </div>

      <div className="px-5 pb-4">
        <a
          href={`/?q=${partsQuery}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8000D] px-4 py-2 text-sm font-semibold text-[#E8000D] hover:bg-[#E8000D] hover:text-white transition-colors"
        >
          Find parts →
        </a>
      </div>
    </div>
  );
}
