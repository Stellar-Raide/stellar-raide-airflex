import type { ReactNode } from "react";
import ThemeToggle from "../../../components/ThemeToggle";

/**
 * Layout for /trades/[id] — same nav/footer chrome as the sell and auth flows.
 */
export default function TradeDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          aria-label="Primary"
        >
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
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        {children}
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
