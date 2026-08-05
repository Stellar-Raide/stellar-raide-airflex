"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TradeOffer } from "../../../../server/src/types/trade";
import { getToken, getUser, isAuthenticated } from "../../lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an asset_type slug into a human-readable label (MTN_AIRTIME → MTN Airtime) */
function formatAssetType(raw: string): string {
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Colour pill for the asset type */
function AssetBadge({ assetType }: { assetType: string }) {
  const isData = assetType.toUpperCase().includes("DATA");
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
        isData ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"
      }`}
    >
      {formatAssetType(assetType)}
    </span>
  );
}

/** Status pill */
function StatusBadge({ status }: { status: TradeOffer["status"] }) {
  const styles: Record<TradeOffer["status"], string> = {
    Active:    "bg-green-100 text-green-700",
    Locked:    "bg-amber-100 text-amber-700",
    Completed: "bg-blue-100  text-blue-700",
    Cancelled: "bg-gray-100  text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full inline-block ${
          status === "Active" ? "bg-green-500" : "bg-current opacity-50"
        }`}
      />
      {status}
    </span>
  );
}

/** Accessible inline spinner */
function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-label={label}
      role="img"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  );
}

/** Single detail row inside the summary list */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <dt className="shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-gray-900">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expiry countdown hook
// ---------------------------------------------------------------------------

interface CountdownResult {
  display: string;   // e.g. "2h 14m 05s"  or  "Expired"
  expired: boolean;
  urgent: boolean;   // < 5 minutes remaining
}

