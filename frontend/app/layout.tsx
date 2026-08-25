import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirFlex — Buy & Sell Airtime Peer-to-Peer",
  description:
    "AirFlex is an open marketplace for Nigerian airtime and mobile data secured by Soroban escrow contracts on Stellar.",
};

/**
 * Root layout — mounts the shared Navbar on every page and provides
 * application-wide authentication state via AuthProvider.
 *
 * AuthProvider is a "use client" component, but this layout can stay a
 * Server Component: Next.js allows importing client components from server
 * components as long as we don't call client-only hooks here.
 *
 * suppressHydrationWarning is set on <html> to accommodate the theme
 * toggling script injected by next-themes (when that branch is merged).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
