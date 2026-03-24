"use client";

import { useRef, useState } from "react";
import Header from "../components/Header";

// ─── Types ────────────────────────────────────────────────────────────────────
type VinResult = {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  series: string | null;
  trim: string | null;
  bodyClass: string | null;
  doors: string | null;
  vehicleType: string | null;
  manufacturer: string | null;
  plantCountry: string | null;
  plantCity: string | null;
  displacementL: string | null;
  cylinders: string | null;
  engineModel: string | null;
  fuelType: string | null;
  driveType: string | null;
  transmissionStyle: string | null;
  transmissionSpeeds: string | null;
  brakeSystem: string | null;
  steeringType: string | null;
  errorText: string | null;
};

// ─── AU plate state detection ─────────────────────────────────────────────────
type StateInfo = {
  name: string;
  abbr: string;
  checkUrl: string;
};

const AU_STATES: Record<string, StateInfo> = {
  NSW: { name: "New South Wales", abbr: "NSW", checkUrl: "https://my.service.nsw.gov.au/MyServiceNSW/index#/lookupVehicleDetails" },
  VIC: { name: "Victoria", abbr: "VIC", checkUrl: "https://www.vicroads.vic.gov.au/registration/buy-sell-or-transfer-a-vehicle/check-a-vehicle-registration" },
  QLD: { name: "Queensland", abbr: "QLD", checkUrl: "https://www.qld.gov.au/transport/registration/check" },
  SA:  { name: "South Australia", abbr: "SA",  checkUrl: "https://www.sa.gov.au/topics/driving-and-transport/registration/check-registration-status" },
  WA:  { name: "Western Australia", abbr: "WA",  checkUrl: "https://online.transport.wa.gov.au/webExternal/registration/" },
  ACT: { name: "ACT", abbr: "ACT", checkUrl: "https://rego.act.gov.au/regosoawicket/public/reg/checkRegVehicleDetails" },
  TAS: { name: "Tasmania", abbr: "TAS", checkUrl: "https://eforms.transport.tas.gov.au" },
  NT:  { name: "Northern Territory", abbr: "NT",  checkUrl: "https://nt.gov.au/driving/rego/check-registration-details" },
};

