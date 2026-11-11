import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminCookie } from "./app/lib/auth/adminCookie";

/**
 * Coming-soon gate. While NEXT_PUBLIC_COMING_SOON is not "false", only the VIN decoder,
 * billing, auth, legal pages and the owner's admin tools are reachable. Everything else
 * goes to the coming-soon page. Set the env var to "false" to open the whole site.
 */
const ALLOW_PREFIXES = [
  "/coming-soon", "/decode", "/pricing", "/account", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/confirm",
  "/terms", "/privacy", "/refunds", "/contact", "/install",
  "/admin", "/capture",
  "/api/vin", "/api/billing", "/api/admin", "/api/makes", "/api/parts", "/api/vehicles", "/api/capture-users",
  "/_next", "/_vercel", "/icon.svg", "/sw.js", "/manifest", "/apple-touch-icon",
];

export async function proxy(req: NextRequest) {
  // Samsung Internet installs web apps with an outdated Android package that Google Play
  // Protect blocks as "Unsafe app". Hide the manifest from it so it offers no install;
  // Samsung users install through Chrome (or add a plain home-screen shortcut).
  if (req.nextUrl.pathname.startsWith("/manifest") && /SamsungBrowser/i.test(req.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 404 });
  }

  const gated = (process.env.NEXT_PUBLIC_COMING_SOON ?? "true") !== "false";
  if (!gated) return NextResponse.next();
  // Admins (signed cookie set by /api/admin/session) see the whole site.
  if (await verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    return NextResponse.rewrite(url);
  }
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();   // static files
  if (ALLOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
