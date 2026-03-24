import { supabaseServer } from "../../../../lib/supabaseServer";
import Header from "../../../../components/Header";

export default async function VehiclePartsPage({
  params,
}: {
  params: Promise<{ make: string; id: string }>;
}) {
  const { make, id } = await params;

  const { data: vehicle } = await supabaseServer
    .from("vehicles")
    .select("id, make, model, series, grade, year_from, year_to, engine_code, engine_litres, engine_config, fuel_type")
    .eq("id", id)
    .single();

  const { data: fitments } = await supabaseServer
    .from("vehicle_part_fitments")
    .select(`
      position,
      qty,
      engine_restriction,
      notes,
      parts:part_id (
        id,
        brand,
        part_number,
        name,
        description,
        oem_number,
        part_categories:category_id (
          name,
          sort_order
        )
      )
    `)
    .eq("vehicle_id", id);

  const parts = (fitments ?? [])
    .map((f: any) => ({
      ...f.parts,
      position: f.position,
      qty: f.qty,
      engine_restriction: f.engine_restriction,
      fitment_notes: f.notes,
      category_name: f.parts?.part_categories?.name ?? f.parts?.category ?? "Other",
      sort_order: f.parts?.part_categories?.sort_order ?? 99,
    }))
    .filter((p: any) => p.id)
    .sort((a: any, b: any) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return (a.brand + a.part_number).localeCompare(b.brand + b.part_number);
    });

  // Group by category, preserving sort order
  const byCategory: Record<string, { sort_order: number; parts: typeof parts }> = {};
  for (const p of parts) {
    if (!byCategory[p.category_name]) {
      byCategory[p.category_name] = { sort_order: p.sort_order, parts: [] };
    }
    byCategory[p.category_name].parts.push(p);
  }

  const sortedCategories = Object.entries(byCategory).sort(
    ([, a], [, b]) => a.sort_order - b.sort_order
  );

  const vehicleTitle = vehicle
    ? `${vehicle.make} ${vehicle.series ?? ""} ${vehicle.model} ${vehicle.grade ?? ""}`.trim()
    : "Vehicle";

  const vehicleSubtitle = vehicle
    ? [
        vehicle.year_from,
        vehicle.year_to && vehicle.year_to !== vehicle.year_from ? `–${vehicle.year_to}` : "",
        vehicle.engine_code ? `• ${vehicle.engine_code}` : "",
        vehicle.engine_litres ? `• ${vehicle.engine_litres}L` : "",
        vehicle.engine_config ? `• ${vehicle.engine_config}` : "",
        vehicle.fuel_type ? `• ${vehicle.fuel_type}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">

          {/* Back + nav */}
          <div className="flex items-center justify-between">
            <a href={`/vehicles/${make}/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
              ← Back to Specs
            </a>
            <a
              href={`/vehicles/${make}/${id}`}
              className="text-sm font-medium text-[#b40102] hover:underline"
            >
              View Specs
            </a>
          </div>

          {/* Title */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-[#111827]">{vehicleTitle}</h1>
            {vehicleSubtitle && (
              <p className="mt-0.5 text-sm text-gray-500">{vehicleSubtitle}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">
              {parts.length} compatible part{parts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Parts */}
          <div className="mt-6">
            {sortedCategories.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-400">
                No parts linked to this vehicle yet.
              </div>
            ) : (
              <div className="space-y-6">
                {sortedCategories.map(([category, { parts: categoryParts }]) => (
                  <div key={category} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-[#141414] px-5 py-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white">{category}</h2>
                      <span className="text-xs text-white/50">{categoryParts.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {categoryParts.map((p: any) => (
                        <a
                          key={`${p.id}-${p.position ?? "none"}`}
                          href={`/part/${p.id}`}
                          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-[#111827]">
                              {p.brand} {p.part_number}
                              {p.position && (
                                <span className="ml-2 text-xs font-normal text-gray-400 uppercase tracking-wide">
                                  {p.position}
                                </span>
                              )}
                              {p.qty > 1 && (
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                  ×{p.qty}
                                </span>
                              )}
                            </div>
                            {(p.description || p.name) && (
                              <div className="mt-0.5 text-sm text-gray-500">
                                {p.description ?? p.name}
                              </div>
                            )}
                            {p.oem_number && (
                              <div className="mt-0.5 text-xs text-gray-400">
                                OEM: {p.oem_number}
                              </div>
                            )}
                            {p.engine_restriction && (
                              <div className="mt-0.5 text-xs text-gray-400">
                                {p.engine_restriction}
                              </div>
                            )}
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
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
