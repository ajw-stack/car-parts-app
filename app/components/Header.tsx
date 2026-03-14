"use client";

import { useState } from "react";
import SideMenu from "./SideMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
return (
  <>
    <SideMenu open={menuOpen} setOpen={setMenuOpen} />

    <header className="border-b border-[#1E293B] bg-[#0B0F14]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">

        {/* Left - menu */}
<button
  onClick={() => setMenuOpen(true)}
 className="text-white hover:text-[#F97316] text-xl"
>
  ☰
</button>

        {/* Center - title */}
        <a
          href="/"
         className="text-lg font-bold tracking-tight text-white"
        >
          Global Parts Catalogue
        </a>

        {/* Right placeholder */}
        <div className="w-6"></div>

      </div>
</header>
</>
);
}