function detectState(raw: string): StateInfo | null {
  const p = raw.toUpperCase().replace(/[\s\-]/g, "");
  if (!p) return null;

  // WA: N LLL NNN  e.g. 1ABC123
  if (/^\d[A-Z]{3}\d{3}$/.test(p)) return AU_STATES.WA;
  // VIC: N LL N LL  e.g. 1AB2CD
  if (/^\d[A-Z]{2}\d[A-Z]{2}$/.test(p)) return AU_STATES.VIC;
  // QLD: NNN LLL  e.g. 123ABC
  if (/^\d{3}[A-Z]{3}$/.test(p)) return AU_STATES.QLD;
  // SA: S NNN LLL  e.g. S123ABC or SNNNLLLformat
  if (/^S\d{3}[A-Z]{3}$/.test(p)) return AU_STATES.SA;
  // NSW standard: LLL NNN  e.g. ABC123
  if (/^[A-Z]{3}\d{3}$/.test(p)) return AU_STATES.NSW;
  // NSW newer: LL NN LL  e.g. AB12CD  (personalised-style)
  if (/^[A-Z]{2}\d{2}[A-Z]{2}$/.test(p)) return AU_STATES.NSW;
  // ACT: L LL NN L  e.g. YAB12A
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(p)) return AU_STATES.ACT;
  // TAS: LL NNNN  e.g. AA1234
  if (/^[A-Z]{2}\d{4}$/.test(p)) return AU_STATES.TAS;
  // TAS: LLL NNN  same shape as NSW – ambiguous, lean NSW
  // NT: LL NNNN  e.g. CA1234  (similar to TAS)
  if (/^[A-Z]{2}\d{3,4}$/.test(p)) return AU_STATES.NT;

  return null; // unrecognised / personalised
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex py-2 border-b border-gray-100 last:border-0">
      <span className="w-44 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#111827]">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#141414] px-5 py-3">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DecodePage() {
  const [tab, setTab] = useState<"vin" | "rego">("vin");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [regoState, setRegoState] = useState<StateInfo | null | "searched">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetResults() {
    setError(null);
    setVinResult(null);
    setRegoState(null);
  }

  function switchTab(t: "vin" | "rego") {
    setTab(t);
    setInput("");
    resetResults();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleDecode() {
    const val = input.trim().toUpperCase();
    if (!val) return;
    resetResults();

    if (tab === "vin") {
      if (val.length !== 17) {
        setError("VIN must be exactly 17 characters.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/decode-vin?vin=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not decode this VIN.");
        } else {
          setVinResult(data);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Rego detection
      const detected = detectState(val);
      setRegoState(detected ?? "searched");
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleDecode();
  }

  const placeholder = tab === "vin" ? "Enter 17-character VIN…" : "Enter plate number e.g. ABC123";
  const maxLen = tab === "vin" ? 17 : 12;

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      {/* ── Hero ── */}
      <div className="bg-[#141414] px-4 pt-12 pb-16 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          VIN &amp; Rego Decoder
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Decode any vehicle identification number or Australian registration plate
        </p>

        {/* Tab switch */}
        <div className="mt-8 inline-flex rounded-full bg-white/10 p-1">
          <button
            onClick={() => switchTab("vin")}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
              tab === "vin" ? "bg-[#b40102] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            VIN Decoder
          </button>
          <button
            onClick={() => switchTab("rego")}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
              tab === "rego" ? "bg-[#b40102] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Rego Lookup
          </button>
        </div>

        {/* Input row */}
        <div className="mt-5 mx-auto flex max-w-xl gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            maxLength={maxLen}
            autoFocus
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-base font-mono tracking-widest text-white placeholder:text-white/30 placeholder:font-sans placeholder:tracking-normal focus:border-[#b40102] focus:outline-none"
          />
          <button
            onClick={handleDecode}
            disabled={loading || input.trim().length === 0}
            className="rounded-xl bg-[#b40102] px-6 py-3 text-sm font-semibold text-white hover:bg-[#9a0101] disabled:opacity-40 transition-colors"
          >
            {loading ? "…" : "Decode"}
          </button>
        </div>

        {tab === "vin" && (
          <p className="mt-2 text-xs text-white/30">
            The VIN is usually on the dashboard (driver's side) or inside the door jamb
          </p>
        )}
      </div>

      {/* ── Results ── */}
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* VIN results */}
          {vinResult && (
            <>
              {vinResult.errorText && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
                  Partial decode: {vinResult.errorText}
                </div>
              )}

              {/* Identity */}
              <Card title="Vehicle Identity">
                <InfoRow label="VIN" value={vinResult.vin} />
                <InfoRow label="Year" value={vinResult.year} />
                <InfoRow label="Make" value={vinResult.make} />
                <InfoRow label="Model" value={vinResult.model} />
                <InfoRow label="Series" value={vinResult.series} />
                <InfoRow label="Trim" value={vinResult.trim} />
                <InfoRow label="Body" value={vinResult.bodyClass} />
                <InfoRow label="Doors" value={vinResult.doors} />
                <InfoRow label="Vehicle Type" value={vinResult.vehicleType} />
              </Card>

              {/* Engine */}
              {(vinResult.displacementL || vinResult.cylinders || vinResult.engineModel || vinResult.fuelType) && (
                <Card title="Engine">
                  <InfoRow label="Engine Model" value={vinResult.engineModel} />
                  <InfoRow label="Displacement (L)" value={vinResult.displacementL ? parseFloat(vinResult.displacementL).toFixed(1) : null} />
                  <InfoRow label="Cylinders" value={vinResult.cylinders} />
                  <InfoRow label="Fuel Type" value={vinResult.fuelType} />
                </Card>
              )}

              {/* Drivetrain */}
              {(vinResult.driveType || vinResult.transmissionStyle || vinResult.transmissionSpeeds || vinResult.brakeSystem || vinResult.steeringType) && (
                <Card title="Drivetrain &amp; Chassis">
                  <InfoRow label="Drive Type" value={vinResult.driveType} />
                  <InfoRow label="Transmission" value={vinResult.transmissionStyle} />
                  <InfoRow label="Transmission Speeds" value={vinResult.transmissionSpeeds} />
                  <InfoRow label="Brake System" value={vinResult.brakeSystem} />
                  <InfoRow label="Steering" value={vinResult.steeringType} />
                </Card>
              )}

              {/* Manufacturing */}
              {(vinResult.manufacturer || vinResult.plantCountry || vinResult.plantCity) && (
                <Card title="Manufacturing">
                  <InfoRow label="Manufacturer" value={vinResult.manufacturer} />
                  <InfoRow label="Plant Country" value={vinResult.plantCountry} />
                  <InfoRow label="Plant City" value={vinResult.plantCity} />
                </Card>
              )}

              {/* Find parts CTA */}
              <div className="rounded-xl bg-[#141414] px-6 py-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">Find compatible parts</p>
                  <p className="text-white/50 text-sm mt-0.5">
                    Search for parts that fit your {[vinResult.year, vinResult.make, vinResult.model].filter(Boolean).join(" ")}
                  </p>
                </div>
                <a
                  href={`/?q=${encodeURIComponent([vinResult.year, vinResult.make, vinResult.model].filter(Boolean).join(" "))}`}
                  className="shrink-0 rounded-xl bg-[#b40102] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
                >
                  Search Parts →
                </a>
              </div>
            </>
          )}

          {/* Rego results */}
          {regoState && regoState !== "searched" && (
            <Card title="Registration Plate Detected">
              <div className="py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border-2 border-[#141414] bg-white px-5 py-3 font-mono text-2xl font-bold tracking-widest text-[#111827] shadow-inner">
                    {input.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">{regoState.name}</p>
                    <p className="text-sm text-gray-500">{regoState.abbr} plate format detected</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-500 mb-3">
                    For full registration details, check the official {regoState.abbr} government portal:
                  </p>
                  <a
                    href={regoState.checkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#b40102] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
                  >
                    Check {regoState.abbr} Rego →
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Rego — unrecognised format */}
          {regoState === "searched" && (
            <Card title="Plate Not Recognised">
              <div className="py-4 space-y-4">
                <p className="text-sm text-gray-500">
                  This plate format could not be matched to an Australian state. It may be a personalised plate or from a different format. Check your state directly:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.values(AU_STATES).map((s) => (
                    <a
                      key={s.abbr}
                      href={s.checkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm font-medium text-[#111827] hover:bg-gray-50 hover:border-[#b40102] transition-colors"
                    >
                      {s.abbr}
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!error && !vinResult && !regoState && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-2xl mb-3">
                {tab === "vin" ? "🔍" : "🪪"}
              </p>
              <p className="text-gray-500 text-sm">
                {tab === "vin"
                  ? "Enter your 17-character VIN above to see make, model, engine, and manufacturing details."
                  : "Enter an Australian registration plate above to identify the state and check official rego details."}
              </p>
            </div>
          )}

        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
