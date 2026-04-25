"use client";

import { useState } from "react";

type Vehicle = {
  id: string;
  model: string;
  series: string | null;
  year_from: number;
  year_to: number | null;
  engine_code: string | null;
  engine_litres: number | null;
  engine_config: string | null;
  fuel_type: string | null;
  grade: string | null;
  trim_code: string | null;
};

type ModelEntry = {
  model: string;
  variants: Vehicle[];
  hasData: boolean;
};

export default function VehicleModelList({
  models,
  makeSlug,
}: {
  models: ModelEntry[];
  makeSlug: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(models.map((m) => [m.model, true]))
  );

  const allExpanded = models.every((m) => !collapsed[m.model]);

  function toggleAll() {
    if (allExpanded) {
      const next: Record<string, boolean> = {};
      for (const m of models) next[m.model] = true;
      setCollapsed(next);
    } else {
      setCollapsed({});
    }
  }

  function toggleModel(model: string) {
    setCollapsed((prev) => ({ ...prev, [model]: !prev[model] }));
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={toggleAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-3">
        {models.map(({ model, variants, hasData }) => {
          const isCollapsed = !!collapsed[model];
          return (
            <div key={model} className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleModel(model)}
                className="w-full bg-[#141414] px-5 py-3 flex items-center justify-between text-left"
              >
                <h2 className="text-base font-semibold text-white">{model}</h2>
                <div className="flex items-center gap-2">
                  {hasData && (
                    <span className="inline-flex items-center rounded-full bg-[#E8000D] px-2.5 py-0.5 text-xs font-medium text-white">
                      {variants.length}
                    </span>
                  )}
                  <span className={`text-white/50 text-xs transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}>▼</span>
                </div>
              </button>

              {!isCollapsed && (
                hasData ? (
                  <div className="divide-y divide-gray-100">
                    {variants.map((v) => (
                      <a
                        key={v.id}
                        href={`/vehicles/${makeSlug}/${v.id}`}
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
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
