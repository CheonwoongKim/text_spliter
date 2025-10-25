import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import AuthGuard from "@/components/AuthGuard";
import "./globals.css";

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
    <html lang="ko" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="antialiased font-sans">
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
