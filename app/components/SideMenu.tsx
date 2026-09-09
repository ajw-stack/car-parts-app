"use client";

import { useRef, useState } from "react";
import { MAKES, makeSlug } from "../lib/makes";

export default function SideMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const startX = useRef<number | null>(null);
  const [vehiclesOpen, setVehiclesOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 z-40"
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
        className={`fixed left-0 top-0 h-full w-80 bg-[#172b5a] text-white shadow-lg z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <nav className="flex flex-col">
            <a href="/" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">Home</a>
            <a href="/saved-lists" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">My Garage</a>

            {/* Vehicles collapsible */}
            <button
              onClick={() => setVehiclesOpen(!vehiclesOpen)}
              className="flex items-center justify-between p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268] w-full text-left"
            >
              <span>Vehicles</span>
              <span className={`text-xs transition-transform duration-200 ${vehiclesOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            {vehiclesOpen && (
              <div className="border-b border-[#1a3268]">
                {/* Popular makes */}
                <div className="pl-8 pr-4 py-1.5 text-xs font-semibold text-white/35 uppercase tracking-wider">
                  Popular
                </div>
                {["Toyota", "Mazda", "Ford", "Holden", "Hyundai"].map((make) => (
                  <a
                    key={`popular-${make}`}
                    href={`/vehicles/${makeSlug(make)}`}
                    className="block pl-8 pr-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[#1a3268] border-b border-[#1a3268]/50"
                  >
                    {make}
                  </a>
                ))}
                {/* All makes */}
                <div className="pl-8 pr-4 py-1.5 text-xs font-semibold text-white/35 uppercase tracking-wider border-t border-[#1a3268]">
                  All Makes
                </div>
                {MAKES.map((make) => (
                  <a
                    key={make}
                    href={`/vehicles/${makeSlug(make)}`}
                    className="block pl-8 pr-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[#1a3268] border-b border-[#1a3268]/50 last:border-b-0"
                  >
                    {make}
                  </a>
                ))}
              </div>
            )}

            <a href="/decode" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">VIN &amp; Rego Decoder</a>
            <a href="/categories" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">Categories</a>
            <a href="/parts-guide" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">Parts Search</a>
            <a href="/contact" className="p-4 border-b border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]">Contact</a>
          </nav>

          <div className="mt-auto">
            <a
              href="/capture"
              className="flex items-center gap-3 p-4 border-t border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Capture
            </a>
            <a
              href="/admin"
              className="flex items-center gap-3 p-4 border-t border-[#1a3268] text-white/85 hover:text-white hover:bg-[#1a3268]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="M21 2l-9.6 9.6" />
                <path d="M15.5 7.5L17 6l2 2-1.5 1.5" />
              </svg>
              Admin
            </a>
          </div>
        </div>
      </div>
    </>
  );
}