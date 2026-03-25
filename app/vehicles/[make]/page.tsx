import { supabaseServer } from "../../lib/supabaseServer";
import Header from "../../components/Header";
import { MAKES_CONFIG, slugToMake } from "../../lib/makes";
import { notFound } from "next/navigation";

export default async function MakePage({ params }: { params: Promise<{ make: string }> }) {
  const { make: makeSlugParam } = await params;

  const canonicalMake = slugToMake(makeSlugParam);
  if (!canonicalMake) {
    notFound();
  }

  const configModels = MAKES_CONFIG[canonicalMake] ?? [];

  const { data: vehicles } = await supabaseServer
    .from("vehicles")
    .select("id, model, year_from, year_to, series, engine_code, engine_litres, fuel_type, engine_config, notes, grade, trim_code, specs")
    .eq("make", canonicalMake)
    .order("model")
    .order("year_from", { nullsFirst: false })
    .order("year_to", { nullsFirst: false })
    .order("engine_litres", { nullsFirst: false });

  // Group DB vehicles by model
  const dbByModel: Record<string, typeof vehicles> = {};
  for (const v of vehicles ?? []) {
    if (!dbByModel[v.model]) dbByModel[v.model] = [];
    dbByModel[v.model]!.push(v);
  }

  const totalVehicles = (vehicles ?? []).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</a>
            <h1 className="mt-2 text-3xl font-bold text-[#111827]">{canonicalMake}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalVehicles} vehicle{totalVehicles !== 1 ? "s" : ""} in catalogue
            </p>
          </div>

          <div className="space-y-3">
            {configModels.map((model) => {
              const variants = dbByModel[model] ?? [];
              const hasData = variants.length > 0;

              return (
                <div key={model} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Model header */}
                  <div className="bg-[#141414] px-5 py-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">{model}</h2>
                    {hasData && (
                      <span className="ml-3 inline-flex items-center rounded-full bg-[#b40102] px-2.5 py-0.5 text-xs font-medium text-white">
                        {variants.length}
                      </span>
                    )}
                  </div>

                  {hasData ? (
                    <div className="divide-y divide-gray-100">
                      {variants.map((v) => (
                        <a
                          key={v.id}
                          href={`/vehicles/${makeSlugParam}/${v.id}`}
                          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-[#111827]">
                              {v.series && <span className="mr-2 text-gray-500">{v.series}</span>}
                              {v.trim_code ?? v.grade ?? model}
                            </div>
                            <div className="mt-0.5 text-sm text-gray-500">
                              {v.year_from}
                              {v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}
                              {v.engine_code ? ` • ${v.engine_code}` : ""}
                              {v.engine_litres ? ` • ${v.engine_litres}L` : ""}
                              {v.engine_config ? ` • ${v.engine_config}` : ""}
                              {v.fuel_type ? ` • ${v.fuel_type}` : ""}
                            </div>
                          </div>
                          <span className="text-gray-300 text-lg">›</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-3 text-sm text-gray-400 italic">
                      Coming soon
                    </div>
                  )}
                </div>
              );
            })}

            {/* Show any DB models not in the config list */}
            {Object.entries(dbByModel)
              .filter(([model]) => !configModels.includes(model))
              .map(([model, variants]) => (
                <div key={model} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-[#141414] px-5 py-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">{model}</h2>
                    <span className="ml-3 inline-flex items-center rounded-full bg-[#b40102] px-2.5 py-0.5 text-xs font-medium text-white">
                      {variants!.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {variants!.map((v) => (
                      <a
                        key={v.id}
                        href={`/vehicles/${makeSlugParam}/${v.id}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-[#111827]">
                            {v.series && <span className="mr-2 text-gray-500">{v.series}</span>}
                            {v.trim_code ?? v.grade ?? model}
                          </div>
                          <div className="mt-0.5 text-sm text-gray-500">
                            {v.year_from}
                            {v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}
                            {v.engine_code ? ` • ${v.engine_code}` : ""}
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
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
