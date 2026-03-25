import { supabaseServer } from "../../lib/supabaseServer";
import Header from "../../components/Header";
import { notFound } from "next/navigation";

const OEM_BRANDS = new Set([
  "holden", "toyota", "ford", "mitsubishi", "mazda", "honda", "nissan", "subaru",
  "hyundai", "kia", "volkswagen", "bmw", "mercedes", "audi", "gm", "chrysler",
  "jeep", "dodge", "ram", "fiat", "peugeot", "renault", "volvo", "land rover",
  "jaguar", "lexus", "infiniti", "acura", "isuzu", "suzuki", "daihatsu",
  "ssangyong", "great wall", "chery",
]);

function isOemBrand(brand: string) {
  return OEM_BRANDS.has(brand.toLowerCase());
}

export default async function PartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partId } = await params;

  const { data: part, error } = await supabaseServer
    .from("parts")
    .select("id, brand, part_number, name, description, oem_number, category, category_id, part_categories:category_id(name)")
    .eq("id", partId)
    .single();

  if (error || !part) notFound();

  const categoryName = (part as any).part_categories?.name ?? part.category ?? "Part";

  // Cross-references
  const { data: crossRefs } = await supabaseServer
    .from("cross_references")
    .select(`
      cross_part:cross_part_id (
        id,
        brand,
        part_number,
        name
      )
    `)
    .eq("part_id", partId);

  const refs = (crossRefs ?? []).map((r: any) => r.cross_part).filter(Boolean);
  const oemRefs = refs.filter((r: any) => isOemBrand(r.brand));
  const aftermarketRefs = refs.filter((r: any) => !isOemBrand(r.brand));

  // Group aftermarket refs by brand
  // Vehicle fitments
  const { data: fitments } = await supabaseServer
    .from("vehicle_part_fitments")
    .select(`
      position,
      engine_restriction,
      notes,
      vehicles:vehicle_id (
        id, make, model, series, grade, year_from, year_to, engine_code, engine_litres, engine_config, fuel_type
      )
    `)
    .eq("part_id", partId);

  // Group fitments by make for display
  const fitsByMake: Record<string, typeof fitments> = {};
  for (const f of fitments ?? []) {
    const v = (f as any).vehicles;
    if (!v) continue;
    if (!fitsByMake[v.make]) fitsByMake[v.make] = [];
    fitsByMake[v.make]!.push(f);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">

          {/* Back */}
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to catalogue
          </a>

          {/* Part header */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {categoryName}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#111827]">
              {part.brand} {part.part_number}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{part.description ?? part.name}</p>
            {(part as any).oem_number && (
              <p className="mt-1 text-xs text-gray-400">OEM: {(part as any).oem_number}</p>
            )}
          </div>

          {/* OEM Numbers */}
          {oemRefs.length > 0 && (
            <div className="mt-6 rounded-xl border border-blue-100 overflow-hidden">
              <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-blue-800">OEM Part Numbers</h2>
              </div>
              <div className="divide-y divide-blue-50">
                {oemRefs.map((r: any) => (
                  <a
                    key={r.id}
                    href={`/part/${r.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-[#111827]">{r.brand} {r.part_number}</span>
                      {r.name && r.name !== part.name && (
                        <span className="ml-2 text-sm text-gray-500">{r.name}</span>
                      )}
                    </div>
                    <span className="text-gray-300 text-lg">›</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Aftermarket Cross-References */}
          {aftermarketRefs.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-[#141414] px-5 py-3">
                <h2 className="text-sm font-semibold text-white">Cross-References</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {aftermarketRefs.map((r: any) => (
                  <a
                    key={r.id}
                    href={`/part/${r.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-[#111827]">{r.brand} {r.part_number}</span>
                      {r.name && r.name !== part.name && (
                        <span className="ml-2 text-sm text-gray-500">{r.name}</span>
                      )}
                    </div>
                    <span className="text-gray-300 text-lg">›</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Fitments */}
          <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#141414] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Fits Vehicles</h2>
              <span className="text-xs text-white/50">{(fitments ?? []).length}</span>
            </div>

            {(fitments ?? []).length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400">
                No vehicles linked to this part yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {Object.entries(fitsByMake).map(([make, makeFitments]) => (
                  <div key={make}>
                    <div className="px-5 py-2 bg-gray-50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{make}</p>
                    </div>
                    {makeFitments!.map((f: any, i: number) => {
                      const v = f.vehicles;
                      return (
                        <a
                          key={`${v.id}-${i}`}
                          href={`/vehicles/${make.toLowerCase()}/${v.id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-[#111827]">
                              {v.series && <span className="mr-2 text-gray-500">{v.series}</span>}
                              {v.model}
                              {v.grade && <span className="ml-2 text-gray-500">{v.grade}</span>}
                            </div>
                            <div className="mt-0.5 text-sm text-gray-500">
                              {v.year_from}
                              {v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}
                              {v.engine_code ? ` • ${v.engine_code}` : ""}
                              {v.engine_litres ? ` • ${v.engine_litres}L` : ""}
                              {v.engine_config ? ` • ${v.engine_config}` : ""}
                              {v.fuel_type ? ` • ${v.fuel_type}` : ""}
                              {f.position ? ` • ${f.position}` : ""}
                              {f.engine_restriction ? ` • ${f.engine_restriction}` : ""}
                            </div>
                          </div>
                          <span className="text-gray-300 text-lg">›</span>
                        </a>
                      );
                    })}
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
