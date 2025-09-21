// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
<<<<<<< Updated upstream
=======
import SiteHeader from "@/components/siteHeader";
import GridFinderHelper from "@/components/gridFinderHelper";
>>>>>>> Stashed changes

export const metadata: Metadata = {
  title: "GridFinder",
  description: "Find karting events worldwide",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Font: Sigmar */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Sigmar&display=swap" rel="stylesheet" />
      </head>
<<<<<<< Updated upstream
      <body>{children}</body>
=======
      {/* The magic: flex column + flex-1 on <main> + mt-auto on <footer> */}
      <body className="min-h-screen flex flex-col bg-[var(--gf-navy)] text-white">
        <SiteHeader />

        {/* page content grows to fill remaining height */}
        <main className="flex-1">
          {children}
        </main>

        {/* sits at the bottom when content is short, pushes down when long */}
        <footer className="mt-auto bg-[var(--gf-header)] text-[#1b2432]">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm opacity-80">
            HackRice 2025
          </div>
        </footer>

        {/* global floating widget */}
        <GridFinderHelper />
      </body>
>>>>>>> Stashed changes
    </html>
  );
}
