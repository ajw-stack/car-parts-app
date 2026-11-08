import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  variable: "--font-michroma",
  weight: "400",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://elroco.com.au"),
  applicationName: "Elroco",
  appleWebApp: { capable: true, title: "Elroco", statusBarStyle: "black" },
  title: {
    default: "Elroco — VIN Decoder for Australian vehicles",
    template: "%s — Elroco",
  },
  description: "Decode any Australian-delivered VIN: make, model, series, engine, body and build plant. The full Elroco parts catalogue is coming soon.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Elroco — VIN Decoder for Australian vehicles",
    description: "Decode any Australian-delivered VIN: make, model, series, engine, body and build plant.",
    siteName: "Elroco",
    url: "https://elroco.com.au",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable}`}>
        {children}
        <Script
          id="install-prompt"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){window.__elrocoInstall=e;window.dispatchEvent(new Event('elroco-install-ready'));});window.addEventListener('appinstalled',function(){window.__elrocoInstall=null;});`,
          }}
        />
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </body>
    </html>
  );
}
