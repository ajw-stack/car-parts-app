"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { supabase } from "../../../lib/supabaseClient";

type SpecRow = { key: string; value: string };

function specsToRows(specs: Record<string, string> | null): SpecRow[] {
  if (!specs) return [];
  return Object.entries(specs).map(([key, value]) => ({ key, value }));
}

function rowsToSpecs(rows: SpecRow[]): Record<string, string> | null {
  const filtered = rows.filter((r) => r.key.trim());
  if (filtered.length === 0) return null;
  return Object.fromEntries(filtered.map((r) => [r.key.trim(), r.value.trim()]));
}

export default function EditPartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: partId } = use(params);
  const router = useRouter();

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  // Form fields
  const [brand, setBrand]           = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl]     = useState("");
  const [specs, setSpecs]           = useState<SpecRow[]>([]);

  useEffect(() => {
    async function init() {
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      // Load part
      const { data: part, error } = await supabase
        .from("parts")
        .select("brand, part_number, name, description, image_url, specs")
        .eq("id", partId)
        .single();

      if (error || !part) {
        setError("Part not found.");
        setLoading(false);
        return;
      }

      setBrand(part.brand ?? "");
      setPartNumber(part.part_number ?? "");
      setName(part.name ?? "");
      setDescription(part.description ?? "");
      setImageUrl(part.image_url ?? "");
      setSpecs(specsToRows(part.specs));
      setLoading(false);
    }
    init();
  }, [partId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const res = await fetch(`/api/parts/${partId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name:        name.trim()        || null,
        description: description.trim() || null,
        image_url:   imageUrl.trim()    || null,
        specs:       rowsToSpecs(specs),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Save failed.");
    } else {
      setSuccess(true);
    }

    setSaving(false);
  }

  function addSpecRow() {
    setSpecs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeSpecRow(i: number) {
    setSpecs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSpecRow(i: number, field: "key" | "value", val: string) {
    setSpecs((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
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

          <a href={`/part/${partId}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to part
          </a>

          <div className="mt-4 mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Edit Part</p>
            <h1 className="mt-1 text-2xl font-bold text-[#111827]">
              {brand} {partNumber}
            </h1>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827] outline-none focus:border-gray-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oil Filter"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827] outline-none focus:border-gray-400 resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the part…"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827] outline-none focus:border-gray-400"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                type="url"
              />
              {imageUrl && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 160 }}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="object-contain h-full p-4"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            {/* Tech Specs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Tech Specs</label>
                <button
                  type="button"
                  onClick={addSpecRow}
                  className="text-xs font-semibold text-[#111827] hover:underline"
                >
                  + Add row
                </button>
              </div>

              {specs.length === 0 ? (
                <p className="text-sm text-gray-400">No specs yet. Click "+ Add row" to start.</p>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {specs.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white">
                      <input
                        className="flex-1 text-sm border-0 outline-none bg-transparent text-gray-700 font-medium"
                        placeholder="Label (e.g. Thread)"
                        value={row.key}
                        onChange={(e) => updateSpecRow(i, "key", e.target.value)}
                      />
                      <span className="text-gray-300">•</span>
                      <input
                        className="flex-1 text-sm border-0 outline-none bg-transparent text-gray-900 text-right"
                        placeholder="Value (e.g. 3/4 x 16)"
                        value={row.value}
                        onChange={(e) => updateSpecRow(i, "value", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecRow(i)}
                        className="ml-2 text-gray-300 hover:text-red-400 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error   && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">Saved successfully.</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <a
                href={`/part/${partId}`}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
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
