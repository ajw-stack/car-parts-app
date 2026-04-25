export default function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        <a
          href="/admin"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Admin
        </a>
        <span className="text-xs text-white/40">
          © {new Date().getFullYear()} Elroco
        </span>
        <div className="w-12" />
      </div>
    </footer>
  );
}
