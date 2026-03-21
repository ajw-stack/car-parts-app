// app/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "./components/Header";
import { supabase } from "./lib/supabaseClient";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  month_from: number | null;
  month_to: number | null;
  series: string | null;
  trim_code: string | null;
  engine_code: string | null;
  engine_kw: number | null;
  engine_config: string | null;
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
  return `${v.engine_code ?? ""}|${v.engine_config ?? ""}|${v.engine_kw ?? ""}|${v.engine_litres ?? ""}|${v.fuel_type ?? ""}`;
}

function engineLabelFromKey(key: string) {
  const [code, config, kw, litres, fuel] = key.split("|");

  const litresLabel = litres ? `${Number(litres).toFixed(1)}L` : "";
  const kwLabel = kw ? `${kw}kW` : "";
  const fuelLabel = fuel ?? "";

  const left = [code, config].filter(Boolean).join(" ");
  const parts = [left, kwLabel, litresLabel, fuelLabel].filter(Boolean);

  return parts.length ? parts.join(" ") : "Unknown engine";
}

function vehicleCardLabel(v: VehicleRow) {
  const yr = v.year_from === v.year_to ? `${v.year_from}` : `${v.year_from}-${v.year_to}`;
  const series = v.series ? ` ${v.series}` : "";
const eng = [
  [v.engine_code, (v as any).engine_config].filter(Boolean).join(" "),
  v.engine_kw != null ? `${v.engine_kw}kW` : "",
  v.engine_litres != null ? `${Number(v.engine_litres).toFixed(1)}L` : "",
  v.fuel_type,
]
  .filter(Boolean)
  .join(" | ");
  const chassis = v.chassis ? ` • ${v.chassis}` : "";
  return `${v.make} ${v.model} ${yr}${series} • ${eng}${chassis}`;
}

type TypeaheadInputProps = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
};

function TypeaheadInput({
  value,
  onChange,
  options,
  placeholder,
  disabled
}: TypeaheadInputProps) {

  const [open, setOpen] = useState(false);

const filtered = useMemo(() => {
  return options.slice(0, 50);
}, [options]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

return (
  <div className="relative w-full">
    <input
  name="no-autocomplete-make"
  autoComplete="nope"
  value={value}
  disabled={disabled}
  placeholder={placeholder}
  readOnly
  onClick={() => setOpen(true)}
  onBlur={() => setOpen(false)}
  className="w-full rounded-xl border border-[#DCDCDC] bg-white px-4 py-3 text-[#0F0F0F] hover:bg-[#F5F5F5] hover:border-[#CCCCCC] cursor-pointer"
/>

    {open && filtered.length > 0 && (
      <div className="absolute z-50 mt-1 w-max min-w-full max-h-64 overflow-y-auto rounded-xl border border-[#DCDCDC] bg-white shadow-lg">
        {filtered.map((o) => (
          <button
            key={o}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              select(o);
            }}
            className="block w-full px-4 py-2 text-left text-[#0F0F0F] hover:bg-[#F5F5F5] cursor-pointer whitespace-nowrap"
          >
            {o}
          </button>
        ))}
      </div>
    )}
  </div>
);
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
  const [selectedTrim, setSelectedTrim] = useState(""); 
  
  const applyingQuickSearchRef = useRef(false);

// Quick search
const [query, setQuery] = useState("");

const [searchActiveIndex, _setSearchActiveIndex] = useState(0);
const searchActiveIndexRef = useRef(0);

