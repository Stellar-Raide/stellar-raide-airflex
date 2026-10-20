"use client";

/**
 * Admin dashboard (Issue #23).
 *
 * # On the client-side role check
 *
 * The dashboard is wrapped in `<AuthGuard role="admin">`, which redirects a
 * non-admin to `/`. That is a **UX affordance, not a security control** — the
 * JWT lives in the browser and its payload is readable and editable by whoever
 * holds it, so a determined user can always make this component render.
 *
 * What actually protects the data is that every endpoint behind it runs
 * `authenticate` + `requireAdmin` server-side, and the Next.js middleware
 * rejects a non-admin session at the edge. A forged client-side role gets a
 * dashboard full of 403s and no data. The guard here exists so a normal
 * non-admin is bounced cleanly rather than shown a broken page.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ApiError, apiFetch } from "../../lib/apiFetch";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { StellarExplorerLink } from "../../components/StellarExplorerLink";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import AuthGuard from "../components/AuthGuard";

interface Metrics {
  totalUsers: number;
  openTrades: number;
  lockedTrades: number;
  completedTrades: number;
  disputedTrades: number;
  totalVolume: number;
}

interface DisputedTrade {
  id: string;
  status: string;
  amount: string;
  created_at: string;
  buyer_phone: string | null;
  seller_phone: string | null;
}

interface UserLookup {
  user: {
    id: string;
    phone: string;
    role: string;
    created_at: string;
    fiat_balance: string | null;
    stellar_public_key: string | null;
  };
  trades: Array<{ id: string; status: string; amount: string; created_at: string }>;
}

interface FlaggedAccount {
  user_id: string;
  violation_count: number;
  last_violation_at: string;
}

type Resolution = "release_to_seller" | "refund_to_buyer";

export default function AdminDashboardPage(): JSX.Element {
  const { token } = useAuth();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [disputed, setDisputed] = useState<DisputedTrade[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccount[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resolving, setResolving] = useState<DisputedTrade | null>(null);
  const [resolution, setResolution] = useState<Resolution>("release_to_seller");
  const [submitting, setSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [phoneQuery, setPhoneQuery] = useState("");
  const [lookup, setLookup] = useState<UserLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoadError(null);

    try {
      const [metricsResult, tradesResult, flaggedResult] = await Promise.allSettled([
        apiFetch<Metrics>("/api/v1/admin/metrics"),
        apiFetch<{ trades?: DisputedTrade[] }>("/api/v1/admin/trades?status=disputed"),
        apiFetch<{ flaggedAccounts?: FlaggedAccount[] }>("/api/v1/admin/flagged-accounts"),
      ]);

      if ([metricsResult, tradesResult].some(
        (result) => result.status === "rejected" &&
          result.reason instanceof ApiError && result.reason.status === 403
      )) {
        setLoadError("Your account does not have admin access.");
        return;
      }

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
      } else if (!(metricsResult.reason instanceof ApiError)) {
        setLoadError("Could not reach the server.");
      }
      if (tradesResult.status === "fulfilled") {
        setDisputed(tradesResult.value.trades || []);
      } else if (!(tradesResult.reason instanceof ApiError)) {
        setLoadError("Could not reach the server.");
      }
      if (flaggedResult.status === "fulfilled") {
        setFlaggedAccounts(flaggedResult.value.flaggedAccounts || []);
      } else if (!(flaggedResult.reason instanceof ApiError)) {
        setLoadError("Could not reach the server.");
      }
    } catch {
      setLoadError("Could not reach the server.");
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function submitResolution(): Promise<void> {
    if (!resolving) return;
    setSubmitting(true);
    setResolveError(null);

    try {
      await apiFetch(`/api/v1/admin/trades/${resolving.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution }),
      });

      setResolving(null);
      await loadDashboard();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setResolveError("This trade is no longer disputed — someone else resolved it.");
        await loadDashboard();
      } else if (error instanceof ApiError) {
        const data = error.data as { error?: string } | undefined;
        setResolveError(data?.error ?? "Failed to resolve the trade.");
      } else {
        setResolveError("Could not reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function searchUser(): Promise<void> {
    if (!phoneQuery.trim()) return;
    setLookupError(null);
    setLookup(null);

    try {
      const data = await apiFetch<UserLookup>(
        `/api/v1/admin/users?phone=${encodeURIComponent(phoneQuery.trim())}`
      );
      setLookup(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLookupError("No user with that phone number.");
      } else if (error instanceof ApiError) {
        setLookupError("Lookup failed.");
      } else {
        setLookupError("Could not reach the server.");
      }
    }
  }

  return (
    <AuthGuard role="admin">
      <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Platform metrics, dispute resolution, and account lookup.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {loadError}
        </p>
      )}

      {/* ── Metrics ────────────────────────────────────────────────────── */}
      {metrics && (
        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total users", value: metrics.totalUsers },
            { label: "Open trades", value: metrics.openTrades },
            { label: "Locked trades", value: metrics.lockedTrades },
            { label: "Completed", value: metrics.completedTrades },
            {
              label: "Platform volume",
              value: metrics.totalVolume.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
            },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stat.value}</p>
            </Card>
          ))}
        </section>
      )}

      {/* ── Disputed trades ────────────────────────────────────────────── */}
      <Card className="mb-10 p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Disputed trades{disputed.length > 0 ? ` (${disputed.length})` : ""}
        </h2>

        {disputed.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No trades are currently disputed.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table caption="Disputed trades" className="min-w-[640px]">
              <THead>
                <TR className="hover:bg-transparent dark:hover:bg-transparent">
                  <TH>Trade</TH>
                  <TH>Buyer</TH>
                  <TH>Seller</TH>
                  <TH>Amount</TH>
                  <TH>Opened</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {disputed.map((trade) => (
                  <TR key={trade.id}>
                    <TD className="font-mono text-xs">{trade.id.slice(0, 8)}…</TD>
                    <TD>{trade.buyer_phone ?? "—"}</TD>
                    <TD>{trade.seller_phone ?? "—"}</TD>
                    <TD>{trade.amount}</TD>
                    <TD className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </TD>
                    <TD className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setResolving(trade);
                          setResolution("release_to_seller");
                          setResolveError(null);
                        }}
                      >
                        Resolve
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Flagged Accounts ────────────────────────────────────────────── */}
      <Card className="mb-10 border-red-200 p-5 dark:border-red-900/50">
        <h2 className="mb-4 text-lg font-semibold text-red-700 dark:text-red-300">
          Flagged Accounts{flaggedAccounts.length > 0 ? ` (${flaggedAccounts.length})` : ""}
        </h2>

        {flaggedAccounts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No flagged accounts with high velocity violations in the last 24 hours.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table caption="Flagged accounts" className="min-w-[640px]">
              <THead>
                <TR className="hover:bg-transparent dark:hover:bg-transparent">
                  <TH>User ID</TH>
                  <TH>Violations (24h)</TH>
                  <TH>Last Violation</TH>
                </TR>
              </THead>
              <TBody>
                {flaggedAccounts.map((account) => (
                  <TR key={account.user_id}>
                    <TD className="font-mono text-xs text-red-600 dark:text-red-400">{account.user_id}</TD>
                    <TD className="text-sm font-bold text-red-600 dark:text-red-400">{account.violation_count}</TD>
                    <TD className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(account.last_violation_at).toLocaleString()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── User lookup ────────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">User lookup</h2>

        <div className="flex flex-wrap gap-2">
          <input
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchUser();
            }}
            placeholder="Phone number (exact match)"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => void searchUser()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Search
          </button>
        </div>

        {lookupError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{lookupError}</p>}

        {lookup && (
          <div className="mt-5 space-y-4">
            <dl className="grid grid-cols-[130px_1fr] gap-y-1 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="text-gray-900 dark:text-gray-100">{lookup.user.phone}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Role</dt>
              <dd className="text-gray-900 dark:text-gray-100">{lookup.user.role}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Fiat balance</dt>
              <dd className="text-gray-900 dark:text-gray-100">{lookup.user.fiat_balance ?? "0.00"}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Stellar key</dt>
              <dd className="truncate font-mono text-xs text-gray-600 dark:text-gray-400">
                {lookup.user.stellar_public_key ? (
                  <StellarExplorerLink
                    type="account"
                    value={lookup.user.stellar_public_key}
                    truncate={false}
                  />
                ) : (
                  "—"
                )}
              </dd>
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Trade history ({lookup.trades.length})
              </h3>
              {lookup.trades.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No trades.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {lookup.trades.map((t) => (
                    <li
                      key={t.id}
                      className="flex justify-between rounded border border-gray-200 px-3 py-1.5 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                    >
                      <span className="font-mono">{t.id.slice(0, 8)}…</span>
                      <span>{t.status}</span>
                      <span>{t.amount}</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Resolve modal ──────────────────────────────────────────────── */}
      {resolving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-title"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 id="resolve-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resolve trade {resolving.id.slice(0, 8)}…
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This moves funds and cannot be undone from here. Both parties are
              notified immediately.
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Resolution</legend>
              {(
                [
                  ["release_to_seller", "Release to seller", `Seller receives ${resolving.amount}.`],
                  ["refund_to_buyer", "Refund to buyer", `Buyer is refunded ${resolving.amount}.`],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    resolution === value
                      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value={value}
                    checked={resolution === value}
                    onChange={() => setResolution(value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm text-gray-900 dark:text-gray-100">{label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {resolveError && (
              <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {resolveError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolving(null)}
                disabled={submitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitResolution()}
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Resolving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </AuthGuard>
  );
}
