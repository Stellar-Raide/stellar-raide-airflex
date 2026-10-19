"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme persistence provider (Issue #469).
 *
 * Wraps `next-themes` so the chosen theme is written to `localStorage` under
 * `stellar-raide-stellar-raide-airflex-theme` and restored before first paint. next-themes injects a tiny
 * blocking inline script into <head> that reads the stored value (falling back
 * to the OS `prefers-color-scheme`) and sets the `class` attribute on <html>
 * *before* React hydrates — this is what prevents a flash of the wrong theme
 * (FOUC) on reload or a fresh visit.
 *
 * Requirements satisfied:
 *  - Persisted preference survives a full page reload (localStorage key).
 *  - Theme applied pre-paint via next-themes' injected script (no FOUC).
 *  - Default falls back to system preference when no stored value exists.
 *  - ThemeToggle reads `resolvedTheme` and calls `setTheme`, both backed by
 *    this provider, so the button reflects the persisted/active theme.
 *
 * `<html suppressHydrationWarning>` (set in the root layout) is required
 * because the pre-paint script mutates the class attribute before React
 * commits, which would otherwise warn about a hydration mismatch.
 */
export const STORAGE_KEY = "stellar-raide-stellar-raide-airflex-theme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
