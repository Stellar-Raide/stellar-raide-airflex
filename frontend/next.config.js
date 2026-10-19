const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Cache strategy lives in a reusable lib module (issue #463) so it can be
// unit-tested and referenced from the service-worker registration component.
const {
  staticAssetRule,
  apiRule,
} = require("./lib/pwa-cache-strategy");

/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  // next-pwa only runs at build time; in dev there is no /sw.js to serve.
  disable: process.env.NODE_ENV === "development",
  // Registration is handled by components/ServiceWorkerRegister so it works
  // with the App Router (see that file for details).
  register: false,
  // Activate a waiting service worker immediately so updated static assets go
  // live without forcing a manual reload (issue #463).
  skipWaiting: true,
  // Serve /offline when a navigation fails because the user is offline and
  // the page is not in the cache (issue #107).
  fallbacks: {
    document: "/offline",
  },
  // Runtime caching rules. The static-asset (CacheFirst) and /api/
  // (StaleWhileRevalidate) rules are defined in lib/pwa-cache-strategy.js and
  // placed first so they take precedence. The remaining next-pwa defaults
  // (images, fonts, etc.) are kept verbatim, with the now-redundant default
  // /api/ rule replaced by apiRule.
  runtimeCaching: [
    staticAssetRule,
    ...require("next-pwa/cache").map((rule) =>
      rule.options?.cacheName === "apis" ? apiRule : rule
    ),
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; report-uri /api/csp-report",
          },
        ],
      },
    ];
  },
  images: {
    domains: [],
  },
};

module.exports = withPWA(withNextIntl(nextConfig));
