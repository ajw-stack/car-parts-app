import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global Parts Catalogue",
  description: "Global Parts Catalogue",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Decorative red line — runs right under header then down left side */}
        <svg
          className="pointer-events-none fixed top-0 left-0 z-40"
          width="100vw"
          height="100vh"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100vw", height: "100vh", overflow: "visible" }}
        >
          {/* Starts at top-right, runs left to corner radius, curves down left side */}
          <path
            d="M 1920 89 L 40 89 Q 10 89 10 119 L 10 2000"
            stroke="#CC0000"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {children}
      </body>
    </html>
  );
}
