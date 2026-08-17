"use client";

import { useState, useEffect } from "react";
import { getToken, isAuthenticated } from "../lib/auth";
import WithdrawModal from "./WithdrawModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletData {
  publicKey: string;
  balance: string;
  asset: string;
  network: string;
}

interface WalletResponse {
  publicKey?: string;
  balance?: string;
  asset?: string;
  network?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WalletPage() {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

  const [authChecked, setAuthChecked] = useState(false);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/auth/signup?returnTo=" + encodeURIComponent("/wallet");
      return;
    }
    setAuthChecked(true);
  }, []);

  // Fetch wallet data
  useEffect(() => {
    if (!authChecked) return;

    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    fetch(`${apiUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<WalletResponse>)
      .then((data) => {
        if (data.error || !data.publicKey) {
          setError(data.error ?? "Failed to load wallet.");
        } else {
          setWallet({
            publicKey: data.publicKey,
            balance: data.balance ?? "0",
            asset: data.asset ?? "XLM",
            network: data.network ?? "testnet",
          });
        }
      })
      .catch(() => setError("Network error. Check your connection."))
      .finally(() => setLoading(false));
  }, [authChecked, apiUrl]);

  function handleWithdrawSuccess() {
    // Refresh wallet data after successful withdrawal
    const token = getToken();
    if (!token) return;

    setLoading(true);
    fetch(`${apiUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<WalletResponse>)
      .then((data) => {
        if (data.publicKey) {
          setWallet({
            publicKey: data.publicKey,
            balance: data.balance ?? "0",
            asset: data.asset ?? "XLM",
            network: data.network ?? "testnet",
          });
        }
      })
      .catch(() => setError("Failed to refresh balance"))
      .finally(() => setLoading(false));
  }

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg
          className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="Loading"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page heading */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400">
          Wallet
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          My Wallet
        </h1>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Wallet card */}
      {wallet && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Available Balance
            </p>
            <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              ₦{parseFloat(wallet.balance).toLocaleString()}
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Stellar Public Key
            </p>
            <p className="break-all font-mono text-xs text-gray-700 dark:text-gray-300">
              {wallet.publicKey}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {wallet.network}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                {wallet.asset}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          >
            Withdraw Funds
          </button>
        </div>
      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBalance={wallet?.balance ?? "0"}
        onWithdrawSuccess={handleWithdrawSuccess}
      />
    </div>
  );
}