function setSearchActiveIndex(next: number | ((prev: number) => number)) {
  const v =
    typeof next === "function"
      ? (next as (p: number) => number)(searchActiveIndexRef.current)
      : next;

  searchActiveIndexRef.current = v;
  _setSearchActiveIndex(v);
}

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
  "id, make, model, year_from, year_to, month_from, month_to, series, trim_code, engine_code, engine_config, engine_kw, engine_litres, fuel_type, chassis"
)

      if (cancelled) return;

      if (error) {
        console.error(error);
        setVehicles([]);
} else {
  setVehicles((data ?? []) as VehicleRow[]);
  console.log("vehicles sample:", (data ?? [])[0]);
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
    if (applyingQuickSearchRef.current) return;

setSelectedModel("");
setSelectedYear("");
setSelectedSeries("");
setSelectedTrim("");
setSelectedEngineKey("");
setSelectedChassis("");
  }, [selectedMake]);

  useEffect(() => {
    if (applyingQuickSearchRef.current) return;

setSelectedYear("");
setSelectedSeries("");
setSelectedTrim("");
setSelectedEngineKey("");
setSelectedChassis("");
  }, [selectedModel]);

  useEffect(() => {
    if (applyingQuickSearchRef.current) return;

setSelectedSeries("");
setSelectedTrim("");
setSelectedEngineKey("");
setSelectedChassis("");
  }, [selectedYear]);

  useEffect(() => {
    if (applyingQuickSearchRef.current) return;

setSelectedTrim("");
setSelectedEngineKey("");
setSelectedChassis("");
  }, [selectedSeries]);

