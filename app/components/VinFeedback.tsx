"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const WRONG = [
  ["make", "Make"], ["model", "Model / series"], ["year", "Year"], ["engine", "Engine"], ["body", "Body"],
  ["transmission", "Transmission"], ["drive", "Drive"], ["trim", "Trim"], ["plant", "Plant / country"], ["other", "Something else"],
] as const;
const EVIDENCE = ["Compliance or build plate", "Build / option sticker", "Registration papers", "Owner's or service book", "I own / work on this vehicle", "Other"];

/** "This decode looks wrong" — sends a report the Elroco team checks and turns into a decoder fix. */
export default function VinFeedback({ vin }: { vin: string }) {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Thanks — your report is in. We check every one and fix the decoder where it&apos;s wrong.
      </div>
    );
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-[#CC0000] hover:text-[#CC0000] transition-colors">
        Something wrong or missing in this decode? <span className="font-semibold">Tell us</span>
      </button>
    );
  }

  const toggle = (f: string) => setWrong((w) => (w.includes(f) ? w.filter((x) => x !== f) : [...w, f]));
  const submit = async () => {
    setError(null);
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/vin/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ vin, wrongFields: wrong, correctMake: make, correctModel: model, correctYear: year, correctDetails: details, evidence, comment }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setSending(false);
    if (!res.ok || !data.ok) { setError(data.error ?? "Could not send the report."); return; }
    setDone(true);
  };

  const input = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none";
  return (
    <div className="rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-[#111827]">Report a wrong decode</h4>
        <p className="mt-0.5 text-xs text-gray-500">VIN <span className="font-mono">{vin}</span>. Every report is checked by a person before the decoder changes.</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">What&apos;s wrong or missing?</p>
        <div className="flex flex-wrap gap-2">
          {WRONG.map(([k, label]) => (
            <button key={k} type="button" onClick={() => toggle(k)}
              className={`rounded-full border px-3 py-1 text-xs ${wrong.includes(k) ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">What is the vehicle actually? (as much as you know)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={input} placeholder="Make (e.g. Audi)" value={make} maxLength={60} onChange={(e) => setMake(e.target.value)} />
          <input className={input} placeholder="Model (e.g. RS 7 Sportback)" value={model} maxLength={120} onChange={(e) => setModel(e.target.value)} />
          <input className={input} placeholder="Year" value={year} maxLength={10} inputMode="numeric" onChange={(e) => setYear(e.target.value)} />
        </div>
        <input className={`${input} mt-2`} placeholder="Engine, series, trim, gearbox… (e.g. 4.0 V8, Performance, C7)" value={details} maxLength={500} onChange={(e) => setDetails(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select className={input} value={evidence} onChange={(e) => setEvidence(e.target.value)}>
          <option value="">How do you know? (optional)</option>
          {EVIDENCE.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <textarea className={`${input} min-h-[80px]`} placeholder="Anything else (optional)" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={sending} className="rounded-xl bg-[#CC0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#aa0000] disabled:opacity-40">
          {sending ? "Sending…" : "Send report"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800">Cancel</button>
      </div>
    </div>
  );
}