function useCountdown(expiresAt: string): CountdownResult {
  const calc = useCallback((): CountdownResult => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { display: "Expired", expired: true, urgent: false };

    const totalSeconds = Math.floor(diff / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${String(s).padStart(2, "0")}s`);

    return {
      display: parts.join(" "),
      expired: false,
      urgent: diff < 5 * 60 * 1000, // < 5 minutes
    };
  }, [expiresAt]);

  const [state, setState] = useState<CountdownResult>(calc);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setState(calc());
    intervalRef.current = setInterval(() => {
      const next = calc();
      setState(next);
      if (next.expired && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [calc]);

  return state;
}

// ---------------------------------------------------------------------------
// Buy confirmation step
// ---------------------------------------------------------------------------

function ConfirmationPanel({
  trade,
  txHash,
}: {
  trade: TradeOffer;
  txHash: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-6 rounded-2xl border border-green-200 bg-green-50 px-8 py-10"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="text-5xl">✅</span>
        <h2 className="text-2xl font-extrabold text-gray-900">Purchase confirmed!</h2>
        <p className="text-sm text-gray-600">
          Your funds have been locked in escrow. The seller will deliver your{" "}
          {formatAssetType(trade.asset_type)} shortly.
        </p>
      </div>

      <dl className="divide-y divide-green-100 rounded-xl border border-green-200 bg-white">
        <DetailRow label="Trade ID">
          <span className="break-all font-mono text-xs">{trade.id}</span>
        </DetailRow>
        <DetailRow label="Asset">{formatAssetType(trade.asset_type)}</DetailRow>
        <DetailRow label="Amount">₦{trade.amount.toLocaleString()}</DetailRow>
        <DetailRow label="Status">
          <StatusBadge status="Locked" />
        </DetailRow>
        {txHash && (
          <DetailRow label="Escrow Tx">
            <span className="break-all font-mono text-xs">{txHash}</span>
          </DetailRow>
        )}
      </dl>

      <a
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        Back to marketplace
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BuyResponse {
  data?: TradeOffer & { escrow_tx_hash?: string };
  error?: string;
}

interface Props {
  trade: TradeOffer;
}

export default function TradeDetailClient({ trade }: Props) {
  const countdown = useCountdown(trade.expires_at);

  // Auth state — resolved client-side after hydration
  const [authed, setAuthed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Buy flow state
  const [buying, setBuying]         = useState(false);
  const [buyError, setBuyError]     = useState<string | null>(null);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [confirmed, setConfirmed]   = useState(false);

  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

  // Resolve auth client-side (avoids SSR/hydration mismatch)
  useEffect(() => {
    setAuthed(isAuthenticated());
    setCurrentUserId(getUser()?.id ?? null);
  }, []);

  // Derived flags
  const isSeller   = !!currentUserId && currentUserId === trade.seller_id;
  const isActive   = trade.status === "Active";
  const canBuy     = authed && isActive && !countdown.expired && !isSeller;

  const sellerAlias = `@seller_${trade.seller_id.slice(-8)}`;

  // ---------------------------------------------------------------------------
  // Buy handler
  // ---------------------------------------------------------------------------
  async function handleBuy() {
    if (!canBuy) return;

    setBuyError(null);
    setBuying(true);

    const token = getToken();
    if (!token) {
      const returnTo = encodeURIComponent(`/trades/${trade.id}`);
      window.location.href = `/auth/signup?returnTo=${returnTo}`;
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/trades/${trade.id}/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Body intentionally empty — server derives buyer identity from JWT.
        // buyerSecretKey is handled server-side via the wallet service.
        body: JSON.stringify({}),
      });

      const data = (await res.json()) as BuyResponse;

      if (res.status === 401) {
        const returnTo = encodeURIComponent(`/trades/${trade.id}`);
        window.location.href = `/auth/signup?returnTo=${returnTo}`;
        return;
      }

      if (!res.ok) {
        setBuyError(data.error ?? "Purchase failed. Please try again.");
        return;
      }

      setTxHash(data.data?.escrow_tx_hash ?? "");
      setConfirmed(true);
    } catch {
      setBuyError("Network error. Check your connection and try again.");
    } finally {
      setBuying(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Confirmation screen
  // ---------------------------------------------------------------------------
  if (confirmed) {
    return <ConfirmationPanel trade={trade} txHash={txHash ?? ""} />;
  }

  // ---------------------------------------------------------------------------
  // Detail view
  // ---------------------------------------------------------------------------
  return (
    <article aria-labelledby="trade-heading">
      {/* Page heading */}
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-500">
          Trade offer
        </p>
        <h1
          id="trade-heading"
          className="text-3xl font-extrabold tracking-tight text-gray-900"
        >
          {formatAssetType(trade.asset_type)}
        </h1>
        <p className="mt-1 font-mono text-xs text-gray-400 break-all">
          ID: {trade.id}
        </p>
      </div>

      {/* Summary card */}
      <section
        aria-label="Trade details"
        className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
      >
        {/* Coloured header strip */}
        <div className="flex items-center justify-between gap-3 bg-violet-50 px-5 py-4 border-b border-violet-100">
          <AssetBadge assetType={trade.asset_type} />
          <StatusBadge status={trade.status} />
        </div>

        {/* Detail rows */}
        <dl className="divide-y divide-gray-50">
          <DetailRow label="Seller">{sellerAlias}</DetailRow>

          <DetailRow label="Amount">
            <span className="text-2xl font-extrabold text-gray-900">
              ₦{trade.amount.toLocaleString()}
            </span>
          </DetailRow>

          <DetailRow label="Expires in">
            <span
              className={
                countdown.expired
                  ? "text-red-600"
                  : countdown.urgent
                  ? "text-amber-600"
                  : "text-gray-900"
              }
              aria-live="polite"
              aria-label={`Time remaining: ${countdown.display}`}
            >
              {countdown.display}
            </span>
          </DetailRow>

          <DetailRow label="Expires at">
            {new Date(trade.expires_at).toLocaleString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DetailRow>

          <DetailRow label="Listed on">
            {new Date(trade.created_at).toLocaleString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </DetailRow>
        </dl>
      </section>

      {/* How it works — brief explainer */}
      <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
          How this works
        </p>
        <ol className="mt-2 flex flex-col gap-1 text-sm text-violet-800 list-decimal list-inside">
          <li>Click "Buy Now" to lock your funds in a Soroban escrow contract.</li>
          <li>The seller delivers your {formatAssetType(trade.asset_type)}.</li>
          <li>Platform confirms delivery and releases the payment to the seller.</li>
        </ol>
      </div>

      {/* Buy error */}
      {buyError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {buyError}
        </div>
      )}

      {/* CTA area */}
      <div className="mt-8 flex flex-col gap-3">
        {/* Buy Now — only rendered for authenticated non-seller buyers */}
        {authed && isActive && !isSeller && (
          <button
            type="button"
            onClick={handleBuy}
            disabled={buying || countdown.expired}
            aria-disabled={buying || countdown.expired}
            aria-label={
              countdown.expired
                ? "This offer has expired"
                : `Buy ${formatAssetType(trade.asset_type)} worth ₦${trade.amount.toLocaleString()} from ${sellerAlias}`
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            {buying ? (
              <>
                <Spinner label="Processing purchase…" />
                Processing…
              </>
            ) : countdown.expired ? (
              "Offer expired"
            ) : (
              "Buy Now"
            )}
          </button>
        )}

        {/* Unauthenticated CTA */}
        {!authed && isActive && !countdown.expired && (
          <a
            href={`/auth/signup?returnTo=${encodeURIComponent(`/trades/${trade.id}`)}`}
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            aria-label="Sign in to buy this offer"
          >
            Sign in to Buy
          </a>
        )}

        {/* Seller viewing their own listing */}
        {isSeller && (
          <p
            role="note"
            className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-center text-sm text-gray-500"
          >
            This is your listing.
          </p>
        )}

        {/* Non-active trade states */}
        {!isActive && (
          <p
            role="note"
            className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm text-amber-700"
          >
            This offer is no longer available ({trade.status.toLowerCase()}).
          </p>
        )}

        {/* Expired offer */}
        {isActive && countdown.expired && (
          <p
            role="note"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-center text-sm text-red-700"
          >
            This offer has expired.
          </p>
        )}

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          ← Back to marketplace
        </a>
      </div>
    </article>
  );
}
