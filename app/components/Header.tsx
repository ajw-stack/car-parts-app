export default function header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/40">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a
          href="/"
          className="text-lg font-extrabold tracking-tight text-zinc-100 hover:text-white"
        >
          Vehicle Parts Catalogue
        </a>

        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="/" className="hover:text-zinc-200">
            Home
          </a>
          <a href="/admin" className="hover:text-zinc-200">
            Admin
          </a>
        </nav>
      </div>
    </header>
  );
}