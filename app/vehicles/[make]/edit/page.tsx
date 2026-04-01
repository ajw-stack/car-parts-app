"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { supabase } from "../../../lib/supabaseClient";

export default function EditMakePage({
  params,
}: {
  params: Promise<{ make: string }>;
}) {
  const { make: makeSlug } = use(params);
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const [makeName, setMakeName] = useState("");
  const [logoUrl, setLogoUrl]   = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      // Resolve canonical make name from the slug via the API
      const res = await fetch(`/api/makes/resolve?slug=${encodeURIComponent(makeSlug)}`);
      const { make: canonical } = await res.json();
      if (!canonical) { setError("Make not found."); setLoading(false); return; }
      setMakeName(canonical);

      const { data } = await supabase
        .from("makes")
        .select("logo_url")
        .eq("make", canonical)
        .maybeSingle();

      setLogoUrl((data?.logo_url as string) ?? "");
      setLoading(false);
    }
    init();
  }, [makeSlug, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const res = await fetch(`/api/makes/${encodeURIComponent(makeName)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ logo_url: logoUrl.trim() || null }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Save failed.");
    } else {
      setSuccess(true);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
        <Header />
        <main className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-8">

          <a href={`/vehicles/${makeSlug}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to {makeName}
          </a>

          <div className="mt-4 mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Edit Make</p>
            <h1 className="mt-1 text-2xl font-bold text-[#111827]">{makeName} — Logo</h1>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827] outline-none focus:border-gray-400"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…"
                type="url"
              />
              {logoUrl.trim() && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 160 }}>
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="object-contain h-full p-4"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            {error   && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">Saved successfully.</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-40">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <a href={`/vehicles/${makeSlug}`}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </a>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
