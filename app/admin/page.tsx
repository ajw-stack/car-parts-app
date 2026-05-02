"use client";

import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabaseClient";
import { formatYearTo } from "../lib/formatYear";
import { useRouter } from "next/navigation";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  month_from: number | null;
  month_to: number | null;
  series: string | null;
  engine_code: string | null;
  engine_config: string | null;
  engine_kw: number | null;
  engine_litres: number | null;
  fuel_type: string | null;
  chassis: string | null;
  trim_code: string | null;
  notes: string | null;
};

type PartRow = {
  id: string;
  brand: string;
  part_number: string;
  name: string;
  category: string;
};

type TypeaheadInputProps = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  onCreate?: (v: string) => void;
  createLabel?: (v: string) => string;
};

type MultiTypeaheadInputProps = {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
};

const TypeaheadInput = forwardRef<HTMLInputElement, TypeaheadInputProps>(function TypeaheadInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  allowCreate,
  onCreate,
  createLabel,
}: TypeaheadInputProps, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((x) => x.toLowerCase().includes(q)).slice(0, 50);
  }, [value, options]);

  const q = value.trim();
  const exists = options.some((o) => o.toLowerCase() === q.toLowerCase());
  const canCreate = !!allowCreate && !!q && !exists;

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full" data-typeahead>
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
       onFocus={() => {
  document
    .querySelectorAll("[data-typeahead-open]")
    .forEach((el) => el.removeAttribute("data-typeahead-open"));

  wrapRef.current?.setAttribute("data-typeahead-open", "true");

  setOpen(true);
  setActive(0);
}}

        onBlur={() => {
          setOpen(false);
        }}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, filtered.length - 1));
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          }

          if (e.key === "Enter") {
            if (filtered[active]) {
              e.preventDefault();
              select(filtered[active]);
            }
          }
        }}
      className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3"
      />

      {open && (filtered.length > 0 || canCreate) && (
    <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-[#D1D5DB] bg-white shadow-lg">

          {filtered.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(opt);
              }}
className={`block w-full px-4 py-2 text-left text-sm text-[#111827] ${
 idx === active
  ? "bg-[#2563EB] text-white"
  : "text-[#111827] hover:bg-[#F9FAFB]"
}`}
            >
              {opt}
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreate?.(q);
                select(q);
              }}
              className="block w-full px-4 py-3 text-left text-sm font-medium hover:bg-white/5"
            >
              {createLabel ? createLabel(q) : `Add "${q}"`}
            </button>
          )}

        </div>
      )}
    </div>
  );
});

const MultiTypeaheadInput = forwardRef<HTMLInputElement, MultiTypeaheadInputProps>(function MultiTypeaheadInput({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  allowCreate,
}: MultiTypeaheadInputProps, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [inputValue, setInputValue] = useState("");

  const q = inputValue.trim();

  const filtered = options
    .filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    .filter((o) => !values.includes(o))
    .slice(0, 12);

  const exists = options.some((o) => o.toLowerCase() === q.toLowerCase());
  const alreadyAdded = values.some((v) => v.toLowerCase() === q.toLowerCase());
  const canCreate = !!allowCreate && !!q && !exists && !alreadyAdded;

  const addValue = (v: string) => {
    const clean = v.trim();
    if (!clean) return;
    if (values.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      setInputValue("");
      setOpen(false);
      return;
    }
    onChange([...values, clean]);
    setInputValue("");
    setOpen(false);
    setActive(0);
  };

  const removeValue = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

return (
  <div
    ref={wrapRef}
    className="relative w-full flex flex-wrap items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-3"
  >
    {values.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((item, idx) => (
          <button
            key={`${item}-${idx}`}
            type="button"
            onClick={() => removeValue(idx)}
            className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1 text-sm hover:bg-white/15"
            title="Remove"
          >
            {item} ×
          </button>
        ))}
      </div>
    )}

    <input
      ref={ref}
      className="flex-1 bg-transparent text-[#111827] placeholder:text-[#6B7280] text-sm outline-none"
      value={inputValue}
      disabled={disabled}
      placeholder={placeholder}
          onFocus={() => {
            document
              .querySelectorAll("[data-typeahead-open]")
              .forEach((el) => el.removeAttribute("data-typeahead-open"));

            wrapRef.current?.setAttribute("data-typeahead-open", "true");
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => {
            setOpen(false);
          }}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, filtered.length - 1));
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }

            if (e.key === "Enter") {
              if (filtered[active]) {
                e.preventDefault();
                addValue(filtered[active]);
                return;
              }

              if (q) {
                e.preventDefault();
                addValue(q);
              }
            }

