/**
 * Content-Security-Policy builder for nonce-based script loading (#120).
 *
 * The directives live in ./cspPolicy.js, shared with next.config.js, which
 * applies the nonce-less variant to every response (#539). This module adds
 * the per-request nonce for HTML pages served through middleware.ts.
 */

import {
  buildContentSecurityPolicy as buildPolicy,
  reportingEndpoints,
  STATIC_SECURITY_HEADERS as SHARED_STATIC_HEADERS,
} from "./cspPolicy";

export function buildContentSecurityPolicy(nonce: string): string {
  const apiOrigin = apiConnectOrigins();
  const connectSrc = ["'self'", apiOrigin, "https://api.paystack.co"].filter(Boolean);
  const isDev = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co"
      : `script-src 'self' 'nonce-${nonce}' https://js.paystack.co`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc.join(" ")}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src https://checkout.paystack.com https://js.paystack.co",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ].join("; ");
}

export { reportingEndpoints };

export const STATIC_SECURITY_HEADERS: Array<{ key: string; value: string }> =
  SHARED_STATIC_HEADERS;
