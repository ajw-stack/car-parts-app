const COLUMNS = [
  {
    heading: "About Us",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "The Catalogue", href: "/categories" },
    ],
  },
  {
    heading: "Help & Support",
    links: [
      { label: "Parts Search", href: "/parts-guide" },
      { label: "VIN & Rego Decoder", href: "/decode" },
      { label: "Browse Categories", href: "/categories" },
    ],
  },
  {
    heading: "Terms & Conditions",
    links: [
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    heading: "Contact Us",
    links: [
      { label: "Get in Touch", href: "/contact" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.74a8.16 8.16 0 004.78 1.52V7.8a4.85 4.85 0 01-1.01-.11z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#1C1C1C] text-white border-t border-[#2A2A2A]">

      {/* Top — logo + columns */}
      <div className="relative border-b border-[#2A2A2A] px-8 py-8">

          {/* Logo — same absolute position as header */}
          <a
            href="/"
            style={{ fontFamily: "var(--font-michroma, 'Michroma', sans-serif)" }}
            className="hidden md:flex items-center md:absolute md:left-1/4 md:-translate-x-[150%] text-2xl tracking-widest uppercase text-white leading-none"
          >
            ELRO<span className="text-[#E8000D]">CO</span>
          </a>

        <div className="flex gap-10 md:pl-[25%]">

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-white">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-8 py-4 flex items-center gap-6">

        {/* Admin key icon — far left */}
        <a
          href="/admin"
          title="Admin"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="M21 2l-9.6 9.6" />
            <path d="M15.5 7.5L17 6l2 2-1.5 1.5" />
          </svg>
        </a>

        {/* Copyright */}
        <span className="text-xs text-white/40">
          © {new Date().getFullYear()} Elroco. All rights reserved.
        </span>

        {/* Social icons + store badges — pushed to the right */}
        <div className="ml-auto flex items-center gap-16">

          {/* Social icons */}
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                title={s.label}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Store badges — grouped tight */}
          <div className="flex items-center gap-2">

          {/* App Store badge */}
          <a
            href="#"
            title="Download on the App Store"
            className="flex items-center gap-2 border border-white/30 rounded-lg px-3 py-1.5 hover:border-white/60 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="leading-tight">
              <div className="text-[9px] text-white/50 uppercase tracking-wide">Download on the</div>
              <div className="text-xs font-semibold text-white">App Store</div>
            </div>
          </a>

          {/* Google Play badge */}
          <a
            href="#"
            title="Get it on Google Play"
            className="flex items-center gap-2 border border-white/30 rounded-lg px-3 py-1.5 hover:border-white/60 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
              <path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z" fill="#4CAF50"/>
              <path d="M3 3.5l9.5 9.5L3 20.5V3.5z" fill="#81C784"/>
              <path d="M12.5 13l4 4-13 7.5L12.5 13z" fill="#F44336"/>
              <path d="M16.5 9L12.5 13 3.5 3.5 16.5 9z" fill="#FFEB3B"/>
            </svg>
            <div className="leading-tight">
              <div className="text-[9px] text-white/50 uppercase tracking-wide">Get it on</div>
              <div className="text-xs font-semibold text-white">Google Play</div>
            </div>
          </a>

          </div>{/* end store badges */}

        </div>

      </div>

    </footer>
  );
}
