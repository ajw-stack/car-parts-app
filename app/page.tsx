// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "./components/Header";
import { supabase } from "./lib/supabaseClient";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  series: string | null;
  engine_code: string | null;
  engine_litres: number | null;
  fuel_type: string | null;
  chassis: string | null;
};

type PartRow = {
  id: string;
  brand: string;
  part_number: string;
  name: string;
  category: string;
};

function norm(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function yearLabel(y: number) {
  return String(y);
}

function engineKey(v: VehicleRow) {
  // Key used for the Engine dropdown selection (does NOT include series/chassis)
  return `${v.engine_code ?? ""}|${v.engine_litres ?? ""}|${v.fuel_type ?? ""}`;
}

function engineLabelFromKey(key: string) {
  const [code, litres, fuel] = key.split("|");
  const litresLabel = litres ? `${litres}L` : "";
  const fuelLabel = fuel ? `${fuel}` : "";
  const parts = [code, litresLabel, fuelLabel].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Unknown engine";
}

function vehicleCardLabel(v: VehicleRow) {
  const yr = v.year_from === v.year_to ? `${v.year_from}` : `${v.year_from}-${v.year_to}`;
  const series = v.series ? ` ${v.series}` : "";
  const eng = [v.engine_code, v.engine_litres != null ? `${v.engine_litres}L` : "", v.fuel_type ?? ""]
    .filter(Boolean)
    .join(" ");
  const chassis = v.chassis ? ` • ${v.chassis}` : "";
  return `${v.make} ${v.model} ${yr}${series} • ${eng}${chassis}`;
}

export default function Page() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Structured selector state
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedEngineKey, setSelectedEngineKey] = useState("");
  const [selectedChassis, setSelectedChassis] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Quick search
  const [query, setQuery] = useState("");
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  // Results
  const [parts, setParts] = useState<PartRow[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);

  // --- Load vehicles once ---
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingVehicles(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, make, model, year_from, year_to, series, engine_code, engine_litres, fuel_type, chassis"
        );

      if (cancelled) return;

      if (error) {
        console.error(error);
        setVehicles([]);
      } else {
        setVehicles((data ?? []) as VehicleRow[]);
      }
      setLoadingVehicles(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Cascading resets (downstream clears) ---
  useEffect(() => {
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedMake]);

  useEffect(() => {
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedModel]);

  useEffect(() => {
    setSelectedSeries("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedYear]);

  useEffect(() => {
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedSeries]);

  useEffect(() => {
    setSelectedChassis("");
  }, [selectedEngineKey]);

  // --- Options ---
  const makeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) set.add(v.make);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const modelOptions = useMemo(() => {
    if (!selectedMake) return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      if (v.make === selectedMake) set.add(v.model);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles, selectedMake]);

  const yearOptions = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    const set = new Set<number>();
    for (const v of vehicles) {
      if (v.make === selectedMake && v.model === selectedModel) {
        for (let y = v.year_from; y <= v.year_to; y++) set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [vehicles, selectedMake, selectedModel]);

  const seriesOptions = useMemo(() => {
    if (!selectedMake || !selectedModel || selectedYear === "") return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        selectedYear <= v.year_to
      ) {
        if (v.series) set.add(v.series);
        else set.add(""); // allow blank series group
      }
    }
    // Put blank series last (or first? your call)
    const arr = Array.from(set);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [vehicles, selectedMake, selectedModel, selectedYear]);

  const engineOptions = useMemo(() => {
    if (!selectedMake || !selectedModel || selectedYear === "" || selectedSeries === "") return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      const seriesVal = v.series ?? "";
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        selectedYear <= v.year_to &&
        seriesVal === selectedSeries
      ) {
        set.add(engineKey(v));
      }
    }
    const arr = Array.from(set);
    arr.sort((a, b) => engineLabelFromKey(a).localeCompare(engineLabelFromKey(b)));
    return arr;
  }, [vehicles, selectedMake, selectedModel, selectedYear, selectedSeries]);

  const chassisOptions = useMemo(() => {
    if (
      !selectedMake ||
      !selectedModel ||
      selectedYear === "" ||
      selectedSeries === "" ||
      !selectedEngineKey
    )
      return [];

    const set = new Set<string>();
    for (const v of vehicles) {
      const seriesVal = v.series ?? "";
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        selectedYear <= v.year_to &&
        seriesVal === selectedSeries &&
        engineKey(v) === selectedEngineKey
      ) {
        if (v.chassis) set.add(v.chassis);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles, selectedMake, selectedModel, selectedYear, selectedSeries, selectedEngineKey]);

  // --- Final selected vehicle id (after ALL 6 dropdowns chosen) ---
  const selectedVehicleId = useMemo(() => {
    if (
      !selectedMake ||
      !selectedModel ||
      selectedYear === "" ||
      selectedSeries === "" ||
      !selectedEngineKey ||
      !selectedChassis
    )
      return null;

    const match = vehicles.find((v) => {
      const seriesVal = v.series ?? "";
      const chassisVal = v.chassis ?? "";
      return (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        selectedYear <= v.year_to &&
        seriesVal === selectedSeries &&
        engineKey(v) === selectedEngineKey &&
        chassisVal === selectedChassis
      );
    });

    return match?.id ?? null;
  }, [
    vehicles,
    selectedMake,
    selectedModel,
    selectedYear,
    selectedSeries,
    selectedEngineKey,
    selectedChassis,
  ]);

  // --- Load compatible parts when selectedVehicleId changes ---
  useEffect(() => {
    let cancelled = false;

    async function loadParts(vehicleId: string) {
      setLoadingParts(true);
      setPartsError(null);

      // Pull parts via fitments join (requires FK: fitments.part_id -> parts.id)
      const { data, error } = await supabase
        .from("fitments")
        .select("part:part_id(id, brand, part_number, name, category)")
        .eq("vehicle_id", vehicleId);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setParts([]);
        setPartsError(error.message);
      } else {
        const rows = data ?? [];
        const mapped = rows
  .map((r: any) => r.part)
  .filter(Boolean) as PartRow[];
        // Sort nice
        mapped.sort((a, b) => {
          const ca = (a.category ?? "").localeCompare(b.category ?? "");
          if (ca !== 0) return ca;
          const ba = (a.brand ?? "").localeCompare(b.brand ?? "");
          if (ba !== 0) return ba;
          return (a.part_number ?? "").localeCompare(b.part_number ?? "");
        });
        setParts(mapped);
      }

      setLoadingParts(false);
    }

    if (!selectedVehicleId) {
      setParts([]);
      setPartsError(null);
      return;
    }

    loadParts(selectedVehicleId);

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  // --- Quick search matches (click to apply selection) ---
  const searchMatches = useMemo(() => {
    const q = norm(query);
    if (!q) return [];

    const scored: Array<{ v: VehicleRow; score: number }> = [];
    for (const v of vehicles) {
      const hay = norm(
        `${v.make} ${v.model} ${v.year_from}-${v.year_to} ${v.series ?? ""} ${v.engine_code ?? ""} ${
          v.engine_litres ?? ""
        } ${v.fuel_type ?? ""} ${v.chassis ?? ""}`
      );
      if (!hay.includes(q)) continue;

      // small scoring boost for make/model hits
      let score = 1;
      if (norm(v.make).includes(q)) score += 2;
      if (norm(v.model).includes(q)) score += 2;
      scored.push({ v, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.v);
  }, [vehicles, query]);

  useEffect(() => {
  setSearchActiveIndex(0);
}, [query]);

function onQuickSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  // If dropdown isn't open, only handle Escape to clear
  if (!query.trim() || searchMatches.length === 0) {
    if (e.key === "Escape") setQuery("");
    return;
  }

  if (e.key === "ArrowDown") {
  e.preventDefault();
  setSearchActiveIndex((i) =>
    i + 1 >= searchMatches.length ? 0 : i + 1
  );
  return;
}

  if (e.key === "ArrowUp") {
  e.preventDefault();
  setSearchActiveIndex((i) =>
    i - 1 < 0 ? searchMatches.length - 1 : i - 1
  );
  return;
}

  if (e.key === "Enter") {
  e.preventDefault();

  const idx = Math.min(
    Math.max(searchActiveIndex, 0),
    searchMatches.length - 1
  );
  const v = searchMatches[idx];
  if (!v) return;

  applyVehicle(v);
  setQuery("");
  return;
}

  if (e.key === "Escape") {
    setQuery("");
    return;
  }
}

  function applyVehicle(v: VehicleRow) {
    setSelectedMake(v.make);
    setSelectedModel(v.model);

    // choose a representative year within range (prefer year_from)
    const y = v.year_from;
    setSelectedYear(y);

    setSelectedSeries(v.series ?? "");
    setSelectedEngineKey(engineKey(v));
    setSelectedChassis(v.chassis ?? "");
  }

  function clearAll() {
    setQuery("");
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
    setSelectedChassis("");
    setSelectedCategory("");
    setParts([]);
    setPartsError(null);
  }

  const categories = useMemo(() => {
  const set = new Set<string>();
  for (const p of parts) {
    if (p?.category) set.add(p.category);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}, [parts]);

const filteredParts = useMemo(() => {
  if (!selectedCategory) return parts;
  return parts.filter((p) => p.category === selectedCategory);
}, [parts, selectedCategory]);

const partsCountLabel = useMemo(() => {
  if (!selectedVehicleId) return "";
  if (loadingParts) return "Loading...";
  return `${filteredParts.length} found`;
}, [selectedVehicleId, loadingParts, filteredParts.length]);

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Vehicle Parts Catalogue</h1>
            <p className="mt-2 text-sm text-white/70">
              Select <span className="font-medium text-white/90">Make → Model → Year → Series → Engine → Chassis</span>{" "}
              to view compatible parts.
            </p>
          </div>

          <button
            onClick={clearAll}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Clear Search
          </button>
        </div>

        {/* Quick search */}
        <div className="mt-10">
          <label className="text-sm font-semibold text-white/90">Quick search (optional)</label>
          <div className="mt-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onQuickSearchKeyDown}
              placeholder="Type: Hilux 1GD, Ranger 2018 3.2, Corolla…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            />
            {query.trim() && searchMatches.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14]">
                {searchMatches.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                onMouseEnter={() => setSearchActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyVehicle(v);
                  setQuery("");
                }}
                className={[
                  "block w-full px-4 py-2 text-left text-sm",
                  idx === searchActiveIndex ? "bg-white/10" : "hover:bg-white/5",
                ].join(" ")}
              >
                {vehicleCardLabel(v)}
              </button>
            ))}
              </div>
            )}
          </div>
        </div>

        {/* Dropdowns */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6">
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            disabled={loadingVehicles}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">{loadingVehicles ? "Loading…" : "Select Make"}</option>
            {makeOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedMake}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">Select Model</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear === "" ? "" : String(selectedYear)}
            onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : "")}
            disabled={!selectedMake || !selectedModel}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">Select Year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {yearLabel(y)}
              </option>
            ))}
          </select>

          <select
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
            disabled={!selectedMake || !selectedModel || selectedYear === ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">Select Series</option>
            {seriesOptions.map((s) => (
              <option key={s || "__blank__"} value={s}>
                {s || "—"}
              </option>
            ))}
          </select>

          <select
            value={selectedEngineKey}
            onChange={(e) => setSelectedEngineKey(e.target.value)}
            disabled={!selectedMake || !selectedModel || selectedYear === "" || selectedSeries === ""}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">Select Engine</option>
            {engineOptions.map((k) => (
              <option key={k} value={k}>
                {engineLabelFromKey(k)}
              </option>
            ))}
          </select>

          <select
            value={selectedChassis}
            onChange={(e) => setSelectedChassis(e.target.value)}
            disabled={!selectedEngineKey}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:opacity-50"
          >
            <option value="">Select Chassis</option>
            {chassisOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Parts */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Compatible Parts</h2>
            <div className="text-sm text-white/60">{partsCountLabel}</div>
          </div>

          {/* Category Filter */}
<div className="mt-3 flex flex-wrap items-center gap-3">
  <label className="text-sm text-white/70">Category</label>

  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
    disabled={!selectedVehicleId || loadingParts}
  >
    <option value="">All categories</option>
    {categories.map((c) => (
      <option key={c} value={c} className="text-black">
        {c}
      </option>
    ))}
  </select>

  {selectedCategory && (
    <button
      type="button"
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
      onClick={() => setSelectedCategory("")}
    >
      Clear
    </button>
  )}
</div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            {!selectedVehicleId ? (
              <div className="text-sm text-white/60">
                Select all dropdowns (Make, Model, Year, Series, Engine, Chassis) to view parts.
              </div>
            ) : loadingParts ? (
              <div className="text-sm text-white/60">Loading parts…</div>
            ) : partsError ? (
              <div className="text-sm text-red-300">
                Error loading parts: <span className="font-mono">{partsError}</span>
              </div>
            ) : parts.length === 0 ? (
              <div className="text-sm text-white/60">No parts linked to this vehicle + engine + chassis yet.</div>
            ) : (
              <div className="space-y-3">
                {filteredParts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/part/${p.id}`}
                    className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-black/30"
                  >
                    <div className="text-xs text-white/60">{p.category}</div>
                    <div className="mt-1 font-semibold">
                      {p.brand} {p.part_number}
                    </div>
                    <div className="text-sm text-white/70">{p.name}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}