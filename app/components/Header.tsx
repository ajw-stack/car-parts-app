"use client";

import { useState } from "react";
import SideMenu from "./SideMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <SideMenu open={menuOpen} setOpen={setMenuOpen} />

      <header className="border-b border-[#1A1A1A] bg-[#141414]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">

          {/* Left — hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="text-white text-xl cursor-pointer hover:text-[#E8000D] outline-none w-6"
          >
            ☰
          </button>

          {/* Centre — Elroco wordmark */}
          <a href="/" className="flex items-center">
            <span
              style={{ fontFamily: "var(--font-michroma, 'Michroma', sans-serif)" }}
              className="text-2xl tracking-widest uppercase text-white leading-none"
            >
              ELRO<span className="text-[#E8000D]">CO</span>
            </span>
          </a>

          {/* Right placeholder */}
          <div className="w-6" />

        </div>
      </header>
    </>
  );
}
