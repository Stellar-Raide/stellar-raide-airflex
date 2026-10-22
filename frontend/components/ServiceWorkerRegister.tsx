"use client";

import { useEffect } from "react";
import { reportError } from "@/app/lib/monitoring";
import { SW_CACHE_STRATEGY_VERSION } from "@/lib/pwa-cache-strategy";

/**
 * Registers the PWA service worker (issue #107, #463).
 *
 * next-pwa generates `public/sw.js` (and the workbox runtime) at build time
 * using the cache strategy defined in `lib/pwa-cache-strategy.js` (CacheFirst
 * for hashed static assets, StaleWhileRevalidate for same-origin /api GETs,
 * non-GET / cross-origin requests bypassed). `register` is left off in
 * next.config.js and registration happens here so it works identically in the
 * App Router — the plugin's own auto-registration hooks into the pages-router
 * document model.
 *
 * `SW_CACHE_STRATEGY_VERSION` is attached to the monitoring context so any
 * registration failure reports which cache strategy the worker was built with.
 *
 * Renders nothing.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // next-pwa disables itself in development (`disable` flag in
    // next.config.js), so /sw.js only exists in production builds.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[pwa] Service worker registration skipped: service worker " +
          "registration is a production-only feature; next-pwa disables it " +
          "in development, so /sw.js does not exist."
      );
      return;
    }

    // Graceful degradation: without this API the app still works, just
    // without offline/PWA support.
    if (!("serviceWorker" in navigator)) {
      console.warn(
        "[pwa] Service worker registration skipped: navigator.serviceWorker " +
          "is unavailable in this environment."
      );
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[pwa] Service worker registration failed:", err);
        reportError(err, {
          source: "service-worker",
          strategyVersion: SW_CACHE_STRATEGY_VERSION,
        });
      });
  }, []);

  return null;
}
