/**
 * Loading placeholders for the wallet page's lazily loaded chunks (Issue #544).
 *
 * Each skeleton matches the footprint of the component it stands in for so the
 * layout does not shift when the real component arrives.
 */

const SKELETON_ROWS = 5;

/** Stand-in for <TransactionHistory> while its chunk downloads. */
export function TransactionHistorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading transactions…"
      data-testid="transaction-history-skeleton"
      className="animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-6">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="divide-y divide-gray-50 border-t border-gray-100 dark:divide-gray-700/60 dark:border-gray-700/60">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-6 py-4">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="ml-auto h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading transactions…</span>
    </div>
  );
}

/**
 * Stand-in for the deposit/withdraw modals while their chunk downloads after
 * the user clicks the button — a dimmed overlay with a placeholder dialog.
 */
export function ModalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading…"
      data-testid="wallet-modal-skeleton"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md animate-pulse rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-6 h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mb-3 h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="mb-6 h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-full rounded-xl bg-gray-300 dark:bg-gray-600" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
