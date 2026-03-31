"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import ImageCarousel from "../../../part/[id]/ImageCarousel";

type Props = {
  vehicleId: string;
  makeSlug: string;
  imageUrls: string[];
};

export default function VehicleDetailClient({ vehicleId, makeSlug, imageUrls }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
  }, []);

  if (imageUrls.length === 0 && !isAdmin) return null;

  return (
    <div className="mt-6 space-y-3">
      {imageUrls.length > 0 && (
        <ImageCarousel images={imageUrls} alt="Vehicle" />
      )}
      {isAdmin && (
        <div className="flex justify-end">
          <a
            href={`/vehicles/${makeSlug}/${vehicleId}/edit`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ✎ Edit Images
          </a>
        </div>
      )}
    </div>
  );
}
