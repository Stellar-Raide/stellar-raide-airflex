import type { ReactNode } from "react";
import ThemeToggle from "../../components/ThemeToggle";

/**
 * Shared layout for all /auth/* pages.
 * Renders a centred card on a violet-tinted background, matching
 * the AirFlex brand established in the root marketplace page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-gray-100 flex flex-col dark:from-gray-900 dark:to-gray-800">
      {/* Top bar */}
      <header className="w-full border-b border-violet-100 bg-white/70 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span aria-hidden="true" className="text-2xl">🌀</span>
            <span className="text-xl font-extrabold tracking-tight text-violet-700 dark:text-violet-400">
              AirFlex
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-violet-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded dark:text-gray-400 dark:hover:text-violet-400"
            >
              ← Back to marketplace
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Centred card area */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          {/* Branding above the card */}
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400">
              Stellar-powered marketplace
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-md dark:border-gray-700 dark:bg-gray-800">
            {children}
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            By continuing you agree to the AirFlex{" "}
            <a href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-300">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
