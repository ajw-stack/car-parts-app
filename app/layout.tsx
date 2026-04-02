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
        {/* Decorative red corner line — top edge across + down left side */}
        <svg
          className="pointer-events-none fixed top-0 left-0 z-50"
          width="60"
          height="300"
          viewBox="0 0 60 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          {/* Horizontal top line extending far right, curves down into vertical */}
          <path
            d="M 2000 2 Q 30 2 30 30 L 30 2000"
            stroke="#CC0000"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {children}
      </body>
    </html>
  );
}
