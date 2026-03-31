"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  specs: Record<string, string> | null;
  oemRefs: any[];
  aftermarketRefs: any[];
  fitsByMake: Record<string, any[]>;
  fitments: any[];
  partId: string;
  crossRefLabel: Record<string, string>;
};

function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-[#111827] flex items-center gap-3">
          {title}
          {badge !== undefined && (
            <span className="text-xs font-normal text-gray-400">{badge}</span>
          )}
        </span>
        <span className="text-gray-400 text-lg">{open ? "−" : "+"}</span>
      </button>

      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function PartDetailClient({
  specs,
  oemRefs,
  aftermarketRefs,
  fitsByMake,
  fitments,
  partId,
  crossRefLabel,
}: Props) {
  const totalFitments = fitments.length;
  const totalRefs = oemRefs.length + aftermarketRefs.length;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
  }, []);

  return (
    <div className="space-y-3">

      {/* Admin edit button */}
      {isAdmin && (
        <div className="flex justify-end">
          <a
            href={`/part/${partId}/edit`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ✎ Edit Part
          </a>
        </div>
      )}

      {/* Tech Specs */}
      {specs && Object.keys(specs).length > 0 && (
        <Accordion title="Tech Specs" defaultOpen={true}>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(specs).map(([key, val], i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-6 py-3 font-medium text-gray-700 w-1/2">{key}</td>
                  <td className="px-6 py-3 text-right text-gray-900">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Accordion>
      )}

      {/* Cross-References */}
      {totalRefs > 0 && (
        <Accordion title="Cross-References" badge={totalRefs} defaultOpen={true}>
          <div className="divide-y divide-gray-100">
            {oemRefs.length > 0 && (
              <>
                <div className="px-6 py-2 bg-blue-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">OEM Part Numbers</p>
                </div>
                {oemRefs.map((r: any) => (
                  <a
                    key={r.id}
                    href={`/part/${r.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-[#111827]">{r.brand} {r.part_number}</span>
                    <span className="text-gray-300 text-lg">›</span>
                  </a>
                ))}
              </>
            )}
            {aftermarketRefs.length > 0 && (
              <>
                <div className="px-6 py-2 bg-gray-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Aftermarket</p>
                </div>
                {aftermarketRefs.map((r: any) => (
                  <a
                    key={r.id}
                    href={`/part/${r.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-[#111827]">{r.brand} {r.part_number}</span>
                    <span className="text-gray-300 text-lg">›</span>
                  </a>
                ))}
              </>
            )}
          </div>
        </Accordion>
      )}

      {/* Vehicle Fitments */}
      <Accordion title="Vehicle Fitments" badge={totalFitments} defaultOpen={true}>
        {totalFitments === 0 ? (
          <div className="px-6 py-6 text-sm text-gray-400">No vehicles linked to this part yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(fitsByMake).map(([make, makeFitments]) => (
              <div key={make}>
                <div className="px-6 py-2 bg-gray-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{make}</p>
                </div>
                {makeFitments.map((f: any, i: number) => {
                  const v = f.vehicles;
                  const isInherited = f.part_id !== partId;
                  return (
                    <a
                      key={`${v.id}-${f.part_id}-${i}`}
                      href={`/vehicles/${make.toLowerCase()}/${v.id}`}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-[#111827]">
                          {v.series && <span className="mr-2 text-gray-500">{v.series}</span>}
                          {v.model}
                          {(v.trim_code ?? v.grade) && (
                            <span className="ml-2 text-gray-500">{v.trim_code ?? v.grade}</span>
                          )}
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
                        {isInherited && (
                          <div className="mt-1 text-xs text-blue-500">
                            via {crossRefLabel[f.part_id]}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-300 text-lg">›</span>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Accordion>

    </div>
  );
}
