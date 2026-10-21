import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sell");
  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function SellLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Sell");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900">
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            {t("footer", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
