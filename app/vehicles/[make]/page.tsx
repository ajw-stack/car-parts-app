import { supabaseServer } from "../../lib/supabaseServer";
import Header from "../../components/Header";
import { MAKES_CONFIG, slugToMake } from "../../lib/makes";
import { notFound } from "next/navigation";
import VehicleModelList from "./VehicleModelList";

export const revalidate = 60;

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

          <VehicleModelList
            makeSlug={makeSlugParam}
            models={[
              ...configModels.map((model) => ({
                model,
                variants: (dbByModel[model] ?? []) as any[],
                hasData: (dbByModel[model] ?? []).length > 0,
              })),
              ...Object.entries(dbByModel)
                .filter(([model]) => !configModels.includes(model))
                .map(([model, variants]) => ({
                  model,
                  variants: (variants ?? []) as any[],
                  hasData: true,
                })),
            ]}
          />
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
