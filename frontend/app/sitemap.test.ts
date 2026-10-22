/**
 * Sitemap dynamic entries (issue #465).
 *
 * Verifies that the sitemap:
 *  - includes the static public routes with lastmod/changefreq/priority
 *  - generates an entry per *active* trade listing URL
 *  - excludes stale/closed trades (Locked, Completed, Cancelled, Disputed)
 *  - carries lastmod, changefreq and priority on every entry
 *  - degrades to static routes only when the API is unreachable
 *  - honours the pagination upper bound so the sitemap stays bounded
 */
import type { TradeOffer } from "../../server/src/types/trade";

import sitemap from "./sitemap";

/** Build a minimal trade offer with overrides. */
function makeTrade(overrides: Partial<TradeOffer> = {}): TradeOffer {
  return {
    id: "trade-1",
    seller_id: "seller-1",
    buyer_id: null,
    asset_type: "airtime",
    amount: 1000,
    fee_amount: null,
    seller_net_amount: null,
    status: "Active",
    contract_listing_id: null,
    escrow_tx_hash: null,
    expires_at: "2026-12-01T00:00:00.000Z",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-18T12:00:00.000Z",
    seller_handle: "seller1",
    ...overrides,
  };
}

function tradesResponse(data: TradeOffer[], totalPages = 1) {
  return {
    ok: true,
    json: async () => ({ data, pagination: { page: 1, totalPages } }),
  } as Response;
}

describe("sitemap()", () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_ENV = process.env["NEXT_PUBLIC_SITE_URL"];

  beforeEach(() => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://stellar-raide-stellar-raide-airflex.example.com";
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.stellar-raide-stellar-raide-airflex.example.com";
    (global.fetch as unknown) = jest.fn();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_ENV === undefined) delete process.env["NEXT_PUBLIC_SITE_URL"];
    else process.env["NEXT_PUBLIC_SITE_URL"] = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it("includes every static public route with lastmod, changefreq and priority", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(tradesResponse([]));

    const entries = await sitemap();
    const staticUrls = entries
      .filter((e) => !e.url.includes("/trades/"))
      .map((e) => e.url);

    expect(staticUrls).toContain("https://stellar-raide-stellar-raide-airflex.example.com/");
    expect(staticUrls).toContain("https://stellar-raide-stellar-raide-airflex.example.com/sell");

    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(entry.changeFrequency).toBeDefined();
      expect(typeof entry.priority).toBe("number");
    }
  });

  it("generates an entry for each active trade listing URL", async () => {
    const active = [
      makeTrade({ id: "a1", updated_at: "2026-10-18T10:00:00.000Z" }),
      makeTrade({ id: "a2", updated_at: "2026-10-18T11:00:00.000Z" }),
    ];
    (global.fetch as jest.Mock).mockResolvedValue(tradesResponse(active));

    const entries = await sitemap();
    const tradeUrls = entries.filter((e) => e.url.includes("/trades/"));

    expect(tradeUrls).toHaveLength(2);
    expect(tradeUrls[0].url).toBe("https://stellar-raide-stellar-raide-airflex.example.com/trades/a1");
    expect(tradeUrls[1].url).toBe("https://stellar-raide-stellar-raide-airflex.example.com/trades/a2");
  });

  it("excludes stale/closed trades (Locked, Completed, Cancelled, Disputed)", async () => {
    const mixed = [
      makeTrade({ id: "good", status: "Active" }),
      makeTrade({ id: "bad-locked", status: "Locked" }),
      makeTrade({ id: "bad-completed", status: "Completed" }),
      makeTrade({ id: "bad-cancelled", status: "Cancelled" }),
      makeTrade({ id: "bad-disputed", status: "Disputed" }),
    ];
    (global.fetch as jest.Mock).mockResolvedValue(tradesResponse(mixed));

    const entries = await sitemap();
    const tradeUrls = entries
      .filter((e) => e.url.includes("/trades/"))
      .map((e) => e.url);

    expect(tradeUrls).toEqual(["https://stellar-raide-stellar-raide-airflex.example.com/trades/good"]);
  });

  it("uses the trade updated_at as lastModified and sets changefreq/priority", async () => {
    const trade = makeTrade({ id: "t1", updated_at: "2026-10-18T12:00:00.000Z" });
    (global.fetch as jest.Mock).mockResolvedValue(tradesResponse([trade]));

    const entries = await sitemap();
    const tradeEntry = entries.find((e) => e.url.endsWith("/trades/t1"));

    expect(tradeEntry).toBeDefined();
    expect(tradeEntry!.lastModified).toEqual(new Date("2026-10-18T12:00:00.000Z"));
    expect(tradeEntry!.changeFrequency).toBe("daily");
    expect(tradeEntry!.priority).toBe(0.6);
  });

  it("degrades to static routes only when the API is unreachable", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    const entries = await sitemap();
    const tradeUrls = entries.filter((e) => e.url.includes("/trades/"));

    expect(tradeUrls).toHaveLength(0);
    // static routes still present
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("degrades to static routes only on a non-OK response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 } as Response);

    const entries = await sitemap();
    expect(entries.filter((e) => e.url.includes("/trades/"))).toHaveLength(0);
  });

  it("honours the pagination upper bound (max 5 pages)", async () => {
    // Report many pages; only 5 fetches should happen.
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return Promise.resolve(
        tradesResponse([makeTrade({ id: `t-${page}` })], 999) as Response,
      );
    });

    const entries = await sitemap();
    const tradeUrls = entries.filter((e) => e.url.includes("/trades/"));

    // One trade per page × 5 pages cap = 5 trade entries
    expect(tradeUrls).toHaveLength(5);
    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(5);
  });

  it("stops paginating when totalPages is reached", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return Promise.resolve(
        tradesResponse([makeTrade({ id: `t-${page}` })], 2) as Response,
      );
    });

    const entries = await sitemap();
    const tradeUrls = entries.filter((e) => e.url.includes("/trades/"));

    expect(tradeUrls).toHaveLength(2);
    expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(2);
  });
});
