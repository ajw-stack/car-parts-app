import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import { supabaseServer } from "../../lib/supabaseServer";
import { getCategoryBySlug, getDbNames } from "../../lib/categories";

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = getCategoryBySlug(params.slug);
  if (!cat) notFound();

  const dbNames = getDbNames(cat);

  // Fetch parts in this category with fitment count
  const { data: parts } = await supabaseServer
    .from("parts")
    .select("id, brand, part_number, name, category, fitments(count)")
    .in("category", dbNames)
    .order("brand")
    .order("part_number");

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 w-full bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <Link href="/categories" className="hover:text-[#1F2937] transition-colors">
              Categories
            </Link>
            <span>/</span>
            <span className="text-[#1F2937] font-medium">{cat.name}</span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">{cat.name}</h1>
            <span className="text-sm text-[#9CA3AF]">{(parts ?? []).length} parts</span>
          </div>
          <p className="mt-1 text-sm text-[#6B7280]">{cat.group}</p>

          <div className="mt-8">
            {(parts ?? []).length === 0 ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-12 text-center text-sm text-[#9CA3AF]">
                No parts in this category yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        Part Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        Fits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {(parts ?? []).map((p: any) => {
                      const fitCount = p.fitments?.[0]?.count ?? 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1F2937]">{p.brand}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/part/${p.id}`}
                              className="font-mono font-semibold text-[#1F2937] hover:underline"
                            >
                              {p.part_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[#374151]">{p.name || "—"}</td>
                          <td className="px-4 py-3 text-right text-[#9CA3AF]">
                            {fitCount > 0 ? (
                              <span className="text-[#374151]">{fitCount} vehicle{fitCount !== 1 ? "s" : ""}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#1A1A1A] bg-[#0F0F0F] px-6 py-6 text-sm text-white/70">
        <div className="mx-auto max-w-5xl text-center">
          © 2026 Global Parts Catalogue. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
