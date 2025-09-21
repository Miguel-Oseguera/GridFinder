import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/siteHeader";
import GridFinderHelper from "@/components/gridFinderHelper";

export const metadata: Metadata = {
  title: "GridFinder",
  description: "Find karting events worldwide",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Sigmar&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--gf-navy)] text-white">
        <SiteHeader />

        <main className="flex-1">{children}</main>

        <footer className="mt-auto bg-[var(--gf-header)] text-[#1b2432]">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm opacity-80">
            HackRice 2025
          </div>
        </footer>

        <GridFinderHelper />
      </body>
    </html>
  );
}
