"use client";

import { useState, useRef } from "react";
import { MAKES, makeSlug } from "../lib/makes";
import SideMenu from "./SideMenu";

const POPULAR = ["Toyota", "Mazda", "Ford", "Holden", "Hyundai", "Nissan", "Honda", "Subaru"];

const NAV_LINKS = [
  { label: "Categories", href: "/categories" },
  { label: "Parts Search", href: "/parts-guide" },
  { label: "VIN & Rego", href: "/decode" },
  { label: "My Garage", href: "/saved-lists" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehiclesOpen, setVehiclesOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openVehicles() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setVehiclesOpen(true);
  }
  function closeVehicles() {
    closeTimer.current = setTimeout(() => setVehiclesOpen(false), 120);
  }

  return (
    <>
      <SideMenu open={menuOpen} setOpen={setMenuOpen} />

      <header className="border-b border-[#1A1A1A] bg-[#141414] text-white">
        <div className="relative flex w-full items-center px-4 py-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-white text-xl cursor-pointer hover:text-[#E8000D] outline-none shrink-0"
          >
            ☰
          </button>

          {/* Logo — desktop: centred between left edge and nav (quarter point) */}
          <a href="/" className="flex items-center shrink-0 ml-8 md:absolute md:left-1/4 md:-translate-x-1/2 md:ml-0">
            <span
              style={{ fontFamily: "var(--font-michroma, 'Michroma', sans-serif)" }}
              className="text-2xl tracking-widest uppercase text-white leading-none"
            >
              ELRO<span className="text-[#E8000D]">CO</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">

            {/* Home */}
            <a
              href="/"
              className="px-3 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:text-[#E8000D] transition-colors"
            >
              Home
            </a>

            {/* Vehicles mega-dropdown */}
            <div
              className="relative"
              onMouseEnter={openVehicles}
              onMouseLeave={closeVehicles}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:text-[#E8000D] transition-colors">
                Vehicles
                <svg className="w-3 h-3 mt-px" viewBox="0 0 10 6" fill="currentColor">
                  <path d="M0 0l5 6 5-6z" />
                </svg>
              </button>

              {vehiclesOpen && (
                <div
                  className="absolute left-0 top-full mt-0 bg-[#0F0F0F] border border-[#1A1A1A] shadow-2xl z-50 w-72"
                  onMouseEnter={openVehicles}
                  onMouseLeave={closeVehicles}
                >
                  {/* Popular */}
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Popular
                  </div>
                  {POPULAR.map((make) => (
                    <a
                      key={make}
                      href={`/vehicles/${makeSlug(make)}`}
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      {make}
                    </a>
                  ))}

                  {/* All makes */}
                  <div className="border-t border-[#1A1A1A] mt-1 px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    All Makes
                  </div>
                  <div className="max-h-56 overflow-y-auto pb-2">
                    {MAKES.map((make) => (
                      <a
                        key={make}
                        href={`/vehicles/${makeSlug(make)}`}
                        className="block px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                      >
                        {make}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Static links */}
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:text-[#E8000D] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

        </div>
      </header>
    </>
  );
}
