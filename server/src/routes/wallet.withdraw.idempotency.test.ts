/**
 * wallet.withdraw.idempotency.test.ts
 *
 * Integration tests for Idempotency-Key handling on POST /api/v1/wallet/withdraw
 * (issue #479). Requests go through the real app, route and wallet service;
 * only Postgres is replaced, by a small in-memory stand-in that models what
 * the idempotency guarantee relies on:
 *
 *   - transactions: writes are undone on ROLLBACK, and other connections only
 *     see a key row once it is committed;
 *   - the (user_id, idempotency_key) primary key: an INSERT that collides
 *     with another connection's uncommitted row waits for that transaction,
 *     then fails with a unique violation (23505) if it committed.
 *
 * The assertion that matters throughout: the wallet is debited, a withdrawal
 * row is created and a payout job is queued exactly once per key.
 */

process.env["JWT_SECRET"] = "test-secret-at-least-32-chars-long!";
process.env["DATABASE_URL"] = "postgresql://test:test@localhost/test";
process.env["ESCROW_CONTRACT_ADDRESS"] =
  "CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP";
process.env["ENCRYPTION_KEY"] =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
process.env["STELLAR_SERVER_SECRET"] =
  "SBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env["PLATFORM_TREASURY_USER_ID"] = "00000000-0000-0000-0000-000000000001";

jest.mock("../db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock("../jobs", () => ({
  QueueService: { enqueue: jest.fn().mockResolvedValue(undefined) },
  initJobQueue: jest.fn(),
}));

jest.mock("../services/notifications", () => ({
  NotificationService: {
    send: jest.fn(),
    sendToMany: jest.fn(),
    sendToAdmins: jest.fn(),
  },
}));

import request from "supertest";
import app from "../index";
import pool from "../db";
import { QueueService } from "../jobs";

const mockEnqueue = QueueService.enqueue as jest.Mock;

const USER_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_USER_ID = "bbbbbbbb-0000-0000-0000-000000000002";

