"use client";

import { useRef, useState } from "react";
import Header from "../components/Header";
import { lookupWMI, vinCountry } from "../lib/wmi";

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

// ─── VIN year map ─────────────────────────────────────────────────────────────
const VIN_YEAR: Record<string, string> = {
  A:"1980/2010",B:"1981/2011",C:"1982/2012",D:"1983/2013",E:"1984/2014",
  F:"1985/2015",G:"1986/2016",H:"1987/2017",J:"1988/2018",K:"1989/2019",
  L:"1990/2020",M:"1991/2021",N:"1992/2022",P:"1993/2023",R:"1994/2024",
  S:"1995/2025",T:"1996/2026",V:"1997/2027",W:"1998/2028",X:"1999/2029",
  Y:"2000/2030","1":"2001","2":"2002","3":"2003","4":"2004","5":"2005",
  "6":"2006","7":"2007","8":"2008","9":"2009",
};

// ─── AU plate state detection ─────────────────────────────────────────────────
type StateInfo = { name: string; abbr: string; checkUrl: string };

const AU_STATES: Record<string, StateInfo> = {
  NSW: { name: "New South Wales", abbr: "NSW", checkUrl: "https://my.service.nsw.gov.au/MyServiceNSW/index#/lookupVehicleDetails" },
  VIC: { name: "Victoria",         abbr: "VIC", checkUrl: "https://www.vicroads.vic.gov.au/registration/buy-sell-or-transfer-a-vehicle/check-a-vehicle-registration" },
  QLD: { name: "Queensland",       abbr: "QLD", checkUrl: "https://www.qld.gov.au/transport/registration/check" },
  SA:  { name: "South Australia",  abbr: "SA",  checkUrl: "https://www.sa.gov.au/topics/driving-and-transport/registration/check-registration-status" },
  WA:  { name: "Western Australia",abbr: "WA",  checkUrl: "https://online.transport.wa.gov.au/webExternal/registration/" },
  ACT: { name: "ACT",              abbr: "ACT", checkUrl: "https://rego.act.gov.au/regosoawicket/public/reg/checkRegVehicleDetails" },
  TAS: { name: "Tasmania",         abbr: "TAS", checkUrl: "https://eforms.transport.tas.gov.au" },
  NT:  { name: "Northern Territory",abbr: "NT", checkUrl: "https://nt.gov.au/driving/rego/check-registration-details" },
};

function detectState(raw: string): StateInfo[] {
  const p = raw.toUpperCase().replace(/[\s\-]/g, "");
  if (!p) return [];
  if (/^\d[A-Z]{3}\d{3}$/.test(p))  return [AU_STATES.WA];
  if (/^\d[A-Z]{2}\d[A-Z]{2}$/.test(p)) return [AU_STATES.VIC];
  if (/^\d{3}[A-Z]{3}$/.test(p))    return [AU_STATES.QLD];
  if (/^S\d{3}[A-Z]{3}$/.test(p))   return [AU_STATES.SA];
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(p)) return [AU_STATES.NSW];
  if (/^[A-Z]{3}\d{3}$/.test(p))    return [AU_STATES.NSW, AU_STATES.WA];
  if (/^[A-Z]{2}\d{4}$/.test(p))    return [AU_STATES.TAS];
  if (/^[A-Z]{2}\d{3}$/.test(p))    return [AU_STATES.NT];
  return [];
}

// ─── VIN breakdown sections ───────────────────────────────────────────────────
type Section = {
  label: string;
  chars: string;
  positions: string;
  detail: string;
  color: string;
  textColor: string;
};

