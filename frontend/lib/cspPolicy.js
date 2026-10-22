/**
 * Content-Security-Policy — single source of truth (#120, #539).
 *
 * CommonJS so next.config.js (plain Node) and middleware.ts (Edge, via
 * lib/csp.ts) build their policies from the same directives:
 *
 *   - next.config.js applies a nonce-less policy to EVERY response through
 *     `headers()`, so API routes, static files and anything the middleware
 *     matcher skips are still covered.
 *   - middleware.ts replaces that header on HTML pages with the same policy
 *     plus a per-request nonce (Next.js applies config headers before
 *     middleware, so the middleware value wins for pages).
 *
 * script-src  'self' + per-request nonce + hashes from
 *             NEXT_PUBLIC_CSP_SCRIPT_HASHES + the Paystack inline checkout
 *             script. No 'unsafe-inline'; 'unsafe-eval' only in development
 *             (React Refresh needs it).
 * connect-src 'self', the API origin (NEXT_PUBLIC_API_URL), the Stellar
 *             Horizon / Soroban RPC endpoints for NEXT_PUBLIC_STELLAR_NETWORK,
 *             and Paystack's API (used by its inline checkout).
 * Reporting   both `report-uri` (all browsers) and `report-to` (Reporting
 *             API) point at /api/csp-report unless
 *             NEXT_PUBLIC_CSP_REPORT_URI overrides it.
 *
 * Environment variables are read with literal `process.env.NEXT_PUBLIC_*`
 * expressions so Next.js inlines them into the Edge middleware bundle.
 */

const STELLAR_ENDPOINTS = {
  testnet: [
    "https://horizon-testnet.stellar.org",
    "https://soroban-testnet.stellar.org",
    "https://friendbot.stellar.org",
  ],
  mainnet: ["https://horizon.stellar.org"],
};

const PAYSTACK_SCRIPT = "https://js.paystack.co";
const PAYSTACK_API = "https://api.paystack.co";
const PAYSTACK_FRAMES = ["https://checkout.paystack.com", PAYSTACK_SCRIPT];

const REPORT_GROUP = "csp-endpoint";
const DEFAULT_REPORT_URI = "/api/csp-report";

const HASH_PATTERN = /^'?(sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}'?$/;

function readEnv() {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    stellarNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL,
    sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    scriptHashes: process.env.NEXT_PUBLIC_CSP_SCRIPT_HASHES,
    reportUri: process.env.NEXT_PUBLIC_CSP_REPORT_URI,
    isDev: process.env.NODE_ENV === "development",
  };
}

/** `https://host[:port]` for a URL, or null when it does not parse. */
function originOf(url) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/** Approved script hashes, quoted as CSP source expressions. */
function scriptHashes(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter((h) => HASH_PATTERN.test(h))
    .map((h) => `'${h.replace(/^'|'$/g, "")}'`);
}

function stellarOrigins(env) {
  const network = (env.stellarNetwork || "testnet").toLowerCase();
  const defaults =
    network === "mainnet" || network === "public"
      ? STELLAR_ENDPOINTS.mainnet
      : STELLAR_ENDPOINTS.testnet;
  return unique([...defaults, originOf(env.horizonUrl), originOf(env.sorobanRpcUrl)]);
}

function reportUri(env) {
  return env.reportUri || DEFAULT_REPORT_URI;
}

/**
 * Serialised Content-Security-Policy.
 *
 * @param {{ nonce?: string }} [options] Per-request nonce (middleware only).
 * @returns {string}
 */
function buildContentSecurityPolicy(options = {}) {
  const env = readEnv();
  const { nonce } = options;

  const scriptSrc = unique([
    "'self'",
    nonce ? `'nonce-${nonce}'` : null,
    ...scriptHashes(env.scriptHashes),
    PAYSTACK_SCRIPT,
    env.isDev ? "'unsafe-eval'" : null,
  ]);

  const connectSrc = unique([
    "'self'",
    originOf(env.apiUrl),
    ...stellarOrigins(env),
    PAYSTACK_API,
    // Next.js dev server hot reload websocket.
    env.isDev ? "ws:" : null,
  ]);

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc.join(" ")}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    `frame-src ${PAYSTACK_FRAMES.join(" ")}`,
    "form-action 'self'",
    `report-uri ${reportUri(env)}`,
    `report-to ${REPORT_GROUP}`,
  ].join("; ");
}

/** `Reporting-Endpoints` header value backing the `report-to` directive. */
function reportingEndpoints() {
  return `${REPORT_GROUP}="${reportUri(readEnv())}"`;
}

const STATIC_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

module.exports = {
  buildContentSecurityPolicy,
  reportingEndpoints,
  STATIC_SECURITY_HEADERS,
  STELLAR_ENDPOINTS,
};
