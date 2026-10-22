import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";

/**
 * Resolves the active locale for a request and loads the matching message
 * catalog from `locales/<locale>/common.json`.
 *
 * The locale is supplied by the i18n middleware (see `middleware.ts`), which
 * detects it from the URL prefix, the `NEXT_LOCALE` cookie, or the
 * `accept-language` header — in that order — and falls back to `en`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale: AppLocale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? (requested as AppLocale)
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}/common.json`)).default,
    // Dates (e.g. a listing's expiry) are shown in Nigerian time on both the
    // server and the client. Without an explicit zone next-intl falls back
    // to the runtime's and logs an ENVIRONMENT_FALLBACK warning.
    timeZone: "Africa/Lagos",
  };
});