function buildSections(vin: string, result: VinResult | null): Section[] {
  const wmi      = vin.substring(0, 3);
  const vds      = vin.substring(3, 8);
  const check    = vin[8] ?? "";
  const yearChar = vin[9]?.toUpperCase() ?? "";
  const plant    = vin[10] ?? "";
  const serial   = vin.substring(11);

  const manufacturer = lookupWMI(vin) ?? result?.manufacturer ?? "Unknown";
  const country      = vinCountry(vin) ?? result?.plantCountry ?? "Unknown";
  const yearLabel    = result?.year ?? VIN_YEAR[yearChar] ?? yearChar;
  const checkLabel   = check === "Z" ? `${check} (European — no check digit)` : check;

  return [
    {
      label: "Manufacturer",
      chars: wmi,
      positions: "1–3",
      detail: `${manufacturer} · ${country}`,
      color: "bg-[#b40102]",
      textColor: "text-white",
    },
    {
      label: "Vehicle Descriptor",
      chars: vds,
      positions: "4–8",
      detail: [result?.model, result?.bodyClass, result?.vehicleType]
        .filter(Boolean).join(" · ") || "Model / body / engine codes",
      color: "bg-[#1f2937]",
      textColor: "text-white",
    },
    {
      label: "Check Digit",
      chars: check,
      positions: "9",
      detail: checkLabel,
      color: "bg-[#4b5563]",
      textColor: "text-white",
    },
    {
      label: "Model Year",
      chars: yearChar,
      positions: "10",
      detail: `${yearLabel}`,
      color: "bg-[#374151]",
      textColor: "text-white",
    },
    {
      label: "Plant",
      chars: plant,
      positions: "11",
      detail: result?.plantCity
        ? `${result.plantCity}${result.plantCountry ? `, ${result.plantCountry}` : ""}`
        : "Assembly plant code",
      color: "bg-[#4b5563]",
      textColor: "text-white",
    },
    {
      label: "Serial Number",
      chars: serial,
      positions: "12–17",
      detail: "Unique production sequence number",
      color: "bg-[#6b7280]",
      textColor: "text-white",
    },
  ];
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
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
  const [tab, setTab]         = useState<"vin" | "rego">("vin");
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [regoState, setRegoState] = useState<StateInfo[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setError(null);
    setVinResult(null);
    setRegoState(null);
  }

  function switchTab(t: "vin" | "rego") {
    setTab(t);
    setInput("");
    reset();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleDecode() {
    const val = input.trim().toUpperCase();
    if (!val) return;
    reset();

    if (tab === "vin") {
      if (val.length !== 17) { setError("VIN must be exactly 17 characters."); return; }
      setLoading(true);
      try {
        const res  = await fetch(`/api/decode-vin?vin=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (!res.ok) setError(data.error || "Could not decode this VIN.");
        else         setVinResult(data);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setRegoState(detectState(val));
    }
  }

  const placeholder = tab === "vin" ? "Enter 17-character VIN…" : "Enter plate number e.g. ABC123";

  // Build sections only when we have a decoded VIN
  const decodedVin    = vinResult?.vin ?? (input.length === 17 ? input.toUpperCase() : null);
  const vinSections   = decodedVin ? buildSections(decodedVin, vinResult) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      {/* ── Hero ── */}
      <div className="bg-[#141414] px-4 pt-12 pb-16 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">VIN &amp; Rego Decoder</h1>
        <p className="mt-2 text-sm text-white/50">
          Decode any vehicle identification number or Australian registration plate
        </p>

        {/* Tab switch */}
        <div className="mt-8 inline-flex rounded-full bg-white/10 p-1">
          {(["vin", "rego"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "bg-[#b40102] text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "vin" ? "VIN Decoder" : "Rego Lookup"}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="mt-5 mx-auto flex max-w-xl gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleDecode()}
            maxLength={tab === "vin" ? 17 : 12}
            autoFocus
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-base font-mono tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/30 focus:border-[#b40102] focus:outline-none"
          />
          <button
            onClick={handleDecode}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#b40102] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101] disabled:opacity-40"
          >
            {loading ? "…" : "Decode"}
          </button>
        </div>

        {tab === "vin" && (
          <p className="mt-2 text-xs text-white/30">
            Found on the dashboard (driver's side), door jamb, or compliance plate
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

          {/* ── VIN breakdown (shows as soon as 17 chars entered OR after decode) ── */}
          {tab === "vin" && vinSections && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-[#141414] px-5 py-3">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">VIN Structure</h2>
              </div>

              {/* Character strip */}
              <div className="px-5 pt-5 pb-2 overflow-x-auto">
                <div className="flex min-w-max gap-0.5">
                  {vinSections.map((s) =>
                    s.chars.split("").map((ch, i) => (
                      <div
                        key={`${s.label}-${i}`}
                        className={`${s.color} flex h-10 w-9 items-center justify-center rounded font-mono text-sm font-bold ${s.textColor}`}
                      >
                        {ch}
                      </div>
                    ))
                  )}
                </div>
                {/* Section labels under strip */}
                <div className="mt-1 flex min-w-max gap-0.5">
                  {vinSections.map((s) => (
                    <div
                      key={s.label}
                      style={{ width: `${s.chars.length * 2.5}rem` }}
                      className="text-center"
                    >
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{s.positions}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section detail rows */}
              <div className="divide-y divide-gray-100 px-5 pb-2">
                {vinSections.map((s) => (
                  <div key={s.label} className="flex items-start gap-3 py-3">
                    <div className={`${s.color} mt-0.5 h-3 w-3 shrink-0 rounded-sm`} />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {s.label}
                      </span>
                      <p className="mt-0.5 text-sm font-medium text-[#111827] break-words">{s.detail}</p>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-sm font-bold text-[#111827]">
                      {s.chars}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIN decoded results */}
          {vinResult && (
            <>
              {vinResult.errorText && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
                  Note: {vinResult.errorText}
                </div>
              )}

              {/* Identity */}
              <Card title="Vehicle Identity">
                <InfoRow label="Year"         value={vinResult.year} />
                <InfoRow label="Make"         value={vinResult.make} />
                <InfoRow label="Model"        value={vinResult.model} />
                <InfoRow label="Series"       value={vinResult.series} />
                <InfoRow label="Trim"         value={vinResult.trim} />
                <InfoRow label="Body"         value={vinResult.bodyClass} />
                <InfoRow label="Doors"        value={vinResult.doors} />
                <InfoRow label="Vehicle Type" value={vinResult.vehicleType} />
              </Card>

              {(vinResult.displacementL || vinResult.cylinders || vinResult.engineModel || vinResult.fuelType) && (
                <Card title="Engine">
                  <InfoRow label="Engine Model"     value={vinResult.engineModel} />
                  <InfoRow label="Displacement (L)" value={vinResult.displacementL ? parseFloat(vinResult.displacementL).toFixed(1) : null} />
                  <InfoRow label="Cylinders"        value={vinResult.cylinders} />
                  <InfoRow label="Fuel Type"        value={vinResult.fuelType} />
                </Card>
              )}

              {(vinResult.driveType || vinResult.transmissionStyle || vinResult.transmissionSpeeds || vinResult.brakeSystem || vinResult.steeringType) && (
                <Card title="Drivetrain & Chassis">
                  <InfoRow label="Drive Type"          value={vinResult.driveType} />
                  <InfoRow label="Transmission"        value={vinResult.transmissionStyle} />
                  <InfoRow label="Transmission Speeds" value={vinResult.transmissionSpeeds} />
                  <InfoRow label="Brake System"        value={vinResult.brakeSystem} />
                  <InfoRow label="Steering"            value={vinResult.steeringType} />
                </Card>
              )}

              {(vinResult.manufacturer || vinResult.plantCountry || vinResult.plantCity) && (
                <Card title="Manufacturing">
                  <InfoRow label="Manufacturer"  value={vinResult.manufacturer} />
                  <InfoRow label="Plant Country" value={vinResult.plantCountry} />
                  <InfoRow label="Plant City"    value={vinResult.plantCity} />
                </Card>
              )}

              {/* Find Parts CTA */}
              <div className="rounded-xl bg-[#141414] px-6 py-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">Find compatible parts</p>
                  <p className="mt-0.5 text-sm text-white/50">
                    Search for {[vinResult.year, vinResult.make, vinResult.model].filter(Boolean).join(" ")}
                  </p>
                </div>
                <a
                  href={`/?q=${encodeURIComponent([vinResult.year, vinResult.make, vinResult.model].filter(Boolean).join(" "))}`}
                  className="shrink-0 rounded-xl bg-[#b40102] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101]"
                >
                  Search Parts →
                </a>
              </div>
            </>
          )}

          {/* Rego — single match */}
          {regoState && regoState.length === 1 && (
            <Card title="Registration Plate Detected">
              <div className="py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border-2 border-[#141414] bg-white px-5 py-3 font-mono text-2xl font-bold tracking-widest text-[#111827] shadow-inner">
                    {input.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">{regoState[0].name}</p>
                    <p className="text-sm text-gray-500">{regoState[0].abbr} plate format detected</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="mb-3 text-sm text-gray-500">
                    For full registration details, check the official {regoState[0].abbr} government portal:
                  </p>
                  <a
                    href={regoState[0].checkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#b40102] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101]"
                  >
                    Check {regoState[0].abbr} Rego →
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Rego — ambiguous */}
          {regoState && regoState.length > 1 && (
            <Card title="Registration Plate Detected">
              <div className="py-4">
                <div className="flex items-center gap-4 mb-5">
                  <div className="rounded-lg border-2 border-[#141414] bg-white px-5 py-3 font-mono text-2xl font-bold tracking-widest text-[#111827] shadow-inner">
                    {input.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">{regoState.map(s => s.abbr).join(" or ")}</p>
                    <p className="text-sm text-gray-500">
                      This older format is used in multiple states — select yours:
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
                  {regoState.map((s) => (
                    <a key={s.abbr} href={s.checkUrl} target="_blank" rel="noopener noreferrer"
                      className="rounded-xl bg-[#b40102] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9a0101]">
                      Check {s.abbr} Rego →
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Rego — unrecognised */}
          {regoState && regoState.length === 0 && (
            <Card title="Plate Not Recognised">
              <div className="py-4 space-y-4">
                <p className="text-sm text-gray-500">
                  Could not match to a standard Australian plate format. May be a personalised plate. Check your state directly:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.values(AU_STATES).map((s) => (
                    <a key={s.abbr} href={s.checkUrl} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm font-medium text-[#111827] transition-colors hover:border-[#b40102] hover:bg-gray-50">
                      {s.abbr}
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!error && !vinResult && regoState === null && tab === "vin" && !vinSections && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="mb-3 text-2xl">🔍</p>
              <p className="text-sm text-gray-500">
                Enter your 17-character VIN above to see the full breakdown — manufacturer, model year, assembly plant, and more.
              </p>
            </div>
          )}

          {!error && regoState === null && tab === "rego" && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="mb-3 text-2xl">🪪</p>
              <p className="text-sm text-gray-500">
                Enter an Australian registration plate to identify the state and access the official rego check.
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
