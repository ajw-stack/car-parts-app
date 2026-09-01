"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
const BUCKET = "captures";

const inputCls =
  "w-full rounded-xl border border-[#2A2A2A] bg-[#141414] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#CC0000] focus:outline-none";

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 2000;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function CaptureTypeahead({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 10);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 10);
  }, [value, options]);

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-4 text-base text-white placeholder:text-zinc-600 focus:border-[#CC0000] focus:outline-none disabled:opacity-40"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] shadow-xl">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              onTouchEnd={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className="block w-full px-4 py-4 text-left text-base text-white hover:bg-[#1A1A1A] active:bg-[#CC0000] border-b border-[#1A1A1A] last:border-0"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoButton({
  label,
  thumb,
  onFile,
}: {
  label: string;
  thumb: string | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {thumb ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative w-full overflow-hidden rounded-2xl border border-[#2A2A2A]"
          style={{ aspectRatio: "16/9" }}
        >
          <img src={thumb} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-sm font-semibold">Tap to retake</span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-[#2A2A2A] bg-[#141414] flex flex-col items-center justify-center gap-2 py-8 active:bg-[#1F1F1F] transition-colors"
          style={{ minHeight: "100px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <span className="text-white font-semibold text-sm">{label}</span>
          <span className="text-xs text-zinc-500">Tap to open camera</span>
        </button>
      )}
    </div>
  );
}

export default function CapturePage() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Core form
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [plateBlob, setPlateBlob] = useState<Blob | null>(null);
  const [plateThumb, setPlateThumb] = useState<string | null>(null);
  const [vinBlob, setVinBlob] = useState<Blob | null>(null);
  const [vinThumb, setVinThumb] = useState<string | null>(null);
  const [state, setState] = useState<string>(() => {
    try { return localStorage.getItem("capture_state") ?? ""; } catch { return ""; }
  });
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  // Optional fields
  const [detailOpen, setDetailOpen] = useState(false);
  const [regoPlate, setRegoPlate] = useState("");
  const [vin, setVin] = useState("");
  const [buildYear, setBuildYear] = useState("");
  const [series, setSeries] = useState("");
  const [badge, setBadge] = useState("");
  const [bodyStyle, setBodyStyle] = useState("");
  const [engineCap, setEngineCap] = useState("");
  const [engineCode, setEngineCode] = useState("");
  const [cylinders, setCylinders] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [exhaustCount, setExhaustCount] = useState("");
  const [colour, setColour] = useState("");
  const [notes, setNotes] = useState("");
  const [extraBlobs, setExtraBlobs] = useState<Blob[]>([]);
  const [extraThumbs, setExtraThumbs] = useState<string[]>([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Typeahead options
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const extraInputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/capture/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();
      if (profile?.role !== "capture" && profile?.role !== "admin") {
        setAccessDenied(true);
        setAuthChecked(true);
        return;
      }
      setUserId(data.session.user.id);
      setAuthChecked(true);
    });
  }, [router]);

  // Load makes once authed
  useEffect(() => {
    if (!authChecked || accessDenied) return;
    supabase
      .from("vehicles")
      .select("make")
      .order("make")
      .then(({ data }) => {
        setMakes([...new Set((data ?? []).map((r: { make: string }) => r.make))]);
      });
  }, [authChecked, accessDenied]);

  // Load models when make changes
  useEffect(() => {
    if (!make.trim()) { setModels([]); return; }
    supabase
      .from("vehicles")
      .select("model")
      .eq("make", make)
      .order("model")
      .then(({ data }) => {
        setModels([...new Set((data ?? []).map((r: { model: string }) => r.model))]);
      });
  }, [make]);

  async function handlePhoto(file: File, type: "plate" | "vin") {
    try {
      const blob = await resizeImage(file);
      const thumb = URL.createObjectURL(blob);
      if (type === "plate") {
        if (plateThumb) URL.revokeObjectURL(plateThumb);
        setPlateBlob(blob); setPlateThumb(thumb);
      } else {
        if (vinThumb) URL.revokeObjectURL(vinThumb);
        setVinBlob(blob); setVinThumb(thumb);
      }
    } catch (err) {
      console.error("Photo resize failed:", err);
    }
  }

  async function handleExtraPhotos(files: FileList) {
    const newBlobs: Blob[] = [];
    const newThumbs: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const blob = await resizeImage(f);
        newBlobs.push(blob);
        newThumbs.push(URL.createObjectURL(blob));
      } catch { /* skip failed photos */ }
    }
    setExtraBlobs((prev) => [...prev, ...newBlobs]);
    setExtraThumbs((prev) => [...prev, ...newThumbs]);
  }

  function removeExtra(idx: number) {
    URL.revokeObjectURL(extraThumbs[idx]);
    setExtraBlobs((prev) => prev.filter((_, i) => i !== idx));
    setExtraThumbs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!make.trim() || !model.trim() || !userId) return;
    setSaving(true);
    setErrorMsg("");

    try {
      // Upload photos -- don't block the save if an individual upload fails
      let photoPlate: string | null = null;
      if (plateBlob) {
        const path = `${userId}/${clientUuid}/plate.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, plateBlob, { contentType: "image/jpeg" });
        if (!error) photoPlate = path;
      }

      let photoVin: string | null = null;
      if (vinBlob) {
        const path = `${userId}/${clientUuid}/vin.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, vinBlob, { contentType: "image/jpeg" });
        if (!error) photoVin = path;
      }

      const extraPaths: string[] = [];
      for (let i = 0; i < extraBlobs.length; i++) {
        const path = `${userId}/${clientUuid}/extra-${i + 1}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, extraBlobs[i], { contentType: "image/jpeg" });
        if (!error) extraPaths.push(path);
      }

      const { error: insertErr } = await supabase.from("vehicle_sightings").insert({
        client_uuid: clientUuid,
        submitted_by: userId,
        make: make.trim(),
        model: model.trim(),
        rego_state: state || null,
        rego_plate: regoPlate.trim() || null,
        vin: vin.trim() || null,
        build_year: buildYear ? parseInt(buildYear) : null,
        series: series.trim() || null,
        badge: badge.trim() || null,
        body_style: bodyStyle.trim() || null,
        engine_capacity: engineCap ? parseFloat(engineCap) : null,
        engine_code: engineCode.trim() || null,
        cylinders: cylinders ? parseInt(cylinders) : null,
        fuel_type: fuelType.trim() || null,
        transmission: transmission.trim() || null,
        drivetrain: drivetrain.trim() || null,
        exhaust_tip_count: exhaustCount ? parseInt(exhaustCount) : null,
        colour: colour.trim() || null,
        notes: notes.trim() || null,
        photo_plate_path: photoPlate,
        photo_vin_path: photoVin,
        photo_extra_paths: extraPaths.length ? extraPaths : null,
      });

      if (insertErr) throw insertErr;

      // Persist sticky state
      try { localStorage.setItem("capture_state", state); } catch { /* ignore */ }

      // Reset form -- keep state and make
      const keptMake = make;
      if (plateThumb) URL.revokeObjectURL(plateThumb);
      if (vinThumb) URL.revokeObjectURL(vinThumb);
      extraThumbs.forEach(URL.revokeObjectURL);

      setClientUuid(crypto.randomUUID());
      setPlateBlob(null); setPlateThumb(null);
      setVinBlob(null); setVinThumb(null);
      setModel("");
      setRegoPlate(""); setVin(""); setBuildYear(""); setSeries(""); setBadge("");
      setBodyStyle(""); setEngineCap(""); setEngineCode(""); setCylinders("");
      setFuelType(""); setTransmission(""); setDrivetrain(""); setExhaustCount("");
      setColour(""); setNotes("");
      setExtraBlobs([]); setExtraThumbs([]);
      setDetailOpen(false);
      setMake(keptMake);
      setSuccessMsg("Saved. Next vehicle?");
      setTimeout(() => setSuccessMsg(""), 5000);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!(make.trim() && model.trim() && !saving);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Loading...</span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <p className="text-white font-semibold">Access restricted</p>
            <p className="mt-2 text-sm text-zinc-400">
              Your account does not have capture access. Contact the site administrator.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      <Header />

      <main className="flex-1 px-4 pt-6 pb-28 max-w-lg mx-auto w-full">
        <h1 className="text-xl font-bold text-white mb-1">Capture vehicle</h1>
        <p className="text-xs text-zinc-500 mb-5">
          Make and model are required. Everything else is optional.
        </p>

        {successMsg && (
          <div className="mb-4 rounded-2xl bg-green-900/40 border border-green-700 px-4 py-3 text-green-300 font-semibold text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">

          {/* Photo: plate */}
          <PhotoButton
            label="Photo: registration plate"
            thumb={plateThumb}
            onFile={(f) => handlePhoto(f, "plate")}
          />

          {/* Photo: VIN */}
          <PhotoButton
            label="Photo: VIN plate"
            thumb={vinThumb}
            onFile={(f) => handlePhoto(f, "vin")}
          />

          {/* State */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              State
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(state === s ? "" : s)}
                  className={`py-3.5 rounded-xl text-sm font-bold transition-colors ${
                    state === s
                      ? "bg-[#CC0000] text-white"
                      : "bg-[#1A1A1A] text-white/70 border border-[#2A2A2A] active:bg-[#2A2A2A]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Make */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Make <span className="text-[#CC0000]">*</span>
            </div>
            <CaptureTypeahead
              value={make}
              onChange={(v) => { setMake(v); setModel(""); }}
              options={makes}
              placeholder="e.g. Toyota"
            />
          </div>

          {/* Model */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Model <span className="text-[#CC0000]">*</span>
            </div>
            <CaptureTypeahead
              value={model}
              onChange={setModel}
              options={models}
              placeholder={make.trim() ? "e.g. Camry" : "Select a make first"}
              disabled={!make.trim()}
            />
          </div>

          {/* Add more detail */}
          <div className="rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <button
              type="button"
              onClick={() => setDetailOpen(!detailOpen)}
              className="w-full flex items-center justify-between px-4 py-4 text-sm font-semibold text-white bg-[#141414] active:bg-[#1A1A1A]"
            >
              <span>Add more detail</span>
              <span className={`text-zinc-500 transition-transform duration-200 ${detailOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {detailOpen && (
              <div className="px-4 py-4 space-y-3 bg-[#0F0F0F] border-t border-[#2A2A2A]">

                {/* Extra photos */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Extra photos
                  </div>
                  {extraThumbs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {extraThumbs.map((t, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#2A2A2A]">
                          <img src={t} alt={`Extra ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExtra(i)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center font-bold"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={extraInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) handleExtraPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => extraInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-[#2A2A2A] text-sm text-zinc-400 active:bg-[#1A1A1A] transition-colors"
                  >
                    + Add photo
                  </button>
                </div>

                <Field label="Rego plate">
                  <input
                    value={regoPlate}
                    onChange={(e) => setRegoPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className={inputCls}
                  />
                </Field>

                <Field label="VIN">
                  <input
                    value={vin}
                    maxLength={17}
                    onChange={(e) => setVin(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="Up to 17 characters"
                    className={inputCls}
                  />
                  <div className="mt-1 text-right text-xs text-zinc-600">{vin.length}/17</div>
                </Field>

                <Field label="Build year">
                  <input
                    value={buildYear}
                    onChange={(e) => setBuildYear(e.target.value)}
                    placeholder="e.g. 2019"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>

                <Field label="Series">
                  <input
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder="e.g. GEN3, PX2"
                    className={inputCls}
                  />
                </Field>

                <Field label="Badge">
                  <input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder='e.g. GTS, SR5, 45 TFSI'
                    className={inputCls}
                  />
                </Field>

                <Field label="Body style">
                  <input
                    value={bodyStyle}
                    onChange={(e) => setBodyStyle(e.target.value)}
                    placeholder="e.g. Sedan, Ute, Wagon"
                    className={inputCls}
                  />
                </Field>

                <Field label="Engine capacity (litres)">
                  <input
                    value={engineCap}
                    onChange={(e) => setEngineCap(e.target.value)}
                    placeholder="e.g. 2.0"
                    inputMode="decimal"
                    className={inputCls}
                  />
                </Field>

                <Field label="Engine code">
                  <input
                    value={engineCode}
                    onChange={(e) => setEngineCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 2GR-FE"
                    className={inputCls}
                  />
                </Field>

                <Field label="Cylinders">
                  <input
                    value={cylinders}
                    onChange={(e) => setCylinders(e.target.value)}
                    placeholder="e.g. 4, 6, 8"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>

                <Field label="Fuel type">
                  <input
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    placeholder="e.g. Petrol, Diesel, BEV"
                    className={inputCls}
                  />
                </Field>

                <Field label="Transmission">
                  <input
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    placeholder="e.g. Automatic, Manual"
                    className={inputCls}
                  />
                </Field>

                <Field label="Drivetrain">
                  <input
                    value={drivetrain}
                    onChange={(e) => setDrivetrain(e.target.value)}
                    placeholder="e.g. AWD, FWD, RWD"
                    className={inputCls}
                  />
                </Field>

                <Field label="Exhaust tips">
                  <input
                    value={exhaustCount}
                    onChange={(e) => setExhaustCount(e.target.value)}
                    placeholder="Number of exhaust tips"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>

                <Field label="Colour">
                  <input
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    placeholder="e.g. Pearl White, Midnight Black"
                    className={inputCls}
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything unusual about this vehicle..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Sticky save button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-4 bg-[#0F0F0F] border-t border-[#1A1A1A]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-4 rounded-2xl bg-[#CC0000] text-white font-bold text-base disabled:opacity-30 active:bg-[#aa0000] transition-colors"
        >
          {saving ? "Saving..." : "Save vehicle"}
        </button>
      </div>
    </div>
  );
}
