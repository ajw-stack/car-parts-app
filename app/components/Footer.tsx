export default function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-white">
      <div className="flex w-full items-center justify-between px-4">
        <a
          href="/admin"
          className="text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Admin
        </a>
        <span className="text-xs text-white/40">
          © {new Date().getFullYear()} Elroco
        </span>
        <a
          href="/contact"
          className="text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Contact
        </a>
      </div>
    </footer>
  );
}
