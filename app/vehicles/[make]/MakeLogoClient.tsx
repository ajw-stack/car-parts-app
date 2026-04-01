"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function MakeLogoClient({
  makeSlug,
  logoUrl,
}: {
  makeSlug: string;
  logoUrl: string | null;
}) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
  }, []);

  if (!logoUrl && !isAdmin) return null;

  return (
    <div className="relative flex-shrink-0 w-36 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Brand logo"
          className="object-contain w-full h-full p-3"
        />
      ) : (
        <span className="text-xs text-gray-300">No logo</span>
      )}
      {isAdmin && (
        <a
          href={`/vehicles/${makeSlug}/edit`}
          className="absolute bottom-1 right-1 rounded-lg bg-white/80 border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm"
        >
          ✎
        </a>
      )}
    </div>
  );
}
