"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabaseClient";
import { useIsAdmin } from "../../lib/auth/useIsAdmin";

type Report = {
  id: string; created_at: string; vin: string; wrong_fields: string[];
  correct_make: string | null; correct_model: string | null; correct_year: string | null; correct_details: string | null;
  evidence: string | null; comment: string | null; status: string; admin_note: string | null;
  decoded: { valid?: boolean; summary?: Record<string, string | number | null> } | null;
};
const STATUSES = ["new", "checking", "fixed", "not_a_fault"] as const;

/** Admin triage of "wrong decode" reports. Access is enforced by RLS (admin-only select/update). */
export default function VinFeedbackAdmin() {
  const admin = useIsAdmin();
  const [filter, setFilter] = useState<string>("new");
  const [rows, setRows] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let q = supabase.from("vin_feedback").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) setError(error.message); else setRows((data ?? []) as Report[]);
  }, [filter]);
  // load() only sets state after the network round-trip, so this does not cascade renders.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (admin) load(); }, [admin, load]);

  const update = async (id: string, patch: Partial<Report>) => {
    const { error } = await supabase.from("vin_feedback").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setError(error.message); else load();
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-[#111827]">VIN decode reports</h1>
        {admin === false && <p className="text-sm text-gray-500">Admins only.</p>}
        {admin && (
          <>
            <div className="flex flex-wrap gap-2">
              {["new", "checking", "fixed", "not_a_fault", "all"].map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-gray-200 text-gray-600"}`}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {rows.length === 0 && <p className="text-sm text-gray-500">No reports here.</p>}
            <ul className="space-y-3">
              {rows.map((r) => {
                const s = r.decoded?.summary ?? {};
                return (
                  <li key={r.id} className="rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold tracking-wider">{r.vin}</span>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString("en-AU")}</span>
                    </div>
                    <p className="text-gray-600"><span className="text-gray-400">We decoded: </span>
                      {[s.modelYear, s.make, s.model, s.series, s.engine].filter(Boolean).join(" · ") || "nothing"}</p>
                    <p><span className="text-gray-400">Wrong: </span>{r.wrong_fields.join(", ") || "—"}</p>
                    <p><span className="text-gray-400">Actually: </span>
                      {[r.correct_year, r.correct_make, r.correct_model, r.correct_details].filter(Boolean).join(" · ") || "—"}</p>
                    {r.evidence && <p><span className="text-gray-400">Evidence: </span>{r.evidence}</p>}
                    {r.comment && <p className="whitespace-pre-wrap"><span className="text-gray-400">Comment: </span>{r.comment}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                        {STATUSES.map((st) => <option key={st} value={st}>{st.replace(/_/g, " ")}</option>)}
                      </select>
                      <input defaultValue={r.admin_note ?? ""} placeholder="Note (what was fixed / why not)"
                        onBlur={(e) => e.target.value !== (r.admin_note ?? "") && update(r.id, { admin_note: e.target.value })}
                        className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-2 py-1 text-xs" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
