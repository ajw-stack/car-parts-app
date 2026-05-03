"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  series: string | null;
  trim_code: string | null;
  engine_code: string | null;
  engine_litres: number | null;
  engine_kw: number | null;
  fuel_type: string | null;
  chassis: string | null;
  notes: string | null;
};

interface Props {
  onSelect: (vehicle: VehicleRow) => void;
  buttonLabel?: string;
}

export default function VehicleSelector({ onSelect, buttonLabel = "Add to Garage" }: Props) {
  const [makes, setMakes]               = useState<string[]>([]);
  const [makeVehicles, setMakeVehicles] = useState<VehicleRow[]>([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [makesLoading, setMakesLoading] = useState(true);
  const [varsLoading, setVarsLoading]   = useState(false);

  // Load distinct makes
  useEffect(() => {
    supabase.rpc("get_vehicle_makes").then(({ data }) => {
      const result = Array.isArray(data) ? data : [];
      setMakes(result.map((r: string | { make: string }) =>
        typeof r === "string" ? r : r.make
      ).sort());
      setMakesLoading(false);
    });
  }, []);

  // Load vehicles when make selected
  useEffect(() => {
    if (!selectedMake) { setMakeVehicles([]); return; }
    setVarsLoading(true);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");
    supabase
      .from("vehicles")
      .select("id, make, model, year_from, year_to, series, trim_code, engine_code, engine_litres, engine_kw, fuel_type, chassis, notes")
      .eq("make", selectedMake)
      .then(({ data }) => {
        setMakeVehicles((data ?? []) as VehicleRow[]);
        setVarsLoading(false);
      });
  }, [selectedMake]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of makeVehicles) set.add(v.model);
    return Array.from(set).sort();
  }, [makeVehicles]);

  const yearOptions = useMemo(() => {
    if (!selectedModel) return [];
    const years = new Set<number>();
    for (const v of makeVehicles) {
      if (v.model !== selectedModel) continue;
      const end = v.year_to === 0 ? new Date().getFullYear() : (v.year_to ?? v.year_from);
      for (let y = v.year_from; y <= end; y++) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [makeVehicles, selectedModel]);

  const variantOptions = useMemo(() => {
    if (!selectedModel || !selectedYear) return [];
    const yr = Number(selectedYear);
    return makeVehicles.filter((v) => {
      if (v.model !== selectedModel) return false;
      const end = v.year_to === 0 ? new Date().getFullYear() : (v.year_to ?? v.year_from);
      return yr >= v.year_from && yr <= end;
    });
  }, [makeVehicles, selectedModel, selectedYear]);

  const selectedVehicle = useMemo(() => {
    return variantOptions.find((v) => v.id === selectedVariant) ?? null;
  }, [variantOptions, selectedVariant]);

  function variantLabel(v: VehicleRow) {
    const parts = [
      v.series,
      v.trim_code,
      v.engine_litres != null ? `${v.engine_litres}L` : null,
      v.engine_code,
      v.fuel_type,
      v.chassis,
      v.notes,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : `${v.year_from}–${v.year_to ?? "present"}`;
  }

  const canAdd = !!selectedVehicle;

  function handleAdd() {
    if (!selectedVehicle) return;
    onSelect(selectedVehicle);
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");
    setMakeVehicles([]);
  }

  return (
    <div className="space-y-3">
      {/* Make */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Make
        </label>
        <select
          value={selectedMake}
          onChange={(e) => setSelectedMake(e.target.value)}
          disabled={makesLoading}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] focus:border-[#E8000D] focus:outline-none"
        >
          <option value="">{makesLoading ? "Loading…" : "Select make"}</option>
          {makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => { setSelectedModel(e.target.value); setSelectedYear(""); setSelectedVariant(""); }}
          disabled={!selectedMake || varsLoading}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] focus:border-[#E8000D] focus:outline-none disabled:opacity-50"
        >
          <option value="">{varsLoading ? "Loading…" : "Select model"}</option>
          {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Year */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Year
        </label>
        <select
          value={selectedYear}
          onChange={(e) => { setSelectedYear(e.target.value); setSelectedVariant(""); }}
          disabled={!selectedModel}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] focus:border-[#E8000D] focus:outline-none disabled:opacity-50"
        >
          <option value="">Select year</option>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Variant */}
      {variantOptions.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Variant
          </label>
          <select
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] focus:border-[#E8000D] focus:outline-none"
          >
            <option value="">Select variant</option>
            {variantOptions.map((v) => (
              <option key={v.id} value={v.id}>{variantLabel(v)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Selected vehicle summary */}
      {selectedVehicle && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827]">
          <p className="font-semibold">{selectedYear} {selectedMake} {selectedModel}</p>
          {variantLabel(selectedVehicle) !== `${selectedVehicle.year_from}–${selectedVehicle.year_to ?? "present"}` && (
            <p className="text-xs text-gray-500 mt-0.5">{variantLabel(selectedVehicle)}</p>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className="w-full rounded-xl bg-[#E8000D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#9a0101] disabled:opacity-40 transition-colors"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
