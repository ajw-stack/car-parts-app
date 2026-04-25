import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabaseServer } from "../lib/supabaseServer";
import { CATEGORIES, groupCategories, getDbNames } from "../lib/categories";

export default async function CategoriesPage() {
  const { data: parts } = await supabaseServer
    .from("parts")
    .select("category");

  // Count parts per DB category value
  const dbCounts: Record<string, number> = {};
  for (const p of parts ?? []) {
    dbCounts[p.category] = (dbCounts[p.category] || 0) + 1;
  }

  // Map counts to our category config
  function countFor(slug: string): number {
    const cat = CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return 0;
    return getDbNames(cat).reduce((sum, name) => sum + (dbCounts[name] || 0), 0);
  }

  const groups = groupCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 w-full bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">Categories</h1>
          <p className="mt-2 text-sm text-[#374151]">Browse parts by category.</p>

          <div className="mt-10 space-y-10">
            {Object.entries(groups).map(([group, cats]) => (
              <div key={group}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
                  {group}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {cats.map((cat) => {
                    const count = countFor(cat.slug);
                    return (
                      <Link
                        key={cat.slug}
                        href={`/categories/${cat.slug}`}
                        className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4 hover:border-[#D1D5DB] hover:bg-[#F3F4F6] transition-colors"
                      >
                        <p className="text-sm font-semibold text-[#1F2937]">{cat.name}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          {count > 0 ? `${count} parts` : "No parts yet"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
