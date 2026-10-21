import { FraudDetectionService, VelocityError, REPEATED_FAILED_TRADES } from "./fraudDetection";
import pool from "../db";
import { cache } from "./cache";

jest.mock("../db", () => ({
  query: jest.fn(),
}));

jest.mock("./cache", () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe("FraudDetectionService", () => {
  const mockPoolQuery = pool.query as jest.Mock;
  const mockCacheGet = cache.get as jest.MockedFunction<typeof cache.get>;
  const mockCacheSet = cache.set as jest.MockedFunction<typeof cache.set>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows trade creation when below velocity limit", async () => {
    mockCacheGet.mockResolvedValueOnce(JSON.stringify({ count: 2, resetAt: Date.now() + 3600000 }));
    mockCacheSet.mockResolvedValueOnce();

    const result = await FraudDetectionService.checkVelocity("user-123", "trade_creation");
    expect(result.allowed).toBe(true);
    expect(mockCacheSet).toHaveBeenCalledWith(
      "velocity:trade_creation:user-123",
      expect.stringContaining('"count":3'),
      expect.any(Number)
    );
  });

  it("throws VelocityError (429) and logs to DB when limit is exceeded", async () => {
    process.env["MAX_TRADES_PER_HOUR"] = "5";
    mockCacheGet.mockResolvedValueOnce(JSON.stringify({ count: 5, resetAt: Date.now() + 1800000 }));
    mockPoolQuery.mockResolvedValueOnce({ rows: [], command: "", rowCount: 1, oid: 0, fields: [] });

    await expect(FraudDetectionService.checkVelocity("user-456", "trade_creation")).rejects.toThrow(
      VelocityError
    );

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO suspicious_activity"),
      expect.arrayContaining(["user-456", "trade_creation"])
    );
  });

  it("retrieves flagged accounts with > 3 violations in past 24h", async () => {
    const mockFlagged = [
      {
        user_id: "user-flagged",
        violation_count: 4,
        last_violation_at: "2026-08-28T22:00:00Z",
        violations: [],
      },
    ];
    mockPoolQuery.mockResolvedValueOnce({
      rows: mockFlagged,
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const accounts = await FraudDetectionService.getFlaggedAccounts();
    expect(accounts).toEqual(mockFlagged);
    expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining("HAVING COUNT(*) > 3"));
  });
});

