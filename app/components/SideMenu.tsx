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
      {/* Hamburger */}


      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 z-40"
        />
      )}

      {/* Menu */}
    <div
  onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
  onTouchEnd={(e) => {
    if (startX.current !== null) {
      const diff = startX.current - e.changedTouches[0].clientX;
      if (diff > 80) setOpen(false);
      startX.current = null;
    }
  }}
className={`fixed left-0 top-0 h-full w-80 bg-[#0B0F14] shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
 <div className="h-6" />

        <nav className="flex flex-col">
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Home</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Saved Lists</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">New Products</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Vehicles</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Parts</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Brands</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Settings</a>
          <a className="p-4 border-b border-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]">Contact</a>
        </nav>
      </div>
    </>
  );
}