function makeJwt(userId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
  return jwt.sign(
    { sub: userId, stellarPublicKey: "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
    process.env["JWT_SECRET"]!,
    { expiresIn: "1h" }
  );
}

// ---------------------------------------------------------------------------
// In-memory Postgres stand-in
// ---------------------------------------------------------------------------

interface KeyRow {
  request_fingerprint: string;
  withdrawal_id: string | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  committed: boolean;
  owner: number;
  /** Resolves when the owning transaction commits or rolls back. */
  settled: Promise<void>;
  settle: () => void;
}

class FakeDb {
  balances = new Map<string, number>();
  keys = new Map<string, KeyRow>();
  withdrawals: Array<{ id: string; user_id: string; amount: number }> = [];
  debits = 0;
  private nextConnection = 1;

  /** `pool.query` — autocommit reads outside any transaction. */
  poolQuery = async (sql: string, params: unknown[] = []) => {
    if (sql.includes("SELECT token_version FROM users")) {
      return { rows: [{ token_version: 1 }] };
    }
    if (sql.includes("FROM withdrawal_idempotency_keys")) {
      return { rows: this.visibleKey(params, 0) };
    }
    throw new Error(`Unexpected pool.query: ${sql}`);
  };

  connect = async () => {
    const id = this.nextConnection++;
    let undo: Array<() => void> = [];

    const query = async (sql: string, params: unknown[] = []) => {
      const text = sql.trim();

      if (text === "BEGIN") {
        undo = [];
        return { rows: [] };
      }
      if (text === "COMMIT") {
        for (const row of this.keys.values()) {
          if (row.owner === id && !row.committed) {
            row.committed = true;
            row.settle();
          }
        }
        undo = [];
        return { rows: [] };
      }
      if (text === "ROLLBACK") {
        for (const fn of undo.reverse()) fn();
        undo = [];
        return { rows: [] };
      }

      if (text.startsWith("INSERT INTO withdrawal_idempotency_keys")) {
        const [userId, key, fingerprint] = params as [string, string, string];
        const pk = `${userId}:${key}`;
        let existing = this.keys.get(pk);
        if (existing && !existing.committed && existing.owner !== id) {
          await existing.settled;
          existing = this.keys.get(pk);
        }
        if (existing) {
          throw Object.assign(new Error("duplicate key value violates unique constraint"), {
            code: "23505",
          });
        }
        let settle!: () => void;
        const settled = new Promise<void>((resolve) => (settle = resolve));
        const row: KeyRow = {
          request_fingerprint: fingerprint,
          withdrawal_id: null,
          response_status: null,
          response_body: null,
          committed: false,
          owner: id,
          settled,
          settle,
        };
        this.keys.set(pk, row);
        undo.push(() => {
          this.keys.delete(pk);
          row.settle();
        });
        return { rows: [] };
      }

      if (text.startsWith("UPDATE withdrawal_idempotency_keys")) {
        const [userId, key, withdrawalId, status, body] = params as [
          string, string, string, number, string,
        ];
        const row = this.keys.get(`${userId}:${key}`)!;
        row.withdrawal_id = withdrawalId;
        row.response_status = status;
        row.response_body = JSON.parse(body) as Record<string, unknown>;
        return { rows: [] };
      }

      if (text.includes("FROM withdrawal_idempotency_keys")) {
        return { rows: this.visibleKey(params, id) };
      }

      if (text.startsWith("SELECT fiat_balance FROM wallets")) {
        const balance = this.balances.get(params[0] as string);
        return { rows: balance === undefined ? [] : [{ fiat_balance: balance.toFixed(2) }] };
      }

      if (text.startsWith("INSERT INTO withdrawals")) {
        const row = {
          id: `wd-${this.withdrawals.length + 1}`,
          user_id: params[0] as string,
          amount: params[1] as number,
        };
        this.withdrawals.push(row);
        undo.push(() => {
          this.withdrawals = this.withdrawals.filter((w) => w !== row);
        });
        return { rows: [{ id: row.id }] };
      }

      if (text.startsWith("UPDATE wallets")) {
        const [amount, userId] = params as [number, string];
        this.balances.set(userId, this.balances.get(userId)! - amount);
        this.debits += 1;
        undo.push(() => {
          this.balances.set(userId, this.balances.get(userId)! + amount);
          this.debits -= 1;
        });
        return { rows: [] };
      }

      throw new Error(`Unexpected client.query: ${text}`);
    };

    return { query: jest.fn(query), release: jest.fn() };
  };

  /** A key row as connection `connId` sees it (0 = outside a transaction). */
  private visibleKey(params: unknown[], connId: number) {
    const row = this.keys.get(`${params[0] as string}:${params[1] as string}`);
    if (!row || (!row.committed && row.owner !== connId)) return [];
    const { request_fingerprint, response_status, response_body } = row;
    return [{ request_fingerprint, response_status, response_body }];
  }
}

let db: FakeDb;

beforeEach(() => {
  jest.clearAllMocks();
  db = new FakeDb();
  db.balances.set(USER_ID, 10_000);
  db.balances.set(OTHER_USER_ID, 10_000);
  (pool.query as jest.Mock).mockImplementation(db.poolQuery);
  (pool.connect as jest.Mock).mockImplementation(db.connect);
});

const body = {
  amount: 2500,
  bank_code: "058",
  account_number: "0123456789",
  account_name: "ADA OBI",
};

function withdraw(key: string | null, payload: object = body, userId = USER_ID) {
  const req = request(app)
    .post("/api/v1/wallet/withdraw")
    .set("Authorization", `Bearer ${makeJwt(userId)}`);
  if (key !== null) req.set("Idempotency-Key", key);
  return req.send(payload);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/wallet/withdraw — Idempotency-Key (issue #479)", () => {
  it("rejects a request without an Idempotency-Key", async () => {
    const res = await withdraw(null);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Idempotency-Key header is required/);
    expect(db.debits).toBe(0);
  });

  it.each([["short"], ["has spaces in it"], ["x".repeat(129)], ["key/with/slashes"]])(
    "rejects a malformed Idempotency-Key %p",
    async (key) => {
      const res = await withdraw(key);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Idempotency-Key must be/);
      expect(db.debits).toBe(0);
    }
  );

  it("executes a double submission with the same key exactly once", async () => {
    const key = "4f6c1a52-0c8e-4b7e-9d1a-2f0c5b7e9a11";

    const first = await withdraw(key);
    const second = await withdraw(key);

    expect(first.status).toBe(202);
    expect(first.body).toMatchObject({ status: "pending", withdrawalId: "wd-1" });
    expect(first.headers["idempotent-replayed"]).toBeUndefined();

    expect(second.status).toBe(202);
    expect(second.body).toEqual(first.body);
    expect(second.headers["idempotent-replayed"]).toBe("true");

    expect(db.debits).toBe(1);
    expect(db.withdrawals).toHaveLength(1);
    expect(db.balances.get(USER_ID)).toBe(7_500);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledWith("process-withdrawal", { withdrawalId: "wd-1" });
  });

  it("executes concurrent submissions with the same key exactly once", async () => {
    const key = "9b2d7e10-5a3f-4c21-8e6b-1d4f7a9c0e22";

    const responses = await Promise.all([withdraw(key), withdraw(key), withdraw(key)]);

    for (const res of responses) {
      expect(res.status).toBe(202);
      expect(res.body).toEqual(responses[0]!.body);
    }
    expect(responses.filter((r) => r.headers["idempotent-replayed"] === "true")).toHaveLength(2);

    expect(db.debits).toBe(1);
    expect(db.withdrawals).toHaveLength(1);
    expect(db.balances.get(USER_ID)).toBe(7_500);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  it("performs separate withdrawals for different keys", async () => {
    await withdraw("key-aaaaaaaa-0001");
    await withdraw("key-aaaaaaaa-0002");

    expect(db.debits).toBe(2);
    expect(db.balances.get(USER_ID)).toBe(5_000);
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
  });

  it("rejects reuse of a key with a different request body", async () => {
    const key = "key-reused-for-another-amount";

    await withdraw(key);
    const res = await withdraw(key, { ...body, amount: 9000 });

    expect(res.status).toBe(422);
    expect(db.debits).toBe(1);
    expect(db.balances.get(USER_ID)).toBe(7_500);
  });

  it("scopes keys per user", async () => {
    const key = "shared-key-between-users";

    const mine = await withdraw(key, body, USER_ID);
    const theirs = await withdraw(key, body, OTHER_USER_ID);

    expect(theirs.status).toBe(202);
    expect(theirs.body.withdrawalId).not.toBe(mine.body.withdrawalId);
    expect(theirs.headers["idempotent-replayed"]).toBeUndefined();
    expect(db.debits).toBe(2);
  });

  it("does not store a refused request, so a retry is evaluated again", async () => {
    const key = "key-retry-after-top-up";
    db.balances.set(USER_ID, 1_000);

    const refused = await withdraw(key);
    expect(refused.status).toBe(400);
    expect(refused.body.error).toBe("Insufficient fiat balance");
    expect(db.keys.size).toBe(0);

    db.balances.set(USER_ID, 10_000);
    const retried = await withdraw(key);

    expect(retried.status).toBe(202);
    expect(retried.headers["idempotent-replayed"]).toBeUndefined();
    expect(db.debits).toBe(1);
    expect(db.balances.get(USER_ID)).toBe(7_500);
  });
});
