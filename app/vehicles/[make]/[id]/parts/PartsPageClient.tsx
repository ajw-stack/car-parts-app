"use client";

import { useState } from "react";
import Link from "next/link";

type Part = {
  id: string;
  brand: string;
  part_number: string;
  name: string;
  description: string | null;
  position: string | null;
  fitment_notes: string | null;
  category_name: string;
  sort_order: number;
};

export default function PartsPageClient({
  parts,
  makeSlug,
  vehicleId,
}: {
  parts: Part[];
  makeSlug: string;
  vehicleId: string;
}) {
  // Build sorted category list
  const categories = Array.from(
    parts.reduce((map, p) => {
      if (!map.has(p.category_name)) map.set(p.category_name, p.sort_order);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => a[1] - b[1]).map(([name]) => name);

  const [activeCategory, setActiveCategory] = useState<string>(categories[0] ?? "");

  const visibleParts = activeCategory
    ? parts.filter((p) => p.category_name === activeCategory)
    : parts;

  return (
    <div className="flex gap-6 items-start">

      {/* Left sidebar — categories */}
      <aside className="w-56 shrink-0 sticky top-6">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-[#141414] px-4 py-3">
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Categories</p>
          </div>
          <nav className="divide-y divide-gray-100">
            {categories.map((cat) => {
              const count = parts.filter((p) => p.category_name === cat).length;
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                    active
                      ? "bg-[#b40102] text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Centre — parts list */}
      <div className="flex-1 min-w-0">
        {visibleParts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-gray-400">
            No parts in this category yet.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="bg-[#141414] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{activeCategory}</h2>
              <span className="text-xs text-white/50">{visibleParts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {visibleParts.map((p) => (
                <Link
                  key={`${p.id}-${p.position ?? "none"}`}
                  href={`/part/${p.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[#111827]">
                      {p.brand} {p.part_number}
                      {p.position && (
                        <span className="ml-2 text-xs font-normal text-gray-400 uppercase tracking-wide">
                          {p.position}
                        </span>
                      )}
                    </div>
                    {(p.description || p.name) && (
                      <div className="mt-0.5 text-sm text-gray-500">
                        {p.description ?? p.name}
                      </div>
                    )}
                    {p.fitment_notes && (
                      <div className="mt-0.5 text-xs text-gray-400">{p.fitment_notes}</div>
                    )}
                  </div>
                  <span className="ml-4 text-gray-300 text-lg shrink-0">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
