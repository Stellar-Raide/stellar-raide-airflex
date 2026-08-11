import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirFlex — Buy & Sell Airtime Peer-to-Peer",
  description:
    "AirFlex is an open marketplace for Nigerian airtime and mobile data secured by Soroban escrow contracts on Stellar.",
};

/**
 * Root layout — mounts the shared Navbar on every page.
 *
 * The Navbar handles its own auth-state detection client-side, so this
 * layout can remain a Server Component (no "use client" needed here).
 *
 * suppressHydrationWarning is set on <html> to accommodate the theme
 * toggling script injected by next-themes (when that branch is merged).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
