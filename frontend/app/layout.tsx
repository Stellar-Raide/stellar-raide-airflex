import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirFlex — Buy & Sell Airtime Peer-to-Peer",
  description:
    "AirFlex is an open marketplace for Nigerian airtime and mobile data secured by Soroban escrow contracts on Stellar.",
};

/**
 * Root layout — wraps every page in the App Router hierarchy.
 *
 * ThemeProvider (next-themes) manages the `dark` class on <html>.
 * `attribute="class"` — adds/removes `dark` class on the <html> element.
 * `defaultTheme="system"` — on first visit, respects the OS preference.
 * `enableSystem` — wires up the `prefers-color-scheme` media query.
 * `disableTransitionOnChange` — prevents a flash of transitioning colours
 *   when the page first loads (avoids FOUC for colour transitions).
 *
 * next-themes also injects a tiny inline <script> before the first paint
 * that reads localStorage and applies the correct class synchronously,
 * which completely prevents any flash of unstyled content (FOUC).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        suppressHydrationWarning is required on <html> because next-themes
        mutates the `class` attribute server-side vs client-side, which
        would otherwise trigger a React hydration warning.
      */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
