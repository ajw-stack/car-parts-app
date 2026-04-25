import { supabaseServer } from "../../../../lib/supabaseServer";
import Header from "../../../../components/Header";
import PartsPageClient from "./PartsPageClient";

export const revalidate = 60;

export default async function VehiclePartsPage({
  params,
}: {
  params: Promise<{ make: string; id: string }>;
}) {
  const { make, id } = await params;

  const [{ data: vehicle }, { data: fitments }] = await Promise.all([
    supabaseServer
      .from("vehicles")
      .select("id, make, model, series, grade, trim_code, year_from, year_to, engine_code, engine_litres, engine_config, fuel_type")
      .eq("id", id)
      .single(),
    supabaseServer
      .from("vehicle_part_fitments")
      .select(`
        position,
        notes,
        parts:part_id (
          id,
          brand,
          part_number,
          name,
          description,
          part_categories:category_id (
            name,
            sort_order
          )
        )
      `)
      .eq("vehicle_id", id),
  ]);

  const parts = (fitments ?? [])
    .map((f: any) => ({
      ...f.parts,
      position: f.position,
      fitment_notes: f.notes,
      category_name: f.parts?.part_categories?.name ?? f.parts?.category ?? "Other",
      sort_order: f.parts?.part_categories?.sort_order ?? 99,
    }))
    .filter((p: any) => p.id)
    .sort((a: any, b: any) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return (a.brand + a.part_number).localeCompare(b.brand + b.part_number);
    });

  const vehicleTitle = vehicle
    ? `${vehicle.make} ${vehicle.series ?? ""} ${vehicle.model}`.trim()
    : "Vehicle";

  const vehicleSubtitle = vehicle
    ? [
        vehicle.year_from,
        vehicle.year_to && vehicle.year_to !== vehicle.year_from ? `–${vehicle.year_to}` : "",
        vehicle.engine_litres ? `${vehicle.engine_litres}L` : "",
        vehicle.engine_code ? `• ${vehicle.engine_code}` : "",
        vehicle.engine_config ? `• ${vehicle.engine_config}` : "",
        vehicle.fuel_type ? `• ${vehicle.fuel_type}` : "",
      ].filter(Boolean).join(" ")
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 bg-[#F3F4F6]">
        <div className="mx-auto max-w-6xl px-4 py-8">

          {/* Back */}
          <a href={`/vehicles/${make}/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to {vehicleTitle}
          </a>

          {/* Title */}
          <div className="mt-3 mb-6">
            <h1 className="text-2xl font-bold text-[#111827]">{vehicleTitle}</h1>
            {vehicleSubtitle && (
              <p className="mt-0.5 text-sm text-gray-500">{vehicleSubtitle}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">
              {parts.length} compatible part{parts.length !== 1 ? "s" : ""}
            </p>
          </div>

          <PartsPageClient parts={parts} makeSlug={make} vehicleId={id} />

        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Elroco
      </footer>
    </div>
  );
}
