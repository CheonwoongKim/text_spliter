import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { IBM_Plex_Sans_KR } from "next/font/google";
import AuthGuard from "@/components/layout/AuthGuard";
import "./globals.css";

// Downloaded at build time and served from this origin, so no request leaves
// the browser for a font at runtime. Weights match the design system scale,
// including 600, which the previous face had to synthesize.
//
// `subsets` only accepts the latin families: Hangul is not a named subset but is
// split into unicode-range slices that ship regardless, so Korean copy renders
// in this face and a browser only fetches the slices a page actually uses.
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-kr",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Text Splitter - LangChain Text Splitters Visualizer",
  description: "Visualize and test different LangChain text splitters with real-time results",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${GeistMono.variable} ${ibmPlexSansKr.variable}`}>
      <body className="antialiased font-sans">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
