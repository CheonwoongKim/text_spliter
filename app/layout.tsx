import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import AuthGuard from "@/components/layout/AuthGuard";
import "./globals.css";

const spoqaHanSans = localFont({
  src: [
    { path: "./fonts/SpoqaHanSansNeo-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SpoqaHanSansNeo-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SpoqaHanSansNeo-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-spoqa-han-sans",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
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
    <html lang="ko" className={`${GeistMono.variable} ${spoqaHanSans.variable}`}>
      <body className="antialiased font-sans">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
