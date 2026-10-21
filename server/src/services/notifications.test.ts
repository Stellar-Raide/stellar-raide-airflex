import pool from "../db";
import logger from "../utils/logger";
import { NotificationService } from "./notifications";

jest.mock("../db", () => ({
  query: jest.fn(),
}));

describe("NotificationService.notifyTradeDisputeOpened (issue #490)", () => {
  const mockQuery = pool.query as jest.Mock;
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  const seller = {
    id: "seller-1",
    phone: "+2348010000001",
    opt_out_notifications: false,
    display_handle: "@stellar-raide-stellar-raide-airflex_5e11",
  };
  const buyer = {
    id: "buyer-1",
    phone: "+2348010000002",
    opt_out_notifications: false,
    display_handle: "@stellar-raide-stellar-raide-airflex_b0b0",
  };

  /** SMS bodies sent, keyed by recipient phone. */
  function sentMessages(): Record<string, string> {
    return Object.fromEntries(
      fetchMock.mock.calls.map(([, init]) => {
        const body = JSON.parse((init as RequestInit).body as string) as { to: string; sms: string };
        return [body.to, body.sms];
      })
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, TERMII_API_KEY: "test-key", APP_BASE_URL: "https://stellar-raide-stellar-raide-airflex.app/" };
    fetchMock.mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("loads both participants in one query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [buyer, seller] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "buyer-1",
      counterpartyId: "seller-1",
      reason: "Not delivered",
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ANY($1::uuid[])"), [
      ["buyer-1", "seller-1"],
    ]);
  });

  it("sends to the initiator and the counterparty, each naming the other party", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [buyer, seller] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "buyer-1",
      counterpartyId: "seller-1",
      reason: "Not delivered",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const messages = sentMessages();
    expect(messages[buyer.phone]).toContain("trade trd_1 with @stellar-raide-stellar-raide-airflex_5e11");
    expect(messages[seller.phone]).toContain("trade trd_1 with @stellar-raide-stellar-raide-airflex_b0b0");
    for (const text of Object.values(messages)) {
      expect(text).toContain("Reason: Not delivered.");
      expect(text).toContain("View the dispute: https://stellar-raide-stellar-raide-airflex.app/trades/trd_1");
      expect(text).not.toMatch(/\{\w+\}/);
    }
  });

  it("uses the fallback link text when APP_BASE_URL is not configured", async () => {
    delete process.env["APP_BASE_URL"];
    mockQuery.mockResolvedValueOnce({ rows: [buyer, seller] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "buyer-1",
      counterpartyId: "seller-1",
      reason: "Not delivered",
    });

    expect(sentMessages()[buyer.phone]).toContain("View the dispute: open the AirFlex app");
  });

  it("falls back to a generic counterparty when the other party has no handle", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [buyer, { ...seller, display_handle: null }] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "buyer-1",
      counterpartyId: "seller-1",
      reason: "Not delivered",
    });

    expect(sentMessages()[buyer.phone]).toContain("with your trading partner");
  });

  it("notifies only the initiator when the trade has no counterparty", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [seller] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "seller-1",
      counterpartyId: null,
      reason: "Buyer vanished",
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [["seller-1"]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentMessages()[seller.phone]).toContain("with your trading partner");
  });

  it("respects opt-out for one participant while still notifying the other", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [buyer, { ...seller, opt_out_notifications: true }] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "buyer-1",
      counterpartyId: "seller-1",
      reason: "Not delivered",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Object.keys(sentMessages())).toEqual([buyer.phone]);
  });

  it("keeps notifying the other participant when one SMS fails", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [buyer, seller] });
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" })
      .mockResolvedValueOnce({ ok: true, text: async () => "" });

    await expect(
      NotificationService.notifyTradeDisputeOpened({
        tradeId: "trd_1",
        initiatorId: "buyer-1",
        counterpartyId: "seller-1",
        reason: "Not delivered",
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "trade_dispute_opened" }),
      "[notifications] Failed to send SMS"
    );
  });

  it("never throws when participants cannot be loaded", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db down"));

    await expect(
      NotificationService.notifyTradeDisputeOpened({
        tradeId: "trd_1",
        initiatorId: "buyer-1",
        counterpartyId: "seller-1",
        reason: "Not delivered",
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates when initiator and counterparty are the same user", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [seller] });

    await NotificationService.notifyTradeDisputeOpened({
      tradeId: "trd_1",
      initiatorId: "seller-1",
      counterpartyId: "seller-1",
      reason: "Self-trade",
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [["seller-1"]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