useEffect(() => {
  if (applyingQuickSearchRef.current) return;
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

  const currentYear = new Date().getFullYear();
  const set = new Set<number>();

  for (const v of vehicles) {
    if (v.make === selectedMake && v.model === selectedModel) {
      const start = v.year_from;
      const end = v.year_to ?? currentYear; // ✅ null = Current

      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (end < start) continue;

      for (let y = start; y <= end; y++) set.add(y);
    }
  }

 return Array.from(set).sort((a,b) => b - a);
}, [vehicles, selectedMake, selectedModel]);

  const seriesOptions = useMemo(() => {
    if (!selectedMake || !selectedModel || selectedYear === "") return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      if (
  v.make === selectedMake &&
  v.model === selectedModel &&
  selectedYear >= v.year_from &&
  (v.year_to === null || selectedYear <= v.year_to)
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

  const trimOptions = useMemo(() => {
  if (!selectedMake || !selectedModel || selectedYear === "") return [];

  const set = new Set<string>();

for (const v of vehicles) {
if (
  v.make === selectedMake &&
  v.model === selectedModel &&
  v.series === selectedSeries &&
  selectedYear >= v.year_from &&
  (v.year_to === null || selectedYear <= v.year_to) &&
(!selectedEngineKey || engineLabelFromKey(engineKey(v)) === selectedEngineKey)
) {
  if (v.trim_code) set.add(v.trim_code);
}
}

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}, [vehicles, selectedMake, selectedModel, selectedYear, selectedSeries, selectedEngineKey]);

const formatEngineLabel = (label: any) => {
  if (!label || typeof label !== "string") return "";

  const match = label.match(/^(.+?)\s+(?:(\d+)kW\s+)?(\d+(\.\d+)?)L\s+(.+)$/);
  if (!match) return label;

  const code = match[1].replace(/\s*\d+kW$/, "");
  const kw = match[2];
  const litres = match[3];
  const fuel = match[5];

  return kw
    ? `${litres}L • ${code} • ${kw}kW ${fuel}`
    : `${litres}L • ${code} • ${fuel}`;
};

  const engineOptions = useMemo(() => {
    if (!selectedMake || !selectedModel || selectedYear === "" || selectedSeries === "") return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      const seriesVal = v.series ?? "";
if (
  v.make === selectedMake &&
  v.model === selectedModel &&
  selectedYear >= v.year_from &&
  (v.year_to === null || selectedYear <= v.year_to) &&
  (seriesVal === selectedSeries || (seriesVal === "" && selectedSeries === "")) &&
  (!selectedTrim || v.trim_code === selectedTrim)
) {

  set.add(engineLabelFromKey(engineKey(v)));

}
    }
    const arr = Array.from(set);
    arr.sort((a, b) => {
  const getL = (label: string) => {
    const match = label.match(/(\d+(\.\d+)?)L/);
    return match ? parseFloat(match[1]) : 0;
  };

  const aLabel = engineLabelFromKey(a);
  const bLabel = engineLabelFromKey(b);

  return getL(aLabel) - getL(bLabel);
});
    return arr;
 }, [vehicles, selectedMake, selectedModel, selectedYear, selectedSeries, selectedTrim]);

const chassisOptions = useMemo(() => {
  if (
    !selectedMake ||
    !selectedModel ||
    selectedYear === "" ||
    selectedSeries === "" ||
    !selectedEngineKey
  ) {
    return [];
  }

  const map = new Map<
    string,
    {
      chassis: string;
      month_from: number | null;
      year_from: number;
      month_to: number | null;
      year_to: number | null;
    }
  >();

  for (const v of vehicles) {
    const seriesVal = v.series ?? "";
    if (
      v.make === selectedMake &&
      v.model === selectedModel &&
      selectedYear >= v.year_from &&
      (v.year_to === null || selectedYear <= v.year_to) &&
      (seriesVal === selectedSeries || (seriesVal === "" && selectedSeries === "")) &&
!selectedEngineKey ||
engineLabelFromKey(engineKey(v)) === selectedEngineKey
    ) {
      if (v.chassis) {
        const labelKey = `${v.chassis}|${v.month_from ?? ""}|${v.year_from}|${v.month_to ?? ""}|${v.year_to ?? ""}`;
        map.set(labelKey, {
          chassis: v.chassis,
          month_from: v.month_from,
          year_from: v.year_from,
          month_to: v.month_to,
          year_to: v.year_to,
        });
      }
    }
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    if (a.year_from !== b.year_from) return b.year_from - a.year_from;
    if ((a.month_from ?? 0) !== (b.month_from ?? 0)) return (b.month_from ?? 0) - (a.month_from ?? 0);
    return a.chassis.localeCompare(b.chassis);
  });
  return arr;
}, [vehicles, selectedMake, selectedModel, selectedYear, selectedSeries, selectedEngineKey]);

useEffect(() => {
  if (!selectedChassis) return;

const stillValid = chassisOptions.some((c) =>
  selectedChassis.includes(c.chassis)
);

  if (!stillValid) {
    setSelectedChassis("");
  }
}, [chassisOptions, selectedChassis]);

  useEffect(() => {
if (selectedTrim && !trimOptions.includes(selectedTrim)) {
  setSelectedTrim("");
}
}, [trimOptions]);

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
        (v.year_to === null || selectedYear <= v.year_to) &&
        seriesVal === selectedSeries &&
(
  !selectedEngineKey ||
  engineLabelFromKey(engineKey(v)) === selectedEngineKey
) &&
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
  applyingQuickSearchRef.current = true;

  setSelectedMake(v.make ?? "");
  setSelectedModel(v.model ?? "");

  // choose a representative year within range (prefer year_from)
  const y = v.year_from;
  setSelectedYear(typeof y === "number" ? y : "");

  setSelectedSeries(v.series ?? "");
  setSelectedEngineKey(engineKey(v));
  setSelectedChassis(v.chassis ?? "");

  // allow resets again after this update cycle
  queueMicrotask(() => {
    applyingQuickSearchRef.current = false;
  });
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
 <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F0F0F]">
    <Header />

 <main className="flex-1 w-full bg-[#F8FAFC]">
  <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">

        <button
          onClick={clearAll}
          className="rounded-xl border border-[#DCDCDC] bg-white px-4 py-2 text-sm font-medium text-[#0F0F0F] hover:border-[#CCCCCC] hover:bg-[#F5F5F5]"
        >
          Clear Search
        </button>
      </div>

      {/* Quick search */}
      <div className="mt-10">
        <label className="text-sm font-semibold text-[#0F0F0F]">Quick search (optional)</label>
        <div className="mt-3">
