/**
 * Offline queue for pending sell orders (issue #461).
 *
 * Orders created while the browser is offline are written to `localStorage`
 * and sent to the backend once connectivity returns. Every queued order gets
 * an idempotency key when it is created. The same key is sent on every attempt
 * as the `Idempotency-Key` header of `POST /api/v1/trades`, so an order whose
 * first request actually reached the server (but whose response was lost) is
 * replayed by the backend instead of being listed twice.
 *
 * This module has no React dependency so it can be tested on its own.
 */

export const QUEUE_STORAGE_KEY = "stellar-raide-stellar-raide-airflex:sell-offline-queue:v1";
export const QUEUE_CHANGED_EVENT = "stellar-raide-stellar-raide-airflex:sell-queue-changed";

/**
 * - `pending`: waiting for connectivity (or for the next flush).
 * - `syncing`: a request for it is in flight right now.
 * - `failed`: the last attempt failed; it stays queued and is shown with a retry indicator.
 */
export type QueuedOrderStatus = "pending" | "syncing" | "failed";

export interface QueuedSellOrder {
  /** Sent as the `Idempotency-Key` header on every attempt. Never changes. */
  idempotencyKey: string;
  assetType: string;
  /** Amount in the unit the API expects (stroops), exactly as it will be sent. */
  amount: number;
  /** The naira amount the seller typed, kept for display. */
  amountNaira: number;
  expiresInHours: number;
  createdAt: number;
  status: QueuedOrderStatus;
  /** Number of failed attempts so far. */
  attempts: number;
  lastError?: string;
  /**
   * Whether an automatic flush should try this order again. `false` after the
   * server rejected it (for example a 400): only an explicit Retry resends it.
   */
  retryable: boolean;
}

export type NewQueuedOrder = Pick<
  QueuedSellOrder,
  "assetType" | "amount" | "amountNaira" | "expiresInHours"
> & { idempotencyKey?: string };

export interface FlushOptions {
  apiUrl: string;
  /** Returns the current auth token, or null when the user is signed out. */
  getToken: () => string | null;
  /** Only flush this order, even if it is not retryable (used by the Retry button). */
  onlyKey?: string;
  fetchImpl?: typeof fetch;
}

export interface FlushResult {
  /** Trades the backend created (or replayed) for flushed orders. */
  created: unknown[];
  /** Idempotency keys that were sent and removed from the queue. */
  sentKeys: string[];
  /** Idempotency keys that failed and remain queued. */
  failedKeys: string[];
  /** True when the flush stopped because there is no valid session. */
  authRequired: boolean;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isQueuedOrder(value: unknown): value is QueuedSellOrder {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.idempotencyKey === "string" &&
    v.idempotencyKey.length > 0 &&
    typeof v.assetType === "string" &&
    typeof v.amount === "number" &&
    typeof v.amountNaira === "number" &&
    typeof v.expiresInHours === "number" &&
    typeof v.createdAt === "number"
  );
}

/**
 * Reads the queue, oldest first. Corrupt or foreign data is ignored rather than
 * thrown, and an order left `syncing` by a tab that closed mid-request is put
 * back to `pending` so it is not stuck.
 */