if (e.key === "Tab") {
  if (open && filtered[active]) {
    e.preventDefault();
    addValue(filtered[active]);

    requestAnimationFrame(() => {
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input, select, button, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));

      const index = focusables.indexOf(e.currentTarget as HTMLElement);
      if (index >= 0 && focusables[index + 1]) {
        focusables[index + 1].focus();
      }
    });

    return;
  }

  if (q) {
    e.preventDefault();
    addValue(q);

    requestAnimationFrame(() => {
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input, select, button, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));

      const index = focusables.indexOf(e.currentTarget as HTMLElement);
      if (index >= 0 && focusables[index + 1]) {
        focusables[index + 1].focus();
      }
    });

    return;
  }

  setOpen(false);
}

            if (e.key === "Backspace" && !inputValue && values.length > 0) {
              e.preventDefault();
              removeValue(values.length - 1);
            }

            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />

    {open && ((filtered.length > 0) || canCreate) && (
    <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-[#D1D5DB] bg-white shadow-lg">
{filtered.map((opt, idx) => (
  <button
    key={opt}
    type="button"
    onMouseEnter={() => setActive(idx)}
    onMouseDown={(e) => {
      e.preventDefault();
      addValue(opt);
    }}
className={`block w-full px-4 py-2 text-left text-sm font-medium ${
idx === active
  ? "bg-[#2563EB] text-white"
  : "text-[#111827] hover:bg-[#F9FAFB]"
}`}
  >
    {opt}
  </button>
))}

        {canCreate && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              addValue(q);
            }}
            className="block w-full px-4 py-3 text-left text-sm font-medium hover:bg-white/5"
          >
            Add "{q}"
          </button>
        )}
      </div>
    )}
  </div>
);
});

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    let mounted = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace("/login");
      }
    }

    guard();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  // --- Vehicle form ---
  const [vMake, setVMake] = useState("");
  const [vModel, setVModel] = useState("");
  const [vYearFrom, setVYearFrom] = useState("");
  const [vYearTo, setVYearTo] = useState("");
  const [vMonthFrom, setVMonthFrom] = useState("");
  const [vMonthTo, setVMonthTo] = useState("");
  const [vSeries, setVSeries] = useState("");
  const [vTrimCode, setVTrimCode] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vEngineCode, setVEngineCode] = useState("");
  const [vEngineKw, setVEngineKw] = useState("");
  const [vEngineLitres, setVEngineLitres] = useState("");
  const [vFuel, setVFuel] = useState("");
  const [vEngineConfig, setVEngineConfig] = useState("");
  const [vChassis, setVChassis] = useState<string[]>([]);

  const makeRef = useRef<HTMLInputElement>(null);

  // --- Part form ---
  const [pBrand, setPBrand] = useState("");
  const [pNumber, setPNumber] = useState("");
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("");

  const brandRef = useRef<HTMLInputElement>(null);

  // --- Fitment form ---
  const [fVehicleLabel, setFVehicleLabel] = useState("");
  const [fPartLabel, setFPartLabel] = useState("");
  const [fNotes, setFNotes] = useState("");

  // --- Cross Reference form ---
  const [xPartA, setXPartA] = useState("");
  const [xPartB, setXPartB] = useState("");

  const canAddXref = xPartA && xPartB && xPartA !== xPartB;

  async function addXref() {
    setMsg("");
    const partA = parts.find((p) => partLabel(p) === xPartA);
    const partB = parts.find((p) => partLabel(p) === xPartB);
    if (!partA || !partB) { setMsg("Could not find one or both parts."); return; }

    const { error } = await supabase.from("cross_references").insert({
      part_id: partA.id,
      cross_part_id: partB.id,
    });

    if (error) {
      setMsg(error.code === "23505" ? "That cross-reference already exists." : `Error: ${error.message}`);
      return;
    }
    setMsg(`Cross-reference added: ${xPartA} ↔ ${xPartB}`);
    setXPartA("");
    setXPartB("");
  }

  async function fetchAllParts() {
    const PAGE = 1000;
    const all: PartRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("parts")
        .select("id, brand, part_number, name, category")
        .order("brand")
        .order("part_number")
        .range(offset, offset + PAGE - 1);
      if (error) { console.error(error); break; }
      if (!data || data.length === 0) break;
      all.push(...(data as PartRow[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    return all;
  }

  async function refreshAll() {
    setLoading(true);
    setMsg("");

    const [{ data: vData, error: vErr }, allParts] =
      await Promise.all([
supabase
  .from("vehicles")
  .select(
    "id, make, model, year_from, year_to, series, engine_code, engine_kw, engine_litres, fuel_type, engine_config, chassis"
  )
  .order("make")
  .order("model")
.order("year_from"),

fetchAllParts(),
      ]);

    if (vErr) console.error(vErr);

    setVehicles((vData ?? []) as VehicleRow[]);
    setParts(allParts as PartRow[]);

    setLoading(false);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const vehicleLabel = (v: VehicleRow) => {
    const yr = `${v.year_from}-${formatYearTo(v.year_to)}`;
    const series = v.series ? ` • ${v.series}` : "";
    const litres = v.engine_litres != null ? ` • ${v.engine_litres}L` : "";
    const fuel = v.fuel_type ? ` • ${v.fuel_type}` : "";
    const code = v.engine_code ? ` • ${v.engine_code}` : "";
    const kw = v.engine_kw != null ? ` • ${v.engine_kw}kW` : "";
    const chassis = v.chassis ? ` • ${v.chassis}` : "";
    return `${v.make} ${v.model} (${yr})${series}${litres}${code}${kw}${fuel}${chassis}`;
  };

  const partLabel = (p: PartRow) =>
    `${p.brand} ${p.part_number} — ${p.name} (${p.category})`;

  // Existing categories (from parts table)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of parts) {
      const c = (p.category ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parts]);

  // Existing makes (from vehicles table)
  const makeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      const m = (v.make ?? "").trim();
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  // Existing models (from vehicles table)
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      const m = (v.model ?? "").trim();
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const makeMatches = useMemo(() => {
    const q = vMake.trim().toLowerCase();
    if (!q) return [];
    return makeOptions
      .filter((m) => m.toLowerCase().includes(q))
      .slice(0, 8);
  }, [vMake, makeOptions]);

  const modelMatches = useMemo(() => {
    const q = vModel.trim().toLowerCase();
    if (!q) return [];
    return modelOptions
      .filter((m) => m.toLowerCase().includes(q))
      .slice(0, 8);
  }, [vModel, modelOptions]);

  const categoryMatches = useMemo(() => {
    const q = pCategory.trim().toLowerCase();
    if (!q) return [];
    return categoryOptions
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pCategory, categoryOptions]);

  const canAddCategory = useMemo(() => {
    const v = pCategory.trim();
    if (!v) return false;
    return !categoryOptions.some((c) => c.toLowerCase() === v.toLowerCase());
  }, [pCategory, categoryOptions]);

  const canAddVehicle =
    vMake.trim() &&
    vModel.trim() &&
    vYearFrom.trim() &&
    vEngineCode.trim() &&
    vFuel.trim() &&
    vChassis.length > 0;

  const canAddPart =
    pBrand.trim() && pNumber.trim() && pName.trim() && pCategory.trim();

  const canAddFitment = fVehicleLabel && fPartLabel;

  async function addVehicle() {
    setMsg("");
    const year_from = Number(vYearFrom);

    const engine_litres: number | null =
      vEngineLitres.trim() === "" ? null : Number(vEngineLitres);

    if (engine_litres !== null && !Number.isFinite(engine_litres)) {
      setMsg("Engine litres must be a number (e.g. 1.5) or blank.");
      return;
    }

    // 0 / 0000 / current → store as 0 (displays as "Current"); blank → null (displays as "TBA")
    const yearToRaw = vYearTo.trim();
    const year_to =
      yearToRaw === ""
        ? null
        : yearToRaw.toLowerCase() === "current" || yearToRaw === "0" || yearToRaw === "0000"
          ? 0
          : Number(yearToRaw);

    // Validate: year_from must be a number; year_to can be null OR a number
    if (!Number.isFinite(year_from) || (year_to !== null && !Number.isFinite(year_to))) {
      setMsg('Year From must be a number, and Year To must be a number or "Current".');
      return;
    }

const rows = vChassis.map((chassis) => ({
  make: vMake.trim(),
  model: vModel.trim(),
  month_from: vMonthFrom ? Number(vMonthFrom) : null,
  year_from,
  month_to: vMonthTo ? Number(vMonthTo) : null,
  year_to,
  series: vSeries.trim() || null,
  trim_code: vTrimCode.trim() || null,
  notes: vNotes.trim() || null,
engine_code: vEngineCode.trim(),
engine_kw: vEngineKw === "" ? null : Number(vEngineKw),
engine_litres: vEngineLitres === "" ? null : Number(vEngineLitres),
fuel_type: vFuel.trim(),
engine_config: vEngineConfig || null,
  chassis: chassis.trim(),
}));

console.log("vMonthFrom:", vMonthFrom, "vMonthTo:", vMonthTo);
console.log("rows being inserted:", rows);
const { error } = await supabase.from("vehicles").insert(rows);

    if (error) {
      console.error(error);
      setMsg(`Vehicle insert failed: ${error.message}`);
      return;
    }

setMsg("Vehicle added.");

setVMake("");
setVModel("");
setVMonthFrom("");
setVYearFrom("");
setVMonthTo("");
setVYearTo("");
setVSeries("");
setVEngineCode("");
setVEngineLitres("");
setVFuel("");
setVChassis([]);

// reload only vehicles so chassis suggestions update
const { data: vehiclesData } = await supabase
  .from("vehicles")
  .select("*")
  .order("make");

if (vehiclesData) {
  setVehicles(vehiclesData);
}

makeRef.current?.focus();

  }

  async function addPart() {
    setMsg("");
    const { error } = await supabase.from("parts").insert({
      brand: pBrand.trim(),
      part_number: pNumber.trim(),
      name: pName.trim(),
      category: pCategory.trim(),
    });

    if (error) {
      console.error(error);
      setMsg(`Part insert failed: ${error.message}`);
      return;
    }

setMsg("Part added.");

setPBrand("");
setPNumber("");
setPName("");
setPCategory("");

// reload only parts so dropdowns update
const allParts = await fetchAllParts();
setParts(allParts as PartRow[]);

brandRef.current?.focus();
  }

  async function addFitment() {
    setMsg("");

    const vehicle = vehicles.find((v) => vehicleLabel(v) === fVehicleLabel);
    const part = parts.find((p) => partLabel(p) === fPartLabel);
    if (!vehicle || !part) { setMsg("Could not find the selected vehicle or part."); return; }

    const { error } = await supabase.from("fitments").insert({
      vehicle_id: vehicle.id,
      part_id: part.id,
      notes: fNotes.trim() ? fNotes.trim() : null,
    });

    if (error) {
      console.error(error);
      setMsg(`Fitment insert failed: ${error.message}`);
      return;
    }

    setMsg("Fitment added (vehicle linked to part).");
    setFNotes("");
  }

return (
  <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
    <Header />

    <main className="flex-1 w-full bg-[#F3F4F6]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
<h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">
  Admin
</h1>

<p className="mt-2 text-sm text-[#374151]">
  Add Vehicles, Parts, then link them via Fitments.
</p>
          </div>


          <div className="flex gap-2">
            <button
              onClick={refreshAll}
              className="rounded-xl border border-[#0C0C0C] bg-[#1A1A1A] px-4 py-3 text-sm text-white hover:bg-[#222]"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-[#0C0C0C] bg-[#1A1A1A] px-4 py-3 text-sm text-white hover:bg-[#222]"
            >
              Log Out
            </button>
          </div>
        </div>

{msg && (
  <div className="mt-6 rounded-xl border border-[#0C0C0C] bg-[#141414] px-4 py-3 text-sm text-white">
    {msg}
  </div>
)}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Add Vehicle */}
        <section className="rounded-2xl border border-[#0C0C0C] bg-[#141414] p-5">
           <h2 className="text-lg font-semibold text-white">Add Vehicle Variant</h2>
<p className="mt-1 text-xs text-zinc-400">
  Each entry represents a distinct vehicle configuration.
</p>


            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 relative">

                <TypeaheadInput
                  ref={makeRef}
                  value={vMake}
                  onChange={setVMake}
                  options={Array.from(new Set(vehicles.map((v) => v.make))).sort()}
                  placeholder="Make (e.g. Ford)"
                />

              </div>
              <div className="col-span-2 relative">

                <TypeaheadInput
                  value={vModel}
                  onChange={setVModel}
                  options={Array.from(
                    new Set(
                      vehicles
                        .filter((v) => !vMake || v.make === vMake)
                        .map((v) => v.model)
                    )
                  ).sort()}
                  placeholder="Model (e.g. Ranger)"
                  disabled={!vMake}
                />

              </div>
              <div className="grid grid-cols-2 gap-3 col-span-2">
                <select
        className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
                  value={vMonthFrom}
                  onChange={(e) => setVMonthFrom(e.target.value)}
                >
<option value="">Month</option>

{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
  <option key={m} value={String(m).padStart(2, "0")}>
    {String(m).padStart(2, "0")}
  </option>
))}
                </select>

                <input
         className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
                  placeholder="Year From (e.g. 2016)"
                  value={vYearFrom}
                  onChange={(e) => setVYearFrom(e.target.value)}
                />

                <select
        className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
                  value={vMonthTo}
                  onChange={(e) => setVMonthTo(e.target.value)}
                >
                  <option value="">Month</option>

                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>

                <input
       className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
                  placeholder="Year To (e.g. 2022, 0=Current, blank=TBA)"
                  value={vYearTo}
                  onChange={(e) => setVYearTo(e.target.value)}
                />
              </div>

              <TypeaheadInput
                value={vSeries}
                onChange={setVSeries}
                options={Array.from(
                  new Set(
                    vehicles
                      .filter(
                        (v) =>
                          (!vMake || v.make === vMake) &&
                          (!vModel || v.model === vModel)
                      )
                      .map((v) => v.series ?? "")
                  )
                )

                  .sort()}
                placeholder="Series (e.g. PX2)"
                disabled={!vMake || !vModel}
              />

              <TypeaheadInput
                value={vTrimCode}
                onChange={setVTrimCode}
                options={Array.from(
                  new Set(
                    vehicles
                      .filter((v) => (!vMake || v.make === vMake) && (!vModel || v.model === vModel))
                      .map((v) => (v.trim_code ?? "").trim())
                  )
                )
                  .sort()}
                placeholder="Trim/Sub-model (e.g. Berlina, SS, SV6)"
                disabled={!vMake || !vModel}
              />

              <input
  className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-2"
  type="text"
  value={vNotes}
  onChange={(e) => setVNotes(e.target.value)}
  placeholder="Notes (e.g. Pre-facelift, Facelift)"
/>

              <TypeaheadInput
                value={vEngineCode}
                onChange={setVEngineCode}
                options={Array.from(
                  new Set(
                    vehicles
                      .filter((v) => (!vMake || v.make === vMake) && (!vModel || v.model === vModel))
                      .map((v) => v.engine_code ?? "")
                  )
                ).filter(Boolean).sort()}
                placeholder="Engine Code (e.g. P5AT)"
                disabled={false}
              />

  <input
  className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none"
  type="number"
  value={vEngineKw}
  onChange={(e) => setVEngineKw(e.target.value)}
  placeholder="Engine kW"
/>

  <input
  className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
  placeholder="Engine Litres (e.g. 3.2)"
  value={vEngineLitres}
  onChange={(e) => setVEngineLitres(e.target.value)}
/>
<select
  className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
  value={vFuel}
  onChange={(e) => setVFuel(e.target.value)}
>
                <option value="">Fuel (select)</option>
                <option value="Petrol">Petrol</option>
                <option value="Supercharged V6">Petrol Supercharged V6</option>
                <option value="Turbo Petrol">Turbo Petrol</option>
                <option value="Turbo Diesel">Turbo Diesel</option>
                <option value="Carbureted">Carbureted Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="LPG">LPG</option>
                <option value="Petrol/LPG">Petrol/LPG</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
                <option value="CNG">CNG</option>
                <option value="E85">E85</option>
                <option value="Hydrogen">Hydrogen</option>
                <option value="Other">Other</option>
              </select>

<input
  className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none"
  value={vEngineConfig}
  onChange={(e) => setVEngineConfig(e.target.value)}
  placeholder="Engine config (e.g. V6, V8, Inline-4)"
/>

              <MultiTypeaheadInput
  values={vChassis}
  onChange={setVChassis}
options={Array.from(
  new Set(
    vehicles
      .map((v) => (v.chassis ?? "").trim())
      .filter(Boolean)
  )
).sort()}
  placeholder="Chassis (press Enter to add)"
  disabled={!vMake || !vModel}
  allowCreate
/>
            </div>

            <button
              disabled={!canAddVehicle}
              onClick={addVehicle}
    className="mt-4 w-full rounded-xl bg-[#3A3A3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4A4A4A] disabled:opacity-40 cursor-pointer"
            >
              Add Vehicle
            </button>
          </section>

          {/* Add Part */}
<section className="rounded-2xl border border-[#0C0C0C] bg-[#141414] p-5">
  <h2 className="text-lg font-semibold text-white">Add Part</h2>

  <div className="mt-4 grid grid-cols-2 gap-3">
    <TypeaheadInput
      ref={brandRef}
      value={pBrand}
      onChange={setPBrand}
      options={Array.from(new Set(parts.map((p) => p.brand))).sort()}
      placeholder="Brand (e.g. Ryco)"
    />

              <input
        className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
                placeholder="Part # (e.g. R2690P)"
                value={pNumber}
                onChange={(e) => setPNumber(e.target.value)}
              />

              <div className="col-span-2 relative">
                <TypeaheadInput
                  value={pName}
                  onChange={setPName}
                  options={Array.from(new Set(parts.map((p) => p.name))).filter(Boolean).sort()}
                  placeholder="Name"
                />
              </div>

              <div className="col-span-2">
                <TypeaheadInput
                  value={pCategory}
                  onChange={setPCategory}
                  options={Array.from(new Set(parts.map((p) => p.category))).sort()}
                  placeholder='Category (e.g. Oil Filter)'
                />
              </div>
            </div>

            <button
              disabled={!canAddPart}
              onClick={addPart}
        className="mt-4 w-full rounded-xl bg-[#3A3A3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4A4A4A] disabled:opacity-40 cursor-pointer"
            >
              Add Part
            </button>
          </section>
        </div>

        {/* Add Fitment */}
        <section className="mt-6 rounded-2xl border border-[#0C0C0C] bg-[#141414] p-5">
          <h2 className="text-lg font-semibold text-white">Add Fitment (Link Vehicle ↔ Part)</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <TypeaheadInput
              value={fVehicleLabel}
              onChange={setFVehicleLabel}
              options={vehicles.map(vehicleLabel).sort()}
              placeholder="Search vehicle…"
            />

            <TypeaheadInput
              value={fPartLabel}
              onChange={setFPartLabel}
              options={parts.map(partLabel).sort()}
              placeholder="Search part…"
            />

            <input
       className="w-full rounded-xl border border-[#D1D5DB] bg-white text-[#111827] px-4 py-3 outline-none focus:border-[#9CA3AF]"
              placeholder="Notes (optional)"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
            />
          </div>

          <button
            disabled={!canAddFitment}
            onClick={addFitment}
  className="mt-4 w-full rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            Add Fitment
          </button>

          <div className="mt-3 text-xs text-[#6B7280]">
            {loading
              ? "Loading…"
              : `Vehicles: ${vehicles.length} • Parts: ${parts.length}`}
          </div>
        </section>

        {/* Cross Reference */}
        <section className="mt-6 rounded-2xl border border-[#0C0C0C] bg-[#141414] p-5">
          <h2 className="text-lg font-semibold text-white">Add Cross Reference</h2>
          <p className="mt-1 text-xs text-zinc-400">Link two equivalent parts from different brands.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <TypeaheadInput
              value={xPartA}
              onChange={setXPartA}
              options={parts.map(partLabel).sort()}
              placeholder="Part A"
            />
            <TypeaheadInput
              value={xPartB}
              onChange={setXPartB}
              options={parts.map(partLabel).sort()}
              placeholder="Part B"
            />
          </div>

          <button
            disabled={!canAddXref}
            onClick={addXref}
            className="mt-4 w-full rounded-xl bg-[#3A3A3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4A4A4A] disabled:opacity-40 cursor-pointer"
          >
            Add Cross Reference
          </button>
        </section>
      </div>
    </main>

    <Footer />
  </div>
)
}