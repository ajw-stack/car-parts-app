"use client";

export default function SideMenu() {
  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-lg z-50">
      <div className="p-6 border-b font-bold text-xl">
        Global Parts Catalogue
      </div>

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
  );
}