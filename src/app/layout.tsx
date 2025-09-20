import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css"; // ⬅️ add this line

export const metadata: Metadata = {
  title: "GridFinder",
  description: "GridFinder with MapLibre",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
