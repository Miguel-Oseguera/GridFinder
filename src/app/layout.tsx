import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
