/**
 * loading.tsx — Global loading UI (Next.js App Router convention)
 *
 * Skeleton mirrors the structure of the root marketplace page.
 * Dark mode variants ensure the shimmer reads correctly in both themes.
 */

// ---------------------------------------------------------------------------
// Skeleton primitives
// ---------------------------------------------------------------------------

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
      aria-hidden="true"
    />
  );
}

function CardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      aria-hidden="true"
    >
      {/* Header row: seller label + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-3 w-10" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-5 w-20 rounded-full" />
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <Bone className="h-3 w-14" />
        <Bone className="h-8 w-28" />
      </div>

      {/* Expiry */}
      <Bone className="h-3 w-36" />

      {/* CTA */}
      <Bone className="mt-auto h-10 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading page
// ---------------------------------------------------------------------------

export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 animate-pulse dark:bg-gray-900"
      role="status"
      aria-label="Loading marketplace listings"
    >
      {/* Nav skeleton */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-5 w-20" />
          </div>
          {/* Nav actions */}
          <div className="flex items-center gap-3">
            <Bone className="hidden sm:block h-9 w-16 rounded-xl" />
            <Bone className="h-9 w-20 rounded-xl" />
            {/* ThemeToggle placeholder */}
            <Bone className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </header>

      <main>
        {/* Hero skeleton */}
        <section className="bg-white border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl flex flex-col gap-4">
              <Bone className="h-5 w-36 rounded-full" />
              <Bone className="h-10 w-4/5" />
              <Bone className="h-10 w-3/5" />
              <Bone className="h-5 w-full" />
              <Bone className="h-5 w-5/6" />
              <div className="mt-4 flex gap-3">
                <Bone className="h-12 w-40 rounded-xl" />
                <Bone className="h-12 w-44 rounded-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Listings skeleton */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-8 flex items-baseline justify-between">
            <div className="flex flex-col gap-2">
              <Bone className="h-7 w-40" />
              <Bone className="h-4 w-24" />
            </div>
          </div>

          {/* Card grid — 8 skeleton cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>
      </main>

      <span className="sr-only">Loading, please wait…</span>
    </div>
  );
}
