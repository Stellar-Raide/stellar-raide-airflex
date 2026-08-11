"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * ThemeToggle — a button that switches between light and dark mode.
 *
 * Renders a sun icon in dark mode ("switch to light") and a moon icon in
 * light mode ("switch to dark"). The aria-label reflects the *next* action,
 * not the current state, so screen-reader users know what will happen on click.
 *
 * `mounted` guard prevents a hydration mismatch: on the server we don't know
 * the current theme yet (it depends on localStorage / OS preference), so we
 * render nothing until the client has hydrated and resolved the real theme.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show the button after client hydration to avoid SSR mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    // Reserve the same space as the button so layout doesn't shift
    return <span className="h-9 w-9 inline-block" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="
        inline-flex h-9 w-9 items-center justify-center rounded-lg
        text-gray-500 transition-colors
        hover:bg-gray-100 hover:text-gray-700
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
        dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200
      "
    >
      {isDark ? (
        /* Sun icon — shown in dark mode to switch to light */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Moon icon — shown in light mode to switch to dark */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
