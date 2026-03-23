"use client";

import { useRef, useState } from "react";

const MAKES = [
  "Abarth", "Alfa Romeo", "Aston Martin", "Audi", "BMW", "BYD", "Chery",
  "Chevrolet", "Citroen", "Cupra", "Denza", "Deepal", "Ferrari", "Fiat",
  "Ford", "Genesis", "GWM", "Haval", "Holden", "Honda", "Hyundai", "INEOS",
  "Isuzu Ute", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover", "LDV",
  "Lexus", "Lotus", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "MG",
  "Mini", "Mitsubishi", "Nissan", "Omoda", "Jaecoo", "Peugeot", "Polestar",
  "Porsche", "RAM", "Renault", "Rolls-Royce", "Skoda", "Smart",
  "SsangYong (KGM)", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

function makeSlug(make: string) {
  return make.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
        className={`fixed left-0 top-0 h-full w-80 bg-[#0F0F0F] text-white shadow-lg z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <nav className="flex flex-col">
            <a href="/" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Home</a>
            <a href="/saved-lists" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Saved Lists</a>
            <a href="/new-products" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">New Products</a>

            {/* Vehicles collapsible */}
            <button
              onClick={() => setVehiclesOpen(!vehiclesOpen)}
              className="flex items-center justify-between p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F] w-full text-left"
            >
              <span>Vehicles</span>
              <span className={`text-xs transition-transform duration-200 ${vehiclesOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            {vehiclesOpen && (
              <div className="border-b border-[#1A1A1A]">
                {MAKES.map((make) => (
                  <a
                    key={make}
                    href={`/vehicles/${makeSlug(make)}`}
                    className="block pl-8 pr-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[#1F1F1F] border-b border-[#1A1A1A]/50 last:border-b-0"
                  >
                    {make}
                  </a>
                ))}
              </div>
            )}

            <a href="/parts" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Parts</a>
            <a href="/brands" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Brands</a>
            <a href="/settings" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Settings</a>
            <a href="/categories" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Categories</a>
            <a href="/parts-guide" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Parts Guide</a>
            <a href="/contact" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Contact</a>
          </nav>

          <div className="mt-auto">
            <a
              href="/admin"
              className="block p-4 border-t border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]"
            >
              Admin
            </a>
          </div>
        </div>
      </div>
    </>
  );
}