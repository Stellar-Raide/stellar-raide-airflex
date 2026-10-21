"use client";

import { useEffect } from "react";
import { reportError } from "./lib/monitoring";

export interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    reportError(error, {
      digest: error.digest,
      source: "route-error",
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col justify-between bg-gray-50 py-12 transition-colors dark:bg-gray-900">
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6">
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-lg rounded-3xl border border-gray-200/80 bg-white p-8 text-center shadow-sm sm:p-10 dark:border-gray-800 dark:bg-gray-850"
        >
          <span aria-hidden="true" className="inline-block text-5xl sm:text-6xl">
            ⚡
          </span>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
            Something went wrong
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
            An unexpected error occurred while loading this page. Our team has been
            notified. You can try recovering this page or return to the marketplace.
          </p>

          {error.digest && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <span className="font-semibold text-gray-500 dark:text-gray-500">Error ID:</span>
              <span>{error.digest}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              Try again
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Back to marketplace
            </a>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-100 pt-6 text-center text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
        <p>&copy; {new Date().getFullYear()} AirFlex — Open source under the MIT License.</p>
      </footer>
    </div>
  );
}
