import { notFound } from "next/navigation";
import type { TradeOffer } from "../../../../server/src/types/trade";
import TradeDetailClient from "./TradeDetailClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradeResponse {
  data: TradeOffer;
}

// ---------------------------------------------------------------------------
// Data fetching (SSR)
// ---------------------------------------------------------------------------

async function getTrade(id: string): Promise<TradeOffer | null> {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/v1/trades/${encodeURIComponent(id)}`, {
      // Always serve fresh data so expiry countdowns and status changes
      // are reflected immediately. Adjust to `revalidate: 30` if traffic
      // warrants ISR caching at the cost of slight staleness.
      cache: "no-store",
    });
  } catch {
    // Network error — treat as not found rather than crashing
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const body = (await res.json()) as TradeResponse;
  return body.data ?? null;
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TradeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const trade = await getTrade(id);

  // Delegate to Next.js global not-found.tsx if trade is absent
  if (!trade) notFound();

  // trade is guaranteed non-null here — pass down to the interactive shell
  return <TradeDetailClient trade={trade} />;
}
