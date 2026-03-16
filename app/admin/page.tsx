"use client";

import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  month_from: number | null;
  month_to: number | null;
  series: string | null;
  engine_code: string | null;
  engine_litres: number | null;
  fuel_type: string | null;
  chassis: string | null;
  trim_code: string | null;
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
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
      />

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#0b0f14]">

          {filtered.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(opt);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${idx === active ? "bg-white/10" : "hover:bg-white/5"
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
              className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-white/5"
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
    <div ref={wrapRef} className="relative w-full" data-typeahead>
      <div className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        {values.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {values.map((item, idx) => (
              <button
                key={`${item}-${idx}`}
                type="button"
                onClick={() => removeValue(idx)}
                className="rounded-lg bg-white/10 px-2 py-1 text-sm hover:bg-white/15"
                title="Remove"
              >
                {item} ×
              </button>
            ))}
          </div>
        )}

        <input
          ref={ref}
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
  if (q) {
    if (filtered[active]) {
      e.preventDefault();
      addValue(filtered[active]);
    } else {
      e.preventDefault();
      addValue(q);
    }

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
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {open && ((filtered.length > 0) || canCreate) && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#111] shadow-2xl">
          {filtered.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(opt);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${idx === active ? "bg-white/10" : "hover:bg-white/5"
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
              className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-white/5"
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
  const [vEngineCode, setVEngineCode] = useState("");
  const [vEngineLitres, setVEngineLitres] = useState("");
  const [vFuel, setVFuel] = useState("");
  const [vChassis, setVChassis] = useState<string[]>([]);

  const makeRef = useRef<HTMLInputElement>(null);

  // --- Part form ---
  const [pBrand, setPBrand] = useState("");
  const [pNumber, setPNumber] = useState("");
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("");

  const brandRef = useRef<HTMLInputElement>(null);

  // --- Fitment form ---
  const [fVehicleId, setFVehicleId] = useState("");
  const [fPartId, setFPartId] = useState("");
  const [fNotes, setFNotes] = useState("");

  async function refreshAll() {
    setLoading(true);
    setMsg("");

    const [{ data: vData, error: vErr }, { data: pData, error: pErr }] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, make, model, year_from, year_to, series, engine_code, engine_litres, fuel_type, chassis"
          )
          .order("make")
          .order("model")
          .order("year_from"),
        supabase
          .from("parts")
          .select("id, brand, part_number, name, category")
          .order("brand")
          .order("part_number"),
      ]);

    if (vErr) console.error(vErr);
    if (pErr) console.error(pErr);

    setVehicles((vData ?? []) as VehicleRow[]);
    setParts((pData ?? []) as PartRow[]);

    setLoading(false);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const vehicleLabel = (v: VehicleRow) => {
    const yr = `${v.year_from}-${v.year_to}`;
    const series = v.series ? ` • ${v.series}` : "";
    const litres = v.engine_litres != null ? ` • ${v.engine_litres}L` : "";
    const fuel = v.fuel_type ? ` • ${v.fuel_type}` : "";
    const code = v.engine_code ? ` • ${v.engine_code}` : "";
    const chassis = v.chassis ? ` • ${v.chassis}` : "";
    return `${v.make} ${v.model} (${yr})${series}${litres}${fuel}${code}${chassis}`;
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
    vYearTo.trim() &&
    vEngineCode.trim() &&
    vFuel.trim() &&
    vChassis.length > 0;

  const canAddPart =
    pBrand.trim() && pNumber.trim() && pName.trim() && pCategory.trim();

  const canAddFitment = fVehicleId && fPartId;

  async function addVehicle() {
    setMsg("");
    const year_from = Number(vYearFrom);

    const engine_litres: number | null =
      vEngineLitres.trim() === "" ? null : Number(vEngineLitres);

    if (engine_litres !== null && !Number.isFinite(engine_litres)) {
      setMsg("Engine litres must be a number (e.g. 1.5) or blank.");
      return;
    }

    // Allow "Current" (store as null) and allow blank (also null)
    const yearToRaw = vYearTo.trim();
    const year_to =
      yearToRaw === "" || yearToRaw.toLowerCase() === "current"
        ? null
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
  engine_code: vEngineCode.trim(),
  engine_litres,
  fuel_type: vFuel.trim(),
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
const { data: partsData } = await supabase
  .from("parts")
  .select("*")
  .order("brand");

if (partsData) {
  setParts(partsData);
}

brandRef.current?.focus();
  }

  async function addFitment() {
    setMsg("");

    const { error } = await supabase.from("fitments").insert({
      vehicle_id: fVehicleId,
      part_id: fPartId,
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

  // Small “defaults” for speed when there’s only one row
  useEffect(() => {
    if (!fVehicleId && vehicles.length === 1) setFVehicleId(vehicles[0].id);
    if (!fPartId && parts.length === 1) setFPartId(parts[0].id);
  }, [vehicles, parts, fVehicleId, fPartId]);

return (
  <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F0F0F]">
    <Header />

    <main className="flex-1 w-full">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-2 text-sm text-[#6A6A6A]">
              Add Vehicles, Parts, then link them via Fitments.
            </p>
          </div>

          <button
            onClick={refreshAll}
            className="rounded-xl border border-[#0C0C0C] bg-[#1A1A1A] px-4 py-2 text-sm hover:bg-[#222]"
          >
            Refresh
          </button>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl border border-[#0C0C0C] bg-white px-4 py-3 text-sm">
            {msg}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Add Vehicle */}
          <section className="rounded-2xl border border-[#0C0C0C] bg-[#141414] p-5">
            <h2 className="text-lg font-semibold text-white">Add Vehicle Variant</h2>
            <p className="mt-1 text-xs text-zinc-400">
              One row per unique Make/Model/Year/Series/Engine/Chassis (Oscar-style).
            </p>

            {/* Your existing vehicle form stays here exactly as you wrote it */}

            <button
              disabled={!canAddVehicle}
              onClick={addVehicle}
              className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-40"
            >
              Add Vehicle
            </button>
          </section>

          {/* Add Part */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Add Part</h2>

            {/* Your existing part form stays here exactly as you wrote it */}

            <button
              disabled={!canAddPart}
              onClick={addPart}
              className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
            >
              Add Part
            </button>
          </section>
        </div>

        {/* Fitments */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Add Fitment (Link Vehicle ↔ Part)</h2>

          {/* Your existing fitment inputs stay here exactly as they are */}

          <button
            disabled={!canAddFitment}
            onClick={addFitment}
            className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
          >
            Add Fitment
          </button>

          <div className="mt-3 text-xs text-zinc-400">
            {loading
              ? "Loading…"
              : `Vehicles: ${vehicles.length} • Parts: ${parts.length}`}
          </div>
        </section>

      </div>
    </main>

    <footer className="w-full border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-6 text-sm text-white/70">
      <div className="mx-auto max-w-5xl text-center">
        © 2026 GPC — Global Parts Catalogue
      </div>
    </footer>
  </div>
);
}