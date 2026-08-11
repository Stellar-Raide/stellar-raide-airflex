"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900">
      {/* Nav — minimal, no data dependencies that could themselves error */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span aria-hidden="true" className="text-2xl">🌀</span>
            <span className="text-xl font-extrabold tracking-tight text-violet-700 dark:text-violet-400">
              AirFlex
            </span>
          </a>
        </div>
      </header>

      {/* Error content */}
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md text-center">
          <span aria-hidden="true" className="text-6xl">⚡</span>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Something went wrong
          </h1>

          <p className="mt-3 text-sm text-gray-500 leading-relaxed dark:text-gray-400">
            An unexpected error occurred while loading this page. Our team has
            been notified. You can try again or head back to the marketplace.
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-xs text-gray-400 dark:text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              Try again
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-900"
            >
              Back to marketplace
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} AirFlex — Open source under the MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