describe("FraudDetectionService — repeated failed trades (issue #491)", () => {
  const mockPoolQuery = pool.query as jest.Mock;
  const mockCacheGet = cache.get as jest.Mock;
  const mockCacheSet = cache.set as jest.Mock;

  /** Backs the mocked cache with a Map so state carries across calls. */
  let store: Map<string, string>;
  let now: number;
  const originalEnv = process.env;

  const HOUR = 60 * 60 * 1000;

  async function fail(times: number, userId = "user-1", stepMs = 60_000) {
    let outcome = { failureCount: 0, flagged: false };
    for (let i = 0; i < times; i++) {
      outcome = await FraudDetectionService.recordFailedTrade(userId, `trade-${i}`, "VERIFICATION_FAILED");
      now += stepMs;
    }
    return outcome;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env["FAILED_TRADE_THRESHOLD"];
    delete process.env["FAILED_TRADE_WINDOW_SECONDS"];

    store = new Map();
    mockCacheGet.mockImplementation(async (key: string) => store.get(key) ?? null);
    mockCacheSet.mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
    });
    // A new open flag is inserted unless a test says otherwise.
    mockPoolQuery.mockResolvedValue({ rows: [{ id: "flag-1" }], rowCount: 1 });

    now = Date.parse("2026-10-20T12:00:00Z");
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("getFailedTradeRule", () => {
    it("defaults to 5 failures within 1 hour", () => {
      expect(FraudDetectionService.getFailedTradeRule()).toEqual({ threshold: 5, windowSeconds: 3600 });
    });

    it("reads overrides from the environment and ignores invalid values", () => {
      process.env["FAILED_TRADE_THRESHOLD"] = "3";
      process.env["FAILED_TRADE_WINDOW_SECONDS"] = "600";
      expect(FraudDetectionService.getFailedTradeRule()).toEqual({ threshold: 3, windowSeconds: 600 });

      process.env["FAILED_TRADE_THRESHOLD"] = "-1";
      process.env["FAILED_TRADE_WINDOW_SECONDS"] = "abc";
      expect(FraudDetectionService.getFailedTradeRule()).toEqual({ threshold: 5, windowSeconds: 3600 });
    });
  });

  describe("threshold triggering", () => {
    it("does not flag below the threshold", async () => {
      const outcome = await fail(4);

      expect(outcome).toEqual({ failureCount: 4, flagged: false });
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it("flags the account on the 5th failure within the hour with reason code and audit details", async () => {
      const outcome = await fail(5);

      expect(outcome).toEqual({ failureCount: 5, flagged: true });
      expect(mockPoolQuery).toHaveBeenCalledTimes(1);

      const [sql, params] = mockPoolQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("INSERT INTO fraud_flags");
      expect(sql).toContain("ON CONFLICT (user_id, reason_code) WHERE status = 'open' DO NOTHING");
      expect(params[0]).toBe("user-1");
      expect(params[1]).toBe(REPEATED_FAILED_TRADES);

      const details = JSON.parse(params[2] as string);
      expect(details).toMatchObject({ threshold: 5, windowSeconds: 3600, failureCount: 5 });
      expect(details.failures).toHaveLength(5);
      expect(details.failures[0]).toEqual({
        tradeId: "trade-0",
        reason: "VERIFICATION_FAILED",
        at: "2026-10-20T12:00:00.000Z",
      });
    });

    it("honours a configured threshold", async () => {
      process.env["FAILED_TRADE_THRESHOLD"] = "2";

      expect((await fail(1)).flagged).toBe(false);
      expect((await fail(1)).flagged).toBe(true);
    });

    it("reports flagged=false when an open flag already exists (no duplicate flags)", async () => {
      await fail(5);
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const outcome = await fail(1);

      expect(outcome).toEqual({ failureCount: 6, flagged: false });
    });

    it("tracks users independently", async () => {
      await fail(4, "user-a");
      const outcome = await fail(1, "user-b");

      expect(outcome).toEqual({ failureCount: 1, flagged: false });
    });

    it("stores the history with a TTL equal to the window", async () => {
      await fail(1);

      expect(mockCacheSet).toHaveBeenCalledWith("failed-trades:user-1", expect.any(String), 3600);
    });
  });

  describe("rolling window expiry", () => {
    it("drops failures older than the window before counting", async () => {
      await fail(4); // 12:00, 12:01, 12:02, 12:03
      now += HOUR; // 13:04 — all four are now outside the window

      const outcome = await fail(1);

      expect(outcome).toEqual({ failureCount: 1, flagged: false });
      expect(JSON.parse(store.get("failed-trades:user-1")!)).toHaveLength(1);
    });

    it("keeps failures that are still inside the window", async () => {
      await fail(4, "user-1", 10 * 60_000); // 12:00, 12:10, 12:20, 12:30
      now = Date.parse("2026-10-20T12:55:00Z");

      expect(await fail(1)).toEqual({ failureCount: 5, flagged: true });
    });

    it("expires a failure exactly one window old", async () => {
      await fail(1);
      now = Date.parse("2026-10-20T13:00:00Z");

      expect((await fail(1)).failureCount).toBe(1);
    });

    it("slides: only the most recent failures count", async () => {
      process.env["FAILED_TRADE_WINDOW_SECONDS"] = "600"; // 10 minutes
      await fail(4, "user-1", 4 * 60_000); // 12:00, 12:04, 12:08, 12:12
      now = Date.parse("2026-10-20T12:13:00Z");

      // 12:00 has expired; 12:04, 12:08, 12:12, 12:13 remain.
      expect((await fail(1)).failureCount).toBe(4);
    });

    it("recovers from a corrupt cache entry", async () => {
      store.set("failed-trades:user-1", "not json");

      expect((await fail(1)).failureCount).toBe(1);
    });
  });

  describe("reset on success", () => {
    it("clears the history so failures must be consecutive", async () => {
      await fail(4);
      await FraudDetectionService.resetFailedTrades("user-1");

      expect(mockCacheSet).toHaveBeenLastCalledWith("failed-trades:user-1", "[]", 1);
      const outcome = await fail(4);
      expect(outcome).toEqual({ failureCount: 4, flagged: false });
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it("only resets the given user", async () => {
      await fail(4, "user-a");
      await FraudDetectionService.resetFailedTrades("user-b");

      expect((await fail(1, "user-a")).flagged).toBe(true);
    });
  });

  describe("admin review queries", () => {
    it("lists flags filtered by status with pagination", async () => {
      const flag = { id: "flag-1", user_id: "user-1", status: "open" };
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [flag] })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] });

      const result = await FraudDetectionService.listFraudFlags({ status: "open", limit: 20, offset: 40 });

      expect(result).toEqual({ flags: [flag], total: 1 });
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE status = \$1[\s\S]*LIMIT \$2 OFFSET \$3/),
        ["open", 20, 40]
      );
      expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining("COUNT(*)"), ["open"]);
    });

    it("lists all flags when no status is given", async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await FraudDetectionService.listFraudFlags({ limit: 10, offset: 0 });

      expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringMatching(/LIMIT \$1 OFFSET \$2/), [10, 0]);
      expect(mockPoolQuery.mock.calls[0]![0]).not.toContain("WHERE");
    });

    it("closes an open flag, recording reviewer, time and note", async () => {
      const reviewed = { id: "flag-1", status: "dismissed", reviewed_by: "admin-1" };
      mockPoolQuery.mockResolvedValueOnce({ rows: [reviewed] });

      const result = await FraudDetectionService.reviewFraudFlag("flag-1", "admin-1", "dismissed", "False positive");

      expect(result).toEqual(reviewed);
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringMatching(/reviewed_at = NOW\(\)[\s\S]*WHERE id = \$1 AND status = 'open'/),
        ["flag-1", "dismissed", "admin-1", "False positive"]
      );
    });

    it("returns null when the flag is missing or already closed", async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      expect(await FraudDetectionService.reviewFraudFlag("flag-x", "admin-1", "reviewed", null)).toBeNull();
    });
  });
});
