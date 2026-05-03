"use client";

import { useState } from "react";
import Link from "next/link";

// Maps DB category names → display group
const CATEGORY_GROUPS: Record<string, string> = {
  "Brake Rotor": "Brakes", "Brake Rotors": "Brakes", "Brake discs": "Brakes",
  "Brake Pad": "Brakes", "Brake Pads": "Brakes", "Brake Pad Set": "Brakes",
  "Brake pads": "Brakes", "Brake pad accessories": "Brakes",
  "Brake Shoe": "Brakes", "Brake Shoe Set": "Brakes", "Brake Shoe Sets": "Brakes",
  "Shoes": "Brakes", "Park Brake Shoe Set": "Brakes",
  "Brake Drum": "Brakes", "Brake Drums": "Brakes", "Drums": "Brakes",
  "Brake Calipers": "Brakes", "Caliper": "Brakes", "LCV calipers": "Brakes", "LCV caliper bracket": "Brakes",
  "Brake Hose": "Brakes", "Brake Hose Set": "Brakes", "Brake Hoses": "Brakes", "Brake Lines & Hoses": "Brakes",
  "High Performance Brake Kit": "Brakes", "UPGRADE GT kit": "Brakes", "Disc and Pad Kit": "Brakes",
  "Brake Upgrade Kits": "Brakes",
  "Master Cylinder": "Brakes", "Master Cylinders": "Brakes",
  "Brake Booster": "Brakes", "Brakes": "Brakes",
  "Brake Fluid": "Oil & Fluids",
  "Water Pump": "Cooling", "Thermostat": "Cooling", "Radiator Hoses": "Cooling",
  "Heater Hose": "Cooling", "Radiator Hose": "Cooling", "Coolant Pipe": "Cooling",
  "Cap, coolant tank": "Cooling", "Cap, radiator": "Cooling",
  "Heater Control Valve": "Cooling", "Coolant Control Valve": "Cooling",
  "Timing Belt Kit": "Belts & Timing Parts", "Timing Belt Kits": "Belts & Timing Parts", "Timing Belt": "Belts & Timing Parts",
  "Drive Belts": "Belts & Timing Parts", "V-Belt": "Belts & Timing Parts", "V-ribbed Belt": "Belts & Timing Parts",
  "Gasket": "Engine Parts", "Seal": "Engine Parts",
  "Oil Filters": "Filters", "Oil Filter": "Filters",
  "Air Filter": "Filters", "Fuel Filter": "Filters",
  "Cabin Filter": "Filters", "Transmission Filter": "Filters",
  "Spark Plug": "Ignition", "Glow Plug": "Ignition",
  "Engine Oil": "Oil & Fluids",
  "Differential Oil": "Oil & Fluids",
  "Automatic Trans Fluid": "Oil & Fluids", "Automatic Transmission Fluid": "Oil & Fluids",
  "Manual Transmission Oil": "Oil & Fluids", "Manual Trans Oil": "Oil & Fluids",
  "Power Steering Fluid": "Oil & Fluids",
  "Engine Coolant/Antifreeze Fluid": "Oil & Fluids", "Engine Coolant": "Oil & Fluids", "Coolant": "Oil & Fluids",
  "Intake System Cleaner": "Oil & Fluids",
  "Suspension": "Suspension & Steering",
  "Battery": "Electrical", "Alternator": "Electrical", "Starter Motor": "Electrical",
};

function getGroup(categoryName: string): string {
  return CATEGORY_GROUPS[categoryName] ?? "Other";
}

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
}: {
  parts: Part[];
  makeSlug: string;
  vehicleId: string;
}) {
  // Build sorted category list with groups
  const categoryList = Array.from(
    parts.reduce((map, p) => {
      if (!map.has(p.category_name)) map.set(p.category_name, p.sort_order);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => a[1] - b[1]).map(([name]) => name);

  // Group categories
  const grouped: Record<string, string[]> = {};
  for (const cat of categoryList) {
    const g = getGroup(cat);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(cat);
  }
  const groupOrder = ["Brakes", "Cooling", "Engine Parts", "Belts & Timing Parts", "Oil & Fluids", "Filters",
    "Ignition", "Drivetrain", "Suspension & Steering", "Electrical", "Other"];
  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => (groupOrder.indexOf(a) + 1 || 99) - (groupOrder.indexOf(b) + 1 || 99)
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(sortedGroups));

  function toggleGroup(g: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  }

  const visibleParts = activeCategory === null
    ? parts
    : parts.filter((p) => p.category_name === activeCategory);

  const headerLabel = activeCategory === null ? "All Parts" : activeCategory;

  return (
    <div className="flex gap-6 items-start">

      {/* Left sidebar — hierarchical categories */}
      <aside className="w-56 shrink-0 sticky top-6">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-[#141414] px-4 py-3">
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Categories</p>
          </div>
          <nav>

            {/* Show All */}
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors border-b border-gray-100 ${
                activeCategory === null
                  ? "bg-[#E8000D] text-white font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>Show All</span>
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeCategory === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {parts.length}
              </span>
            </button>

            {/* Grouped categories */}
            {sortedGroups.map((group) => {
              const cats = grouped[group];
              const groupCount = cats.reduce((n, cat) => n + parts.filter(p => p.category_name === cat).length, 0);
              const isOpen = openGroups.has(group);
              return (
                <div key={group} className="border-b border-gray-100 last:border-b-0">
                  {/* Group heading */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{groupCount}</span>
                      <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {/* Sub-categories */}
                  {isOpen && (
                    <div className="divide-y divide-gray-50">
                      {cats.map((cat) => {
                        const count = parts.filter((p) => p.category_name === cat).length;
                        const active = cat === activeCategory;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`w-full text-left pl-6 pr-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                              active
                                ? "bg-[#E8000D] text-white font-semibold"
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
                    </div>
                  )}
                </div>
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
              <h2 className="text-sm font-semibold text-white">{headerLabel}</h2>
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
                    {activeCategory === null && (
                      <div className="text-xs text-[#E8000D] font-medium mb-0.5">{p.category_name}</div>
                    )}
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