<input
  name="vehicle-search"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={onQuickSearchKeyDown}
  placeholder="Type: Hilux 1GD, Ranger 2018 3.2, Corolla…"
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="off"
  spellCheck="false"
  className="w-full rounded-xl border border-[#DCDCDC] bg-white px-4 py-3 text-sm text-[#0F0F0F] placeholder:text-[#6A6A6A] outline-none focus:border-[#BDBDBD]"
/>
          {query.trim() && searchMatches.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#DCDCDC] bg-white">
              {searchMatches.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onMouseEnter={() => setSearchActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyVehicle(v);
                    setQuery("");
                  }}
                  className={[
                    "block w-full px-4 py-2 text-left text-sm text-[#0F0F0F]",
                    idx === searchActiveIndex ? "bg-[#F5F5F5]" : "hover:bg-[#F5F5F5]",
                  ].join(" ")}
                >
                  {vehicleCardLabel(v)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

<div className="flex flex-wrap gap-2 mt-3 mb-6">

{selectedMake && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => {
setSelectedMake("")
setSelectedModel("")
setSelectedYear("")
setSelectedSeries("")
setSelectedEngineKey("")
setSelectedTrim("")
setSelectedChassis("")
}}
>
{selectedMake} 
</button>
)}

{selectedModel && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedModel("")}
>
{selectedModel}
</button>
)}

{selectedYear && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedYear("")}
>
{selectedYear} 
</button>
)}

{selectedSeries && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedSeries("")}
>
{selectedSeries} 
</button>
)}

{selectedEngineKey && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedEngineKey("")}
>
{engineLabelFromKey(selectedEngineKey).split(" ").map((part, i) =>
  part.includes("kW") ? (
    <span key={i} className="kw">{part} </span>
  ) : (
    part + " "
  )
)}
</button>
)}

{selectedTrim && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedTrim("")}
>
{selectedTrim}
</button>
)}

{selectedChassis && (
<button
className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
onClick={() => setSelectedChassis("")}
>
{selectedChassis}
</button>
)}

