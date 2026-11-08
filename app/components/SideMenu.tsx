"use client";

import { useRef, useState } from "react";
import { MAKES, makeSlug } from "../lib/makes";
import { COMING_SOON } from "../lib/billing/config";
import AdminOnly from "./AdminLink";
import { useGated } from "../lib/auth/useIsAdmin";

export default function SideMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const startX = useRef<number | null>(null);
  const [vehiclesOpen, setVehiclesOpen] = useState(false);
  const gated = useGated(COMING_SOON);

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 z-[55]"
        />
      )}

      <div
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current !== null) {
            const diff = startX.current - e.changedTouches[0].clientX;
            if (diff > 80) setOpen(false);
            startX.current = null;
          }
        }}
        className={`fixed left-0 top-0 h-full w-80 bg-[#02070d] text-white shadow-lg z-[60] transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <nav className="flex flex-col pt-2">
            <a href="/" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Home</a>
            {gated ? (
              <>
                <a href="/decode" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">VIN Decoder</a>
                <a href="/pricing" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Pricing</a>
                <a href="/account" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Account</a>
              </>
            ) : (
            <a href="/saved-lists" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">My Garage</a>
            )}

            {/* Vehicles collapsible (hidden while the catalogue is not public) */}
            {!gated && (<>
            <button
              onClick={() => setVehiclesOpen(!vehiclesOpen)}
              className="flex items-center justify-between p-4 text-white/85 hover:text-white hover:bg-[#1c2750] w-full text-left"
            >
              <span>Vehicles</span>
              <span className={`text-xs transition-transform duration-200 ${vehiclesOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            {vehiclesOpen && (
              <div>
                {/* Popular makes */}
                <div className="pl-8 pr-4 py-1.5 text-xs font-semibold text-white/35 uppercase tracking-wider">
                  Popular
                </div>
                {["Toyota", "Mazda", "Ford", "Holden", "Hyundai"].map((make) => (
                  <a
                    key={`popular-${make}`}
                    href={`/vehicles/${makeSlug(make)}`}
                    className="block pl-8 pr-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[#1c2750]"
                  >
                    {make}
                  </a>
                ))}
                {/* All makes */}
                <div className="pl-8 pr-4 py-1.5 text-xs font-semibold text-white/35 uppercase tracking-wider">
                  All Makes
                </div>
                {MAKES.map((make) => (
                  <a
                    key={make}
                    href={`/vehicles/${makeSlug(make)}`}
                    className="block pl-8 pr-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[#1c2750]"
                  >
                    {make}
                  </a>
                ))}
              </div>
            )}

            <a href="/decode" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">VIN Decoder</a>
            <a href="/categories" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Categories</a>
            <a href="/parts-guide" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Parts Search</a>
            </>)}
            <a href="/contact" className="p-4 text-white/85 hover:text-white hover:bg-[#1c2750]">Contact</a>
          </nav>

          <div className="mt-auto border-t border-[#1c2750]">
            <AdminOnly>
            <a
              href="/admin"
              className="flex items-center gap-3 p-4 text-white/85 hover:text-white hover:bg-[#1c2750]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="M21 2l-9.6 9.6" />
                <path d="M15.5 7.5L17 6l2 2-1.5 1.5" />
              </svg>
              Admin
            </a>
            </AdminOnly>
          </div>
        </div>
      </div>
    </>
  );
}