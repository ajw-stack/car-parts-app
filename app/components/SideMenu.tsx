"use client";

import { useRef } from "react";

export default function SideMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const startX = useRef<number | null>(null);

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
        <div className="h-full flex flex-col">
          <nav className="flex flex-col">
            <a href="/" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Home</a>
            <a href="/saved-lists" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Saved Lists</a>
            <a href="/new-products" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">New Products</a>
            <a href="/vehicles" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Vehicles</a>
            <a href="/parts" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Parts</a>
            <a href="/brands" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Brands</a>
            <a href="/settings" className="p-4 border-b border-[#1A1A1A] text-white/85 hover:text-white hover:bg-[#1F1F1F]">Settings</a>
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