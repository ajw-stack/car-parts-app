"use client";

import { useState } from "react";

export default function SideMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {

  return (
    <>
      {/* Hamburger */}


      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Menu */}
      <div
className={`fixed left-0 top-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b font-bold text-xl">Global Parts Catalogue</div>

        <nav className="flex flex-col">
          <a className="p-4 border-b hover:bg-gray-100">Home</a>
          <a className="p-4 border-b hover:bg-gray-100">Saved Lists</a>
          <a className="p-4 border-b hover:bg-gray-100">New Products</a>
          <a className="p-4 border-b hover:bg-gray-100">Vehicles</a>
          <a className="p-4 border-b hover:bg-gray-100">Parts</a>
          <a className="p-4 border-b hover:bg-gray-100">Brands</a>
          <a className="p-4 border-b hover:bg-gray-100">Settings</a>
          <a className="p-4 border-b hover:bg-gray-100">Contact</a>
        </nav>
      </div>
    </>
  );
}