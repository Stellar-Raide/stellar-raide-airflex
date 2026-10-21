const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  // next-pwa only runs at build time; in dev there is no /sw.js to serve.
  disable: process.env.NODE_ENV === "development",
  // Registration is handled by components/ServiceWorkerRegister so it works
  // with the App Router (see that file for details).
  register: false,
  skipWaiting: true,
  // Serve /offline when a navigation fails because the user is offline and
  // the page is not in the cache (issue #107).
  fallbacks: {
    document: "/offline",
  },
  // Replace the default /api/ NetworkFirst rule with stale-while-revalidate so
  // API GET responses are served instantly from cache while being refreshed in
  // the background. Same-origin only — Paystack iframe and Termii requests
  // (cross-origin) are never intercepted. Static asset rules keep the defaults.
  runtimeCaching: require("next-pwa/cache").map((rule) =>
    rule.options?.cacheName === "apis"
      ? {
          urlPattern: ({ url }) => {
            const isSameOrigin = self.origin === url.origin;
            if (!isSameOrigin) return false;
            return url.pathname.startsWith("/api/");
          },
          handler: "StaleWhileRevalidate",
          method: "GET",
          options: {
            cacheName: "apis",
            expiration: {
              maxEntries: 64,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        }
      : rule
  ),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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

/**
 * Bundle analysis (Issue #544): `ANALYZE=true pnpm build` writes interactive
 * treemaps to .next/analyze/{client,nodejs,edge}.html. Loaded only when
 * requested so regular builds don't depend on the analyzer package.
 */
function withBundleAnalyzer(config) {
  if (process.env.ANALYZE !== "true") return config;
  let analyzer;
  try {
    analyzer = require("@next/bundle-analyzer");
  } catch {
    throw new Error(
      "ANALYZE=true requires @next/bundle-analyzer: pnpm --filter stellar-raide-stellar-raide-airflex-frontend add -D @next/bundle-analyzer"
    );
  }
  return analyzer({ enabled: true, openAnalyzer: false })(config);
}

module.exports = withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));