export function loadQueue(): QueuedSellOrder[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isQueuedOrder)
      .map((order) => ({
        ...order,
        status: (order.status === "syncing" && !inFlightKeys.has(order.idempotencyKey)
          ? "pending"
          : order.status) as QueuedOrderStatus,
        attempts: typeof order.attempts === "number" ? order.attempts : 0,
        retryable: order.retryable !== false,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedSellOrder[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: the in-memory result of this call is still
    // returned to the caller, but the change is not persisted.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

/** Keys of orders this tab is sending right now, so `loadQueue` keeps them `syncing`. */
const inFlightKeys = new Set<string>();

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

export function newIdempotencyKey(): string {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Adds an order to the queue as `pending` and returns it. */
export function enqueueOrder(input: NewQueuedOrder, now: number = Date.now()): QueuedSellOrder {
  const order: QueuedSellOrder = {
    idempotencyKey: input.idempotencyKey ?? newIdempotencyKey(),
    assetType: input.assetType,
    amount: input.amount,
    amountNaira: input.amountNaira,
    expiresInHours: input.expiresInHours,
    createdAt: now,
    status: "pending",
    attempts: 0,
    retryable: true,
  };
  const queue = loadQueue();
  // The same key must never be queued twice.
  if (queue.some((o) => o.idempotencyKey === order.idempotencyKey)) {
    return queue.find((o) => o.idempotencyKey === order.idempotencyKey) as QueuedSellOrder;
  }
  saveQueue([...queue, order]);
  return order;
}

export function removeOrder(idempotencyKey: string): void {
  saveQueue(loadQueue().filter((o) => o.idempotencyKey !== idempotencyKey));
}

function updateOrder(idempotencyKey: string, patch: Partial<QueuedSellOrder>): void {
  saveQueue(
    loadQueue().map((o) => (o.idempotencyKey === idempotencyKey ? { ...o, ...patch } : o)),
  );
}

// ---------------------------------------------------------------------------
// Flushing
// ---------------------------------------------------------------------------

let current: Promise<FlushResult> | null = null;

/**
 * Sends queued orders to the backend, oldest first, one at a time.
 *
 * Calls without `onlyKey` that overlap share a single run, so an `online`
 * event firing while a flush is already running cannot send an order twice.
 * A call with `onlyKey` waits for any run in progress and then runs. On top of
 * that, every request carries the order's idempotency key.
 */
export function flushQueue(options: FlushOptions): Promise<FlushResult> {
  if (current && !options.onlyKey) return current;
  const previous = current ?? Promise.resolve(undefined);
  const run: Promise<FlushResult> = previous
    .catch(() => undefined)
    .then(() => doFlush(options))
    .finally(() => {
      if (current === run) current = null;
    });
  current = run;
  return run;
}

async function doFlush(options: FlushOptions): Promise<FlushResult> {
  const result: FlushResult = { created: [], sentKeys: [], failedKeys: [], authRequired: false };
  const fetchImpl = options.fetchImpl ?? fetch;

  const candidates = loadQueue().filter((order) => {
    if (options.onlyKey) return order.idempotencyKey === options.onlyKey;
    return order.status === "pending" || (order.status === "failed" && order.retryable);
  });

  for (const order of candidates) {
    const token = options.getToken();
    if (!token) {
      result.authRequired = true;
      break;
    }

    inFlightKeys.add(order.idempotencyKey);
    updateOrder(order.idempotencyKey, { status: "syncing" });

    try {
      const res = await fetchImpl(`${options.apiUrl}/api/v1/trades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": order.idempotencyKey,
        },
        body: JSON.stringify({
          assetType: order.assetType,
          amount: order.amount,
          expiresInHours: order.expiresInHours,
        }),
      });

      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { data?: unknown };
        removeOrder(order.idempotencyKey);
        result.sentKeys.push(order.idempotencyKey);
        if (body.data !== undefined) result.created.push(body.data);
        continue;
      }

      if (res.status === 401) {
        // Not the order's fault: keep it waiting and ask the user to sign in.
        updateOrder(order.idempotencyKey, {
          status: "pending",
          lastError: "Session expired. Sign in again to send this order.",
        });
        result.authRequired = true;
        break;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: Record<string, string[]>;
      };
      const detail = body.details ? Object.values(body.details).flat()[0] : body.error;
      // 5xx and 429 are worth retrying automatically; other 4xx means the server
      // rejected the order itself, so only an explicit Retry resends it.
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408;
      updateOrder(order.idempotencyKey, {
        status: "failed",
        attempts: order.attempts + 1,
        lastError: detail ?? `Request failed (${res.status}).`,
        retryable,
      });
      result.failedKeys.push(order.idempotencyKey);
    } catch {
      updateOrder(order.idempotencyKey, {
        status: "failed",
        attempts: order.attempts + 1,
        lastError: "Network error. Will retry when you are back online.",
        retryable: true,
      });
      result.failedKeys.push(order.idempotencyKey);
    } finally {
      inFlightKeys.delete(order.idempotencyKey);
    }
  }

  return result;
}

/** Test helper: forgets in-memory flush state. */
export function resetOrderQueueForTests(): void {
  current = null;
  inFlightKeys.clear();
}
