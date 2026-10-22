import React from "react";

export function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gray-200 dark:bg-gray-700/80 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for user details, stats cards, KYC status, Stellar address, and referral link.
 * Matches exact aspect ratio and grid structure of Account Details to prevent layout shift.
 */
export function ProfileDetailsSkeleton() {
  return (
    <section aria-label="Loading account details" className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Bone className="h-6 w-36" />
      </div>

      {/* 3 stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <Bone className="h-6 w-6 rounded-md" />
            <Bone className="mt-1 h-8 w-24" />
            <Bone className="h-3.5 w-20" />
          </div>
        ))}
      </div>

      {/* KYC verification card */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Bone className="h-3.5 w-32" />
        <Bone className="h-5 w-48" />
        <Bone className="h-3 w-64" />
      </div>

      {/* Stellar Public Key card */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-4 w-full max-w-md font-mono" />
      </div>

      {/* Referral link card */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-4 w-60" />
        <div className="mt-2 flex gap-2">
          <Bone className="h-10 flex-1 rounded-xl" />
          <Bone className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton for the Trade History section (filter tabs, table headers, table rows, pagination).
 */
export function TradeHistorySkeleton() {
  return (
    <section aria-label="Loading trade history" className="flex flex-col gap-4 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-6 w-32" />
        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Table container */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
        <div className="hidden border-b border-gray-100 bg-gray-50/50 px-5 py-3.5 sm:grid sm:grid-cols-6 sm:gap-4 dark:border-gray-700 dark:bg-gray-800/60">
          <Bone className="h-4 w-12" />
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-12" />
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-16 ml-auto" />
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-5 py-4 flex flex-col gap-2 sm:grid sm:grid-cols-6 sm:gap-4 sm:items-center">
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
              <Bone className="h-5 w-24" />
              <Bone className="h-5 w-14 rounded-full" />
              <Bone className="h-4 w-28" />
              <Bone className="h-6 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <Bone className="h-8 w-24 rounded-lg" />
          <Bone className="h-4 w-28" />
          <Bone className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton for the Account / Wallet Deletion settings card.
 */
export function ProfileWalletSkeleton() {
  return (
    <section aria-label="Loading account settings" className="flex flex-col gap-4 animate-pulse">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Bone className="h-5 w-32" />
        <Bone className="mt-2 h-4 w-80" />
        <Bone className="mt-4 h-10 w-36 rounded-xl" />
      </div>
    </section>
  );
}

/**
 * Combined profile route loading skeleton.
 */
export function ProfilePageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile page"
      className="flex flex-col gap-10 min-h-[60vh]"
    >
      {/* Header skeleton */}
      <div className="flex flex-col gap-2 animate-pulse">
        <Bone className="h-3 w-16 uppercase" />
        <Bone className="h-9 w-48" />
      </div>

      <ProfileDetailsSkeleton />
      <TradeHistorySkeleton />
      <ProfileWalletSkeleton />
    </div>
  );
}
