"use client";

import { useState, useTransition } from "react";
import type { DecodedVehicle } from "../lib/vin/types";
import type { RegoLookupResult } from "../lib/rego/types";
import { AUS_STATES, type AusState } from "../lib/rego/validate";
import VinDecoder from "./VinDecoder";

interface Props {
  enableSave?: boolean;
  onSaved?: (vehicle: DecodedVehicle, meta: { rego: string; state: AusState; nickname?: string }) => void | Promise<void>;
}

export default function RegoLookup({ enableSave = false, onSaved }: Props) {
  const [rego, setRego] = useState("");
  const [state, setState] = useState<AusState | "">("");
  const [loading, startLookup] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<DecodedVehicle | null>(null);
  const [needsVin, setNeedsVin] = useState(false);
  const [source, setSource] = useState<RegoLookupResult["source"] | null>(null);

  const handleLookup = () => {
    setError(null);
    setWarning(null);
    setVehicle(null);
    setNeedsVin(false);
    setSource(null);
    if (!state) return;
    startLookup(async () => {
      const res = await fetch(`/api/rego/lookup?rego=${encodeURIComponent(rego)}&state=${state}`);
      const data = (await res.json()) as RegoLookupResult;
      if (!data.ok) { setError(data.error ?? "Lookup failed."); return; }
      if (data.warning) setWarning(data.warning);
      if (data.vehicle) { setVehicle(data.vehicle); setSource(data.source ?? null); return; }
      if (data.needsManualVin) setNeedsVin(true);
    });
  };

  // After a VIN miss, the user decodes via VinDecoder.
  // We seed the community cache and surface the save option.
  const handleVinResolved = async (v: DecodedVehicle, nickname?: string) => {
    if (!state) return;
    fetch("/api/rego/pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rego, state, vin: v.vin }),
    }).catch(() => {});

    if (onSaved) await onSaved(v, { rego, state, nickname });
  };

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Registration Plate
        </label>
        <div className="flex gap-2">
          <input
            value={rego}
            onChange={(e) => setRego(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && rego && state && handleLookup()}
            placeholder="e.g. 1AB2CD"
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono tracking-widest text-sm text-[#111827] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:border-[#E8000D] focus:outline-none"
          />
          <select
            value={state}
            onChange={(e) => setState(e.target.value as AusState | "")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-[#111827] focus:border-[#E8000D] focus:outline-none"
            aria-label="State"
          >
            <option value="" disabled>Select State</option>
            {AUS_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.code}</option>
            ))}
          </select>
          <button
            onClick={handleLookup}
            disabled={loading || !rego || !state}
            className="rounded-xl bg-[#E8000D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101] disabled:opacity-40"
          >
            {loading ? "…" : "Look up"}
          </button>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {warning}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Vehicle found from cache */}
      {vehicle && (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Found via {sourceLabel(source)}
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#111827]">
              {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
            </h3>
            {vehicle.trim && <p className="text-sm text-gray-500 mt-0.5">{vehicle.trim}</p>}
            <p className="mt-2 font-mono text-xs text-gray-400">VIN: {vehicle.vin}</p>
          </div>

          {enableSave && onSaved && (
            <SaveBar
              onSave={async (nickname) => { if (state) await onSaved(vehicle, { rego, state, nickname }); }}
            />
          )}

          <a
            href={`/?q=${encodeURIComponent([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "))}`}
            className="block rounded-xl bg-[#141414] px-6 py-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-white text-sm">Find compatible parts</p>
              <p className="text-xs text-white/50 mt-0.5">
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
              </p>
            </div>
            <span className="shrink-0 text-[#E8000D] font-semibold text-sm">Search Parts →</span>
          </a>
        </>
      )}

      {/* Rego miss — ask for VIN to seed community cache */}
      {needsVin && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-5 space-y-3">
          <div>
            <p className="font-semibold text-[#111827] text-sm">{rego} ({state}) isn&apos;t in our records yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Enter your VIN to identify this vehicle. You&apos;ll help future lookups of this plate work instantly.
            </p>
          </div>
          <VinDecoder
            enableSave={enableSave}
            onSaved={handleVinResolved}
          />
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave }: { onSave: (nickname?: string) => void | Promise<void> }) {
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(nickname || undefined); setSaved(true); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Nickname (optional)"
        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#E8000D] focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="shrink-0 rounded-xl border border-[#E8000D] px-5 py-2.5 text-sm font-semibold text-[#E8000D] hover:bg-[#E8000D] hover:text-white transition-colors disabled:opacity-50"
      >
        {saved ? "Saved ✓" : saving ? "Saving…" : "Save to My Garage"}
      </button>
    </div>
  );
}

function sourceLabel(s: RegoLookupResult["source"] | null): string {
  switch (s) {
    case "community_cache": return "community records";
    case "broker_api":      return "official records";
    default:                return "lookup";
  }
}
