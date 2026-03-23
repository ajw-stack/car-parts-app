import { supabaseServer } from "../../lib/supabaseServer";
import Header from "../../components/Header";

export default async function MazdaPage() {
  const { data: vehicles } = await supabaseServer
    .from("vehicles")
    .select("id, model, year_from, year_to, series, engine_code, engine_litres, fuel_type, engine_config, notes, grade")
    .eq("make", "Mazda")
    .order("model")
    .order("year_from");

  // Group by model
  const models: Record<string, typeof vehicles> = {};
  for (const v of vehicles ?? []) {
    if (!models[v.model]) models[v.model] = [];
    models[v.model]!.push(v);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      {/* White content area */}
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</a>
            <h1 className="mt-2 text-3xl font-bold text-[#111827]">Mazda</h1>
            <p className="mt-1 text-sm text-gray-500">{(vehicles ?? []).length} vehicle{(vehicles ?? []).length !== 1 ? "s" : ""} in catalogue</p>
          </div>

          {Object.keys(models).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-400">
              No Mazda vehicles in the catalogue yet.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(models).map(([model, variants]) => (
                <div key={model} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-[#141414] px-5 py-3">
                    <h2 className="text-lg font-semibold text-white">{model}</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {variants!.map((v) => (
                      <a
                        key={v.id}
                        href={`/vehicles/${v.id}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-[#111827]">
                            {v.series && <span className="mr-2 text-gray-500">{v.series}</span>}
                            {v.grade ?? model}
                          </div>
                          <div className="mt-0.5 text-sm text-gray-500">
                            {v.year_from}{v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}
                            {v.engine_litres ? ` • ${v.engine_litres}L` : ""}
                            {v.engine_config ? ` • ${v.engine_config}` : ""}
                            {v.fuel_type ? ` • ${v.fuel_type}` : ""}
                          </div>
                        </div>
                        <span className="text-gray-300 text-lg">›</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom header */}
      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
