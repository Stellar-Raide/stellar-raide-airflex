import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ThemeToggle from "../components/ThemeToggle";
import ListingsGrid from "./components/ListingsGrid";
import { SITE_NAME, siteUrl } from "./lib/seo";

/**
 * Page-specific metadata for the landing page (issue #464).
 *
 * The root layout (`app/layout.tsx`) defines the site-wide defaults — title
 * template, default description, metadataBase and the shared OpenGraph image.
 * This export *overrides* those defaults with landing-page-specific values so
 * link previews and search results for "/" describe the marketplace itself
 * rather than the generic site title.
 *
 * `getTranslations` resolves the active locale server-side, so the metadata is
 * localised per request (English / Yoruba / Igbo / Hausa).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");

  const title = `${t("title1")} ${t("title2")}`;
  const description = t("description");
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl()}/`,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl()}/`,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: `${title} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/og-default.png"],
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main>
        {/* Hero */}
        <section className="bg-white border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {t("poweredBy")}
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50">
                {t("title1")}{" "}
                <span className="text-violet-600 dark:text-violet-400">{t("title2")}</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed dark:text-gray-300">
                {t("description")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#listings"
                  className="inline-flex items-center rounded-xl bg-violet-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  {t("browseListings")}
                </a>
                <a
                  href="/sell"
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  {t("listAsset")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Listings grid with filter — client component */}
        <ListingsGrid />
      </main>

      <footer className="border-t border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-5 text-sm text-gray-400 dark:text-gray-500">
            <a href="/docs" className="hover:text-gray-600 transition-colors dark:hover:text-gray-300">
              {t("docs")}
            </a>
            <a
              href="https://github.com/dark-sarge/stellar-raide-stellar-raide-stellar-raide-airflex"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-600 transition-colors dark:hover:text-gray-300"
            >
              {t("github")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
