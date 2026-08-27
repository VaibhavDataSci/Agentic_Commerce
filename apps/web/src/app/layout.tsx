import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechKart — AI-Ready Commerce Catalog (Phase 1)",
  description: "Simulated electronics merchant with AI-readable product catalog, inventory, pricing, and rule engine APIs."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
