import { supabaseServer } from "../../lib/supabaseServer";

export default async function PartPage({
  params,
}: {
  params: { id: string };
}) {
  const partId = params.id;

  const { data: part, error } = await supabaseServer
    .from("parts")
    .select("id, brand, part_number, name, category")
    .eq("id", partId)
    .single();

  if (error || !part) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back
          </a>
          <h1 className="mt-6 text-2xl font-bold">Part not found</h1>
        </div>
      </main>
    );
  }

  const { data: fits } = await supabaseServer
    .from("fitments")
    .select(
      `
      vehicles:vehicle_id (
        id, make, model, year_from, year_to, engine_code, engine_litres, fuel_type
      )
    `
    )
    .eq("part_id", partId);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to catalogue
          </a>
          <a href="/" className="text-sm font-semibold text-zinc-200 hover:text-white">
            Vehicle Parts Catalogue
          </a>
        </div>

        {/* Part card */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="text-xs font-semibold tracking-wide text-zinc-400">
            {part.category || "Part"}
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            {part.brand} {part.part_number}
          </h1>

          <p className="mt-2 text-sm text-zinc-300">{part.name}</p>
        </div>

        {/* Fitment list */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Fits Vehicles</h2>
            <span className="text-sm text-zinc-400">{(fits ?? []).length} found</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
            {(fits ?? []).length === 0 ? (
              <div className="bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
                No vehicles linked to this part yet.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800 bg-zinc-900/40">
                {(fits ?? []).map((f: any) => {
                  const v = f.vehicles;
                  return (
                    <li key={v.id} className="px-4 py-4">
                      <div className="font-semibold">
                        {v.make} {v.model}
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {v.year_from}-{v.year_to}
                        {v.engine_code ? ` • ${v.engine_code}` : ""}
                        {v.engine_litres ? ` • ${v.engine_litres}L` : ""}
                        {v.fuel_type ? ` • ${v.fuel_type}` : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}