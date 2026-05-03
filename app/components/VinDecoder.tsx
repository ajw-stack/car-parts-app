"use client";

import { useState, useTransition } from "react";
import type { DecodedVehicle, DecodeResult } from "../lib/vin/types";

interface Props {
  enableSave?: boolean;
  onSaved?: (vehicle: DecodedVehicle, nickname?: string) => void | Promise<void>;
}

export default function VinDecoder({ enableSave = false, onSaved }: Props) {
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState<DecodedVehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [decoding, startDecode] = useTransition();

  const handleDecode = () => {
    setError(null);
    setWarning(null);
    setVehicle(null);
    setSaved(false);
    startDecode(async () => {
      const res = await fetch(`/api/vin/decode?vin=${encodeURIComponent(vin)}`);
      const data = (await res.json()) as DecodeResult;
      if (!data.ok || !data.vehicle) {
        setError(data.error ?? "Decode failed.");
        return;
      }
      if (data.vehicle.rawErrors) setWarning(data.vehicle.rawErrors);
      setVehicle(data.vehicle);
    });
  };

  const handleSave = async () => {
    if (!vehicle || !onSaved) return;
    setSaving(true);
    try {
      await onSaved(vehicle, nickname || undefined);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          VIN
        </label>
        <div className="flex gap-2">
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && vin.length === 17 && handleDecode()}
            placeholder="17-character VIN"
            maxLength={17}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono tracking-widest text-sm text-[#111827] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:border-[#E8000D] focus:outline-none"
          />
          <button
            onClick={handleDecode}
            disabled={decoding || vin.length !== 17}
            className="rounded-xl bg-[#E8000D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101] disabled:opacity-40"
          >
            {decoding ? "Decoding…" : "Decode"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">{vin.length}/17 — I, O, Q not valid</p>
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

      {/* Result */}
      {vehicle && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#141414] px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
              </h3>
              {vehicle.trim && <p className="text-sm text-white/60 mt-0.5">{vehicle.trim}</p>}
            </div>
            <ConfidenceBadge level={vehicle.confidence} />
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-px bg-gray-100">
            <Field label="Body"         value={vehicle.bodyClass} />
            <Field label="Engine"       value={engineLabel(vehicle)} />
            <Field label="Fuel"         value={vehicle.fuelType} />
            <Field label="Drive"        value={vehicle.driveType} />
            <Field label="Transmission" value={vehicle.transmission} />
            <Field label="Country"      value={vehicle.plantCountry} />
          </div>

          {vehicle.confidence !== "high" && (
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-700">
                Some fields couldn't be decoded — common for older or AU-delivered vehicles.
              </p>
            </div>
          )}

          {/* Save to garage */}
          {enableSave && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname (e.g. Daily ute)"
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
          )}
        </div>
      )}

      {/* Find Parts CTA */}
      {vehicle && (
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
      )}
    </div>
  );
}

function engineLabel(v: DecodedVehicle): string | null {
  return [
    v.engineDisplacementL && `${parseFloat(v.engineDisplacementL).toFixed(1)}L`,
    v.engineCylinders && `${v.engineCylinders}-cyl`,
  ].filter(Boolean).join(" ") || null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="bg-white px-5 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#111827]">{value}</dd>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "partial" | "low" }) {
  const cls = {
    high:    "bg-emerald-500/20 text-emerald-300",
    partial: "bg-amber-500/20 text-amber-300",
    low:     "bg-white/10 text-white/50",
  }[level];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {level} confidence
    </span>
  );
}
