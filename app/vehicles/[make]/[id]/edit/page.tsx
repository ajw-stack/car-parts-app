"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";
import { supabase } from "../../../../lib/supabaseClient";

export default function EditVehiclePage({
  params,
}: {
  params: Promise<{ make: string; id: string }>;
}) {
  const { make: makeSlug, id: vehicleId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const [title, setTitle]         = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: v, error } = await supabase
        .from("vehicles")
        .select("make, series, model, image_urls")
        .eq("id", vehicleId)
        .single();

      if (error || !v) { setError("Vehicle not found."); setLoading(false); return; }

      setTitle(`${v.make} ${v.series ?? ""} ${v.model}`.trim());
      const urls = (v.image_urls as string[] | null) ?? [];
      setImageUrls(urls.length > 0 ? urls : [""]);
      setLoading(false);
    }
    init();
  }, [vehicleId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const cleanedUrls = imageUrls.map((u) => u.trim()).filter(Boolean);

    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ image_urls: cleanedUrls.length > 0 ? cleanedUrls : null }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Save failed.");
    } else {
      setSuccess(true);
    }
    setSaving(false);
  }

  function addImageRow() { setImageUrls((p) => [...p, ""]); }

  function removeImageRow(i: number) {
    setImageUrls((p) => p.filter((_, idx) => idx !== i));
  }

  function updateImageUrl(i: number, val: string) {
    setImageUrls((p) => p.map((u, idx) => (idx === i ? val : u)));
  }

  function moveImage(i: number, dir: -1 | 1) {
    setImageUrls((p) => {
      const next = [...p];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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

          <a href={`/vehicles/${makeSlug}/${vehicleId}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to vehicle
          </a>

          <div className="mt-4 mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Edit Vehicle</p>
            <h1 className="mt-1 text-2xl font-bold text-[#111827]">{title}</h1>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Images</label>
                <button type="button" onClick={addImageRow}
                  className="text-xs font-semibold text-[#111827] hover:underline">
                  + Add image
                </button>
              </div>

              <div className="space-y-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      {imageUrls.length > 1 && (
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none px-1 py-0.5">▲</button>
                          <button type="button" onClick={() => moveImage(i, 1)} disabled={i === imageUrls.length - 1}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none px-1 py-0.5">▼</button>
                        </div>
                      )}
                      <input
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827] outline-none focus:border-gray-400"
                        value={url}
                        onChange={(e) => updateImageUrl(i, e.target.value)}
                        placeholder="https://…"
                        type="url"
                      />
                      {imageUrls.length > 1 && (
                        <button type="button" onClick={() => removeImageRow(i)}
                          className="text-gray-300 hover:text-red-400 text-xl leading-none px-1">×</button>
                      )}
                    </div>
                    {url.trim() && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 160 }}>
                        <img src={url} alt={`Preview ${i + 1}`} className="object-contain h-full p-4"
                          onError={(e) => (e.currentTarget.style.display = "none")} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error   && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">Saved successfully.</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-40">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <a href={`/vehicles/${makeSlug}/${vehicleId}`}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </a>
            </div>

          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
