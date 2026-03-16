"use client";

import { useState } from "react";
import Image from "next/image";
import SideMenu from "./SideMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
return (
  <>
    <SideMenu open={menuOpen} setOpen={setMenuOpen} />

    <header className="border-b border-[#1A1A1A] bg-[#141414]">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2">

        {/* Left - menu */}
<button
  onClick={() => setMenuOpen(true)}
  className="text-white text-xl hover:text-[#ff1060] hover:bg-transparent outline-none"
>
  ☰
</button>

        {/* Center - title */}
<a href="/" className="flex items-center">
  <Image
    src="/gpc_logo_transparent_clean_crop.png"
    alt="Global Parts Catalogue"
    width={220}
    height={85}
  />
</a>

        {/* Right placeholder */}
        <div className="w-6"></div>

      </div>
</header>
</>
);
}