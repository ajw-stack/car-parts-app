"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function TypeaheadInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  allowCreate,
  onCreate,
  createLabel,
}: TypeaheadInputProps) {
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
        className={`block w-full px-4 py-2 text-left text-sm ${
          idx === active ? "bg-white/10" : "hover:bg-white/5"
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
}

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
  const [vChassis, setVChassis] = useState("");
  

  // --- Part form ---
  const [pBrand, setPBrand] = useState("");
  const [pNumber, setPNumber] = useState("");
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("");

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
    vSeries.trim() &&
    vEngineCode.trim() &&
    vFuel.trim() &&
    vChassis.trim();

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

    const { error } = await supabase.from("vehicles").insert({
      make: vMake.trim(),
      model: vModel.trim(),
      year_from,
      year_to,
      series: vSeries.trim(),
      trim_code: vTrimCode.trim() || null,
      engine_code: vEngineCode.trim(),
      engine_litres,
      fuel_type: vFuel.trim(),
      chassis: vChassis.trim(),
    });

    if (error) {
      console.error(error);
      setMsg(`Vehicle insert failed: ${error.message}`);
      return;
    }

    setMsg("Vehicle added.");
    setVMake("");
    setVModel("");
    setVYearFrom("");
    setVYearTo("");
    setVSeries("");
    setVEngineCode("");
    setVEngineLitres("");
    setVFuel("");
    setVChassis("");
    await refreshAll();
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
    await refreshAll();
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
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>

            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-2 text-sm text-white/70">
              Add Vehicles, Parts, then link them via Fitments.
            </p>
          </div>
          

          <button
            onClick={refreshAll}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

            {msg && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              {msg}
            </div>
            )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Add Vehicle */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Add Vehicle Variant</h2>
            <p className="mt-1 text-xs text-white/60">
              One row per unique Make/Model/Year/Series/Engine/Chassis (Oscar-style).
            </p>
          

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 relative">
              
            <TypeaheadInput
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
  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
  value={vMonthFrom}
  onChange={(e) => setVMonthFrom(e.target.value)}
>
  <option value="">Month</option>

  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
    <option key={m} value={String(m)}>
      {String(m).padStart(2, "0")}
    </option>
  ))}
</select>

  <input
    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
    placeholder="Year From (e.g. 2016)"
    value={vYearFrom}
    onChange={(e) => setVYearFrom(e.target.value)}
  />

  <select
  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
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
    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
    placeholder="Year To (e.g. 2022)"
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
              .filter(Boolean)
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
    .filter(Boolean)
    .sort()}
  placeholder="Trim/Sub-model (e.g. Berlina, SS, SV6)"
  disabled={!vMake || !vModel}
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
            disabled={!vMake || !vModel}
          />
              <input
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                placeholder="Engine Litres (e.g. 3.2)"
                value={vEngineLitres}
                onChange={(e) => setVEngineLitres(e.target.value)}
              />
              <select
  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
  value={vFuel}
  onChange={(e) => setVFuel(e.target.value)}
>
  <option value="">Fuel (select)</option>
  <option value="Petrol">Petrol</option>
  <option value="Carbureted">Petrol Carbureted</option>
  <option value="Diesel">Diesel</option>
  <option value="LPG">LPG</option>
  <option value="Hybrid">Hybrid</option>
  <option value="Electric">Electric</option>
  <option value="CNG">CNG</option>
  <option value="E85">E85</option>
  <option value="Hydrogen">Hydrogen</option>
  <option value="Other">Other</option>
</select>
              <TypeaheadInput
  value={vChassis}
  onChange={setVChassis}
  options={Array.from(
    new Set(
      vehicles
        .filter((v) => (!vMake || v.make === vMake) && (!vModel || v.model === vModel))
        .map((v) => (v.chassis ?? "").trim())
    )
  )
    .filter(Boolean)
    .sort()}
  placeholder="Chassis (e.g. Dual Cab 4x4)"
  disabled={!vMake || !vModel}
  allowCreate
/>
            </div>

            <button
              disabled={!canAddVehicle}
              onClick={addVehicle}
              className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
            >
              Add Vehicle
            </button>
          </section>

{/* Add Part */}
<section className="rounded-2xl border border-white/10 bg-white/5 p-5">
  <h2 className="text-lg font-semibold">Add Part</h2>

  <div className="mt-4 grid grid-cols-2 gap-3">
    <TypeaheadInput
      value={pBrand}
      onChange={setPBrand}
      options={Array.from(new Set(parts.map((p) => p.brand))).sort()}
      placeholder="Brand (e.g. Ryco)"
    />

    <input
      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
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
    className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
  >
    Add Part
  </button>
</section>
</div>
          {/* Add Fitment */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Add Fitment (Link Vehicle ↔ Part)</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={fVehicleId}
              onChange={(e) => setFVehicleId(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>

            <select
              value={fPartId}
              onChange={(e) => setFPartId(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            >
              <option value="">Select Part</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {partLabel(p)}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
              placeholder="Notes (optional)"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
            />
          </div>

          <button
            disabled={!canAddFitment}
            onClick={addFitment}
            className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
          >
            Add Fitment
          </button>

          <div className="mt-3 text-xs text-white/60">
            {loading
              ? "Loading…"
              : `Vehicles: ${vehicles.length} • Parts: ${parts.length}`}
          </div>
          </section>
          </main>
          </div>
          )}