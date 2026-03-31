import { supabaseServer } from "../../lib/supabaseServer";
import Header from "../../components/Header";
import { notFound } from "next/navigation";
import PartDetailClient from "./PartDetailClient";
import ImageCarousel from "./ImageCarousel";

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
    .select("id, brand, part_number, name, description, oem_number, category, category_id, image_url, image_urls, specs, part_categories:category_id(name)")
    .eq("id", partId)
    .single();

  if (error || !part) notFound();

  const categoryName = (part as any).part_categories?.name ?? part.category ?? "Part";

  // Cross-references
  const { data: crossRefs } = await supabaseServer
    .from("cross_references")
    .select(`cross_part:cross_part_id (id, brand, part_number, name)`)
    .eq("part_id", partId);

  const refs = (crossRefs ?? []).map((r: any) => r.cross_part).filter(Boolean);
  const oemRefs = refs.filter((r: any) => isOemBrand(r.brand));
  const aftermarketRefs = refs.filter((r: any) => !isOemBrand(r.brand));

  const crossRefLabel: Record<string, string> = {};
  for (const r of refs) {
    crossRefLabel[r.id] = `${r.brand} ${r.part_number}`;
  }
  const crossRefIds = refs.map((r: any) => r.id);
  const allPartIds = [partId, ...crossRefIds];

  // Vehicle fitments
  const { data: fitments } = await supabaseServer
    .from("vehicle_part_fitments")
    .select(`
      part_id,
      position,
      engine_restriction,
      notes,
      vehicles:vehicle_id (
        id, make, model, series, grade, trim_code, year_from, year_to,
        engine_code, engine_litres, engine_config, fuel_type
      )
    `)
    .in("part_id", allPartIds);

  // Group fitments by make
  const fitsByMake: Record<string, any[]> = {};
  for (const f of fitments ?? []) {
    const v = (f as any).vehicles;
    if (!v) continue;
    if (!fitsByMake[v.make]) fitsByMake[v.make] = [];
    fitsByMake[v.make].push(f);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">

          {/* Back */}
          <a href="/parts-guide" className="text-sm text-gray-400 hover:text-gray-600">
            ← Parts Guide
          </a>

          {/* Hero: image + part identity */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* Image carousel — rendered client-side in PartDetailClient */}
            <ImageCarousel
              images={[
                ...((part as any).image_urls ?? []),
                ...((part as any).image_url ? [(part as any).image_url] : []),
              ].filter((v, i, a) => a.indexOf(v) === i)}
              alt={`${part.brand} ${part.part_number}`}
            />

            {/* Part identity */}
            <div className="py-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {categoryName}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#111827]">
                {part.part_number}
              </h1>
              <p className="mt-1 text-lg text-gray-500">{part.brand}</p>
              {(part.description ?? part.name) && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  {part.description ?? part.name}
                </p>
              )}
              {(part as any).oem_number && (
                <p className="mt-3 text-xs text-gray-400">OEM Ref: {(part as any).oem_number}</p>
              )}
            </div>
          </div>

          {/* Accordions */}
          <div className="mt-8 space-y-3">

            {/* Tech Specs */}
            <PartDetailClient
              specs={(part as any).specs ?? null}
              oemRefs={oemRefs}
              aftermarketRefs={aftermarketRefs}
              fitsByMake={fitsByMake}
              fitments={fitments ?? []}
              partId={partId}
              crossRefLabel={crossRefLabel}
              imageUrls={(part as any).image_urls ?? []}
              imageFallback={(part as any).image_url ?? null}
            />

          </div>
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
