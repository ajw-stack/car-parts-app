"use client";

export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Left - menu */}
        <button className="text-zinc-300 hover:text-white text-xl">
          ☰
        </button>

        {/* Center - title */}
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-zinc-100"
        >
          Global Parts Catalogue
        </a>

        {/* Right placeholder */}
        <div className="w-6"></div>

      </div>
    </header>
  );
}