/**
 * loading.tsx — Global loading skeleton.
 * The shared Navbar is rendered by the root layout above this component.
 * This skeleton only covers the page body (hero + listing grid).
 */

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
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-3 w-10" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Bone className="h-3 w-14" />
        <Bone className="h-8 w-28" />
      </div>
      <Bone className="h-3 w-36" />
      <Bone className="mt-auto h-10 w-full rounded-xl" />
    </div>
  );
}

export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 animate-pulse dark:bg-gray-900"
      role="status"
      aria-label="Loading marketplace listings"
    >
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
        <div className="mb-8 flex items-baseline justify-between">
          <div className="flex flex-col gap-2">
            <Bone className="h-7 w-40" />
            <Bone className="h-4 w-24" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      <span className="sr-only">Loading, please wait…</span>
    </div>
  );
}