</div>


        {/* Dropdowns */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
    <TypeaheadInput
  value={selectedMake}
  onChange={(v) => {
    setSelectedMake(v);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
  }}
  options={makeOptions}
  placeholder={loadingVehicles ? "Loading..." : "Select Make"}
  disabled={loadingVehicles}
/>

          <TypeaheadInput
  value={selectedModel}
  onChange={(v) => {
    setSelectedModel(v);
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
  }}
  options={modelOptions}
  placeholder="Select Model"
  disabled={!selectedMake}
/>

          <TypeaheadInput
  value={selectedYear === "" ? "" : String(selectedYear)}
  onChange={(v) => {
    const n = v ? Number(v) : "";
    setSelectedYear(Number.isFinite(n as number) ? (n as number) : "");
    setSelectedSeries("");
    setSelectedEngineKey("");
  }}
  options={yearOptions.map(String)}
  placeholder="Select Year"
  disabled={!selectedMake || !selectedModel}
/>

          <TypeaheadInput
  value={selectedSeries}
  onChange={(v) => {
    setSelectedSeries(v);
    setSelectedEngineKey("");
  }}
  options={seriesOptions}
  placeholder="Select Series"
  disabled={!selectedMake || !selectedModel || selectedYear === ""}
/>

          <TypeaheadInput
  value={selectedEngineKey}
  onChange={(v) => setSelectedEngineKey(v)}
 options={engineOptions}
  placeholder="Engine"
  disabled={!selectedMake || !selectedModel || selectedYear === ""}
/>

<TypeaheadInput
  value={selectedTrim}
  onChange={(v) => {
    const nextTrim = v === "Show All" ? "" : v;
    setSelectedTrim(nextTrim);

    const yearNum = Number(selectedYear);

    const engineStillValid = vehicles.some((row) => {
      const seriesVal = row.series ?? "";

      return (
        row.make === selectedMake &&
        row.model === selectedModel &&
        yearNum >= row.year_from &&
        (row.year_to === null || yearNum <= row.year_to) &&
        (seriesVal === selectedSeries || (seriesVal === "" && selectedSeries === "")) &&
        (!nextTrim || row.trim_code === nextTrim) &&
        engineLabelFromKey(engineKey(row)) === selectedEngineKey
      );
    });

    if (!engineStillValid) {
      setSelectedEngineKey("");
    }
  }}
  options={["Show All", ...trimOptions]}
  placeholder="Trim (Optional)"
  disabled={!selectedMake || !selectedModel || selectedYear === ""}
/>

<TypeaheadInput
  value={selectedChassis}
  onChange={(v) => setSelectedChassis(v)}
  options={chassisOptions.map((c) => {
  const from =
    (c.month_from ? String(c.month_from).padStart(2, "0") + "/" : "") +
    String(c.year_from); // ✅ full year

  const to =
    c.year_to === null
      ? "Current"
      : (c.month_to ? String(c.month_to).padStart(2, "0") + "/" : "") +
        String(c.year_to); // ✅ full year

  return `${from} – ${to} • ${c.chassis}`;
})}
 placeholder="Chassis (Optional)"
  disabled={!selectedMake || !selectedModel || selectedYear === ""}
/>
        </div>

        {/* Parts */}
        {selectedMake && selectedModel && selectedYear && (
<div className="sticky top-0 z-20 mt-6 rounded-xl border border-[#DCDCDC] bg-[#FCFCFC] px-4 py-3 backdrop-blur">
    <div className="text-sm text-[#6A6A6A]">Selected Vehicle</div>
    <div className="text-lg font-semibold">
   {selectedMake} {selectedModel} {selectedSeries} {selectedYear}
{selectedTrim && ` • ${selectedTrim}`}
{selectedChassis && ` • ${selectedChassis}`}
    </div>
    {selectedEngineKey && (
   <div className="text-sm text-[#6A6A6A] mt-1">
 {engineLabelFromKey(selectedEngineKey).split(" ").map((part, i) =>
  part.includes("kW") ? (
    <span key={i} className="kw">{part} </span>
  ) : (
    part + " "
  )
)}
      </div>
    )}
  </div>
)}


{/* Parts */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Compatible Parts</h2>
 <div className="text-sm text-[#6A6A6A]">{partsCountLabel}</div>
          </div>

          {/* Category Filter */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
  <label className="text-sm text-[#6A6A6A]">Category</label>

  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
  className="rounded-xl border border-[#DCDCDC] bg-white px-4 py-3 text-sm text-[#0F0F0F] outline-none"
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
   className="rounded-xl border border-[#DCDCDC] bg-white px-4 py-3 text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
      onClick={() => setSelectedCategory("")}
    >
      Clear
    </button>
  )}
</div>

          <div className="mt-4 rounded-2xl border border-[#DCDCDC] bg-white p-4">
            {!selectedVehicleId ? (
              <div className="text-sm text-[#6A6A6A]">
              Select Make, Model, Year, Series and Engine to view parts. Trim and Chassis are optional.
              </div>
            ) : loadingParts ? (
              <div className="text-sm text-[#6A6A6A]">Loading parts…</div>
            ) : partsError ? (
              <div className="text-sm text-red-300">
                Error loading parts: <span className="font-mono">{partsError}</span>
              </div>
            ) : parts.length === 0 ? (
              <div className="text-sm text-[#6A6A6A]">No parts linked to this vehicle + engine + chassis yet.</div>
            ) : (
              <div className="space-y-3">
                {filteredParts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/part/${p.id}`}
   className="block rounded-xl border border-[#DCDCDC] bg-white px-4 py-3 hover:bg-[#F5F5F5] cursor-pointer"
                  >
                    <div className="text-xs text-[#6A6A6A]">{p.category}</div>
                    <div className="mt-1 font-semibold">
                      {p.brand} {p.part_number}
                    </div>
                    <div className="text-sm text-[#6A6A6A]">{p.name}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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