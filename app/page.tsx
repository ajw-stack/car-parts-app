// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import { supabase } from "./lib/supabaseClient";
import { makeSlug } from "./lib/makes";

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
  notes: string | null;
};

type PartRow = {
  id: string;
  brand: string;
  part_number: string;
  name: string;
  category: string;
};

function engineKey(v: VehicleRow) {
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

function formatEngineLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const litre = parts.find((p) => /^\d+(\.\d+)?L$/i.test(p));
  const kw = parts.find((p) => /^\d+kW$/i.test(p));
  const carb = parts.find((p) => /carb/i.test(p));
  const rest = parts.filter((p) => p !== litre && p !== kw && p !== carb);
  return [litre, ...rest, kw, carb].filter(Boolean).join(" ");
}

function renderEngineLabel(label: string, blueKw = false) {
  const parts = formatEngineLabel(label)
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part, i) => (
    <span key={`${part}-${i}`}>
      {i > 0 ? " • " : ""}
      {blueKw && part.includes("kW") ? (
        <span className="kw">{part}</span>
      ) : (
        part
      )}
    </span>
  ));
}

type TypeaheadInputProps = {
  value: string;
  displayValue?: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  renderOption?: (option: string) => React.ReactNode;
};

function TypeaheadInput({
  value,
  displayValue,
  onChange,
  options,
  placeholder,
  disabled,
  renderOption,
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
        value={displayValue ?? value}
        disabled={disabled}
        placeholder={placeholder}
        readOnly
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-full rounded-xl border border-[#DCDCDC] bg-white px-4 py-2 text-sm text-[#0F0F0F] hover:bg-[#F5F5F5] hover:border-[#CCCCCC] cursor-pointer"
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
              {renderOption ? renderOption(o) : o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  // Makes — loaded once on mount (distinct makes only)
  const [makes, setMakes] = useState<string[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(true);

  // Vehicles — loaded per selected make
  const [makeVehicles, setMakeVehicles] = useState<VehicleRow[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Structured selector state
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedEngineKey, setSelectedEngineKey] = useState("");
  const [selectedChassis, setSelectedChassis] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");

  // Results
  const [parts, setParts] = useState<PartRow[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);

  // --- Load distinct makes once on mount (database-level DISTINCT via RPC) ---
  useEffect(() => {
    let cancelled = false;

    async function loadMakes() {
      setLoadingMakes(true);

      const { data, error } = await supabase.rpc("get_vehicle_makes");

      if (cancelled) return;
      if (error) {
        console.error("get_vehicle_makes RPC error:", error);
        setLoadingMakes(false);
        return;
      }

      // RPC returns [{ make: "..." }, ...] — already sorted and filtered by the function
      const result = (data ?? []).map((row: { make: string }) => row.make);
      setMakes(result);
      console.log(`Loaded ${result.length} distinct makes`);
      setLoadingMakes(false);
    }

    loadMakes();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Load vehicles for selected make ---
  useEffect(() => {
    if (!selectedMake) {
      setMakeVehicles([]);
      return;
    }

    let cancelled = false;

    async function loadMakeVehicles() {
      setLoadingVehicles(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, make, model, year_from, year_to, month_from, month_to, series, trim_code, engine_code, engine_config, engine_kw, engine_litres, fuel_type, chassis, notes"
        )
        .eq("make", selectedMake);

      if (cancelled) return;
      if (error) {
        console.error(error);
        setMakeVehicles([]);
        setLoadingVehicles(false);
        return;
      }

      setMakeVehicles((data ?? []) as VehicleRow[]);
      console.log(`Loaded ${data?.length ?? 0} vehicles for ${selectedMake}`);
      setLoadingVehicles(false);
    }

    loadMakeVehicles();
    return () => {
      cancelled = true;
    };
  }, [selectedMake]);

  // --- Cascading resets ---
  useEffect(() => {
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedTrim("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedMake]);

  useEffect(() => {
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedTrim("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedModel]);

  useEffect(() => {
    setSelectedTrim("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedYear]);

  useEffect(() => {
    setSelectedTrim("");
    setSelectedEngineKey("");
    setSelectedChassis("");
  }, [selectedSeries]);

  // --- Options ---
  const makeOptions = useMemo(() => makes, [makes]);

  const modelOptions = useMemo(() => {
    if (!selectedMake) return [];
    const set = new Set<string>();
    for (const v of makeVehicles) {
      if (v.make === selectedMake) set.add(v.model);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [makeVehicles, selectedMake]);

  const yearOptions = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    const currentYear = new Date().getFullYear();
    const set = new Set<number>();
    for (const v of makeVehicles) {
      if (v.make === selectedMake && v.model === selectedModel) {
        const start = v.year_from;
        const end = v.year_to ?? currentYear;
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        if (end < start) continue;
        for (let y = start; y <= end; y++) set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [makeVehicles, selectedMake, selectedModel]);

  const seriesOptions = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    const set = new Set<string>();
    for (const v of makeVehicles) {
      if (v.make !== selectedMake || v.model !== selectedModel) continue;
      if (
        selectedYear !== "" &&
        !(
          selectedYear >= v.year_from &&
          (v.year_to === null || selectedYear <= v.year_to)
        )
      )
        continue;
      if (v.series) set.add(v.series);
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All", ...arr];
  }, [makeVehicles, selectedMake, selectedModel, selectedYear]);

  // Auto-select "All" when model has no series variants
  useEffect(() => {
    if (!selectedMake || !selectedModel) return;
    if (seriesOptions.length === 1 && seriesOptions[0] === "All") {
      setSelectedSeries("All");
      return;
    }
    if (
      selectedSeries &&
      selectedSeries !== "All" &&
      !seriesOptions.includes(selectedSeries)
    ) {
      setSelectedSeries("");
      setSelectedEngineKey("");
    }
  }, [seriesOptions, selectedMake, selectedModel]);

  const trimOptions = useMemo(() => {
    if (!selectedMake || !selectedModel || selectedYear === "") return [];
    const set = new Set<string>();
    for (const v of makeVehicles) {
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        (selectedSeries === "All" || v.series === selectedSeries) &&
        selectedYear >= v.year_from &&
        (v.year_to === null || selectedYear <= v.year_to) &&
        (!selectedEngineKey ||
          engineLabelFromKey(engineKey(v)) === selectedEngineKey)
      ) {
        if (v.trim_code) set.add(v.trim_code);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [
    makeVehicles,
    selectedMake,
    selectedModel,
    selectedYear,
    selectedSeries,
    selectedEngineKey,
  ]);

  const formatEngineLabelInline = (label: any) => {
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
    if (!selectedMake || !selectedModel) return [];
    const set = new Set<string>();
    for (const v of makeVehicles) {
      const seriesVal = v.series ?? "";
      const seriesMatch =
        !selectedSeries ||
        selectedSeries === "All" ||
        seriesVal === selectedSeries;
      const yearMatch =
        selectedYear === "" ||
        (selectedYear >= v.year_from &&
          (v.year_to === null || selectedYear <= v.year_to));
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        yearMatch &&
        seriesMatch &&
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
      return getL(a) - getL(b);
    });
    return arr;
  }, [
    makeVehicles,
    selectedMake,
    selectedModel,
    selectedYear,
    selectedSeries,
    selectedTrim,
  ]);

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
        notes: string | null;
        month_from: number | null;
        year_from: number;
        month_to: number | null;
        year_to: number | null;
      }
    >();

    for (const v of makeVehicles) {
      const seriesVal = v.series ?? "";
      if (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        (v.year_to === null || selectedYear <= v.year_to) &&
        (selectedSeries === "All" ||
          seriesVal === selectedSeries ||
          (seriesVal === "" && selectedSeries === "")) &&
        (!selectedEngineKey ||
          engineLabelFromKey(engineKey(v)) === selectedEngineKey)
      ) {
        if (v.chassis) {
          const labelKey = `${v.chassis}|${v.notes ?? ""}|${v.month_from ?? ""}|${v.year_from}|${v.month_to ?? ""}|${v.year_to ?? ""}`;
          map.set(labelKey, {
            chassis: v.chassis,
            notes: v.notes ?? null,
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
      if ((a.month_from ?? 0) !== (b.month_from ?? 0))
        return (b.month_from ?? 0) - (a.month_from ?? 0);
      return a.chassis.localeCompare(b.chassis);
    });
    return arr;
  }, [
    makeVehicles,
    selectedMake,
    selectedModel,
    selectedYear,
    selectedSeries,
    selectedEngineKey,
  ]);

  useEffect(() => {
    if (!selectedChassis) return;
    const stillValid = chassisOptions.some((c) =>
      selectedChassis.includes(c.chassis)
    );
    if (!stillValid) setSelectedChassis("");
  }, [chassisOptions, selectedChassis]);

  useEffect(() => {
    if (selectedTrim && !trimOptions.includes(selectedTrim)) {
      setSelectedTrim("");
    }
  }, [trimOptions]);

  // --- Final selected vehicle id ---
  const selectedVehicleId = useMemo(() => {
    if (
      !selectedMake ||
      !selectedModel ||
      selectedYear === "" ||
      selectedSeries === "" ||
      !selectedEngineKey
    )
      return null;

    const match = makeVehicles.find((v) => {
      const seriesVal = v.series ?? "";
      const chassisVal = v.chassis ?? "";
      return (
        v.make === selectedMake &&
        v.model === selectedModel &&
        selectedYear >= v.year_from &&
        (v.year_to === null || selectedYear <= v.year_to) &&
        (selectedSeries === "All" || seriesVal === selectedSeries) &&
        (!selectedEngineKey ||
          engineLabelFromKey(engineKey(v)) === selectedEngineKey) &&
        (!selectedTrim || v.trim_code === selectedTrim) &&
        (!selectedChassis || (chassisVal !== '' && selectedChassis.includes(`• ${chassisVal}`)))
      );
    });

    return match?.id ?? null;
  }, [
    makeVehicles,
    selectedMake,
    selectedModel,
    selectedYear,
    selectedSeries,
    selectedEngineKey,
    selectedChassis,
  ]);


  function clearAll() {
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSeries("");
    setSelectedEngineKey("");
    setSelectedChassis("");
    setParts([]);
    setPartsError(null);
  }

  const filteredParts = parts;

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

          {/* Vehicle selector */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[#0F0F0F]">
                Vehicle selector
              </label>
              <button
                onClick={clearAll}
                className="rounded-xl border border-[#DCDCDC] bg-white px-4 py-2 text-sm font-medium text-[#0F0F0F] hover:border-[#CCCCCC] hover:bg-[#F5F5F5]"
              >
                Clear
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-5">
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
                placeholder={loadingMakes ? "Loading..." : "Select Make"}
                disabled={loadingMakes}
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
                placeholder={loadingVehicles ? "Loading..." : "Select Model"}
                disabled={!selectedMake || loadingVehicles}
              />

              <TypeaheadInput
                value={selectedYear === "" ? "" : String(selectedYear)}
                onChange={(v) => {
                  const n = v ? Number(v) : "";
                  setSelectedYear(
                    Number.isFinite(n as number) ? (n as number) : ""
                  );
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
                disabled={!selectedMake || !selectedModel}
              />

              <TypeaheadInput
                value={selectedEngineKey}
                displayValue={
                  selectedEngineKey
                    ? formatEngineLabelInline(
                        engineLabelFromKey(selectedEngineKey)
                      )
                    : ""
                }
                onChange={(v) => setSelectedEngineKey(v)}
                options={engineOptions}
                placeholder="Engine"
                disabled={!selectedMake || !selectedModel}
                renderOption={(o) => renderEngineLabel(o, true)}
              />

              <TypeaheadInput
                value={selectedTrim}
                onChange={(v) => {
                  const nextTrim = v === "Show All" ? "" : v;
                  setSelectedTrim(nextTrim);

                  const yearNum = Number(selectedYear);
                  const engineStillValid = makeVehicles.some((row) => {
                    const seriesVal = row.series ?? "";
                    return (
                      row.make === selectedMake &&
                      row.model === selectedModel &&
                      yearNum >= row.year_from &&
                      (row.year_to === null || yearNum <= row.year_to) &&
                      (selectedSeries === "All" ||
                        seriesVal === selectedSeries ||
                        (seriesVal === "" && selectedSeries === "")) &&
                      (!nextTrim || row.trim_code === nextTrim) &&
                      engineLabelFromKey(engineKey(row)) === selectedEngineKey
                    );
                  });

                  if (!engineStillValid) setSelectedEngineKey("");
                }}
                options={["Show All", ...trimOptions]}
                placeholder="Trim (Optional)"
                disabled={
                  !selectedMake || !selectedModel || selectedYear === ""
                }
              />

              <TypeaheadInput
                value={selectedChassis}
                onChange={(v) => setSelectedChassis(v)}
                options={chassisOptions.map((c) => {
                  const from =
                    (c.month_from
                      ? String(c.month_from).padStart(2, "0") + "/"
                      : "") + String(c.year_from);
                  const to =
                    c.year_to === null
                      ? "Current"
                      : (c.month_to
                          ? String(c.month_to).padStart(2, "0") + "/"
                          : "") + String(c.year_to);
                  return `${from} → ${to} • ${[
                    c.chassis?.trim(),
                    (c as any).notes?.trim(),
                  ]
                    .filter(Boolean)
                    .join(" — ")}`;
                })}
                placeholder="Chassis / Variant"
                disabled={
                  !selectedMake || !selectedModel || selectedYear === ""
                }
              />
            </div>
          </div>

          {/* Active filter pills */}
          <div className="flex flex-wrap gap-2 mt-3 mb-6">
            {selectedMake && (
              <button
                className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC] text-sm text-[#0F0F0F] hover:bg-[#F5F5F5]"
                onClick={() => {
                  setSelectedMake("");
                  setSelectedModel("");
                  setSelectedYear("");
                  setSelectedSeries("");
                  setSelectedEngineKey("");
                  setSelectedTrim("");
                  setSelectedChassis("");
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
                {formatEngineLabelInline(engineLabelFromKey(selectedEngineKey))}
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

          {/* Selected vehicle card */}
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
                  {formatEngineLabelInline(engineLabelFromKey(selectedEngineKey))}
                </div>
              )}
            </div>
          )}

          {/* Compatible Parts — navigate to dedicated page */}
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-[#0F0F0F]">Compatible Parts</h2>

            <div className="mt-4 rounded-2xl border border-[#DCDCDC] bg-white p-4">
              {!selectedVehicleId ? (
                <div className="text-sm text-[#6A6A6A]">
                  Select Make, Model, Year, Series and Engine to view parts.{" "}
                  <span className="text-[#b40102]">Trim and Chassis are optional.</span>
                </div>
              ) : (
                <button
                  onClick={() =>
                    router.push(`/vehicles/${makeSlug(selectedMake)}/${selectedVehicleId}/parts`)
                  }
                  className="w-full rounded-xl bg-[#1A1A1A] px-6 py-4 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
                >
                  View Compatible Parts →
                </button>
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
