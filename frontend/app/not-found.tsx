/**
 * not-found.tsx — Global 404 page (Next.js App Router convention)
 *
 * Rendered automatically when `notFound()` is called from a Server Component
 * or when no route matches the requested URL. This is a Server Component
 * (no "use client" directive needed — no interactivity required).
 *
 * Design matches the root marketplace page: same nav chrome, violet brand
 * accent, gray-50 background, and consistent button styles.
 */

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          aria-label="Primary"
        >
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span aria-hidden="true" className="text-2xl">🌀</span>
            <span className="text-xl font-extrabold tracking-tight text-violet-700">
              AirFlex
            </span>
          </a>

          <a
            href="/auth/signup"
            className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            Sign In
          </a>
        </nav>
      </header>

      {/* 404 content */}
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg text-center">
          {/* Large 404 display */}
          <p
            aria-hidden="true"
            className="text-[8rem] font-extrabold leading-none tracking-tighter text-gray-100 select-none"
          >
            404
          </p>

          {/* Emoji */}
          <span aria-hidden="true" className="mt-2 block text-5xl">
            🔍
          </span>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900">
            Page not found
          </h1>

          <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Check the URL or head back to the marketplace.
          </p>

          {/* Suggestions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              Browse marketplace
            </a>

            <a
              href="/sell"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              Sell airtime / data
            </a>
          </div>

          {/* Quick links */}
          <div className="mt-10 border-t border-gray-100 pt-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              You might be looking for
            </p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { href: "/",              label: "Marketplace" },
                { href: "/sell",          label: "Sell airtime" },
                { href: "/auth/signup",   label: "Create account" },
                { href: "/auth/verify",   label: "Sign in" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-violet-600 hover:text-violet-800 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} AirFlex. Open source under the MIT License.
          </p>
          <div className="flex gap-5 text-sm text-gray-400">
            <a
              href="https://github.com/dark-sarge/stellar-raide-stellar-raide-stellar-raide-airflex"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              GitHub
            </a>
            <a href="/auth/signup" className="hover:text-gray-600 transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
