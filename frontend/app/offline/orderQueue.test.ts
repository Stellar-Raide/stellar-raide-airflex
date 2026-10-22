import {
  QUEUE_STORAGE_KEY,
  enqueueOrder,
  flushQueue,
  loadQueue,
  removeOrder,
  resetOrderQueueForTests,
} from "./orderQueue";

const order = { assetType: "MTN_AIRTIME", amount: 5_000_000_000, amountNaira: 500, expiresInHours: 24 };

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const opts = (fetchImpl: jest.Mock, extra: Record<string, unknown> = {}) => ({
  apiUrl: "http://api.test",
  getToken: () => "jwt",
  fetchImpl: fetchImpl as unknown as typeof fetch,
  ...extra,
});

beforeEach(() => {
  window.localStorage.clear();
  resetOrderQueueForTests();
});

describe("enqueueOrder / loadQueue", () => {
  it("persists an order to localStorage as pending with an idempotency key", () => {
    const queued = enqueueOrder(order, 1000);

    expect(queued.status).toBe("pending");
    expect(queued.idempotencyKey).toBeTruthy();
    expect(queued.attempts).toBe(0);

    const stored = JSON.parse(window.localStorage.getItem(QUEUE_STORAGE_KEY) as string);
    expect(stored).toHaveLength(1);
    expect(stored[0].idempotencyKey).toBe(queued.idempotencyKey);
    // Survives a reload: it is read back from storage, not from memory.
    expect(loadQueue()).toEqual([queued]);
  });

  it("gives every order its own idempotency key and keeps them oldest first", () => {
    const a = enqueueOrder(order, 2000);
    const b = enqueueOrder({ ...order, amountNaira: 600 }, 1000);

    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
    expect(loadQueue().map((o) => o.idempotencyKey)).toEqual([b.idempotencyKey, a.idempotencyKey]);
  });

  it("does not queue the same idempotency key twice", () => {
    enqueueOrder({ ...order, idempotencyKey: "same-key" });
    enqueueOrder({ ...order, idempotencyKey: "same-key" });

    expect(loadQueue()).toHaveLength(1);
  });

  it("ignores corrupt or foreign storage contents", () => {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, "{not json");
    expect(loadQueue()).toEqual([]);

    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([{ nope: true }, "x", null]));
    expect(loadQueue()).toEqual([]);
  });

  it("puts an order left syncing by a closed tab back to pending", () => {
    const queued = enqueueOrder(order);
    window.localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify([{ ...queued, status: "syncing" }]),
    );

    expect(loadQueue()[0]?.status).toBe("pending");
  });
});

describe("flushQueue", () => {
  it("sends each queued order with its idempotency key and removes it on success", async () => {
    const queued = enqueueOrder(order);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(201, { data: { id: "trade-1" } }));

    const result = await flushQueue(opts(fetchMock));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/trades");
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe(queued.idempotencyKey);
    expect(headers.Authorization).toBe("Bearer jwt");
    expect(JSON.parse(init.body as string)).toEqual({
      assetType: "MTN_AIRTIME",
      amount: 5_000_000_000,
      expiresInHours: 24,
    });
    expect(result.sentKeys).toEqual([queued.idempotencyKey]);
    expect(result.created).toEqual([{ id: "trade-1" }]);
    expect(loadQueue()).toEqual([]);
  });

  it("does not send an order twice when flushes overlap", async () => {
    enqueueOrder(order);
    let release!: (r: Response) => void;
    const fetchMock = jest.fn().mockImplementation(
      () => new Promise<Response>((resolve) => (release = resolve)),
    );

    const first = flushQueue(opts(fetchMock));
    const second = flushQueue(opts(fetchMock));
    await new Promise((r) => setTimeout(r, 0));
    release(jsonResponse(201, { data: { id: "t" } }));
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadQueue()).toEqual([]);
  });

  it("keeps a failed order queued as failed and reuses the same key on the next attempt", async () => {
    const queued = enqueueOrder(order);
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: "t" } }));

    const first = await flushQueue(opts(fetchMock));

    expect(first.failedKeys).toEqual([queued.idempotencyKey]);
    const [afterFail] = loadQueue();
    expect(afterFail).toMatchObject({ status: "failed", attempts: 1, retryable: true });
    expect(afterFail?.lastError).toMatch(/network/i);

    // An automatic flush retries a retryable failure.
    await flushQueue(opts(fetchMock));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const keys = fetchMock.mock.calls.map(
      (c) => ((c[1] as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys).toEqual([queued.idempotencyKey, queued.idempotencyKey]);
    expect(loadQueue()).toEqual([]);
  });

  it("retries 5xx automatically but leaves a rejected (4xx) order for an explicit retry", async () => {
    const serverFail = enqueueOrder(order, 1);
    const rejected = enqueueOrder({ ...order, amountNaira: 700 }, 2);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: "unavailable" }))
      .mockResolvedValueOnce(jsonResponse(400, { error: "invalid_request", details: { amount: ["Too small"] } }));

    await flushQueue(opts(fetchMock));

    const byKey = Object.fromEntries(loadQueue().map((o) => [o.idempotencyKey, o]));
    expect(byKey[serverFail.idempotencyKey]).toMatchObject({ status: "failed", retryable: true });
    expect(byKey[rejected.idempotencyKey]).toMatchObject({
      status: "failed",
      retryable: false,
      lastError: "Too small",
    });

    // The next automatic flush only retries the retryable one.
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: { id: "ok" } }));
    await flushQueue(opts(fetchMock));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(loadQueue().map((o) => o.idempotencyKey)).toEqual([rejected.idempotencyKey]);

    // An explicit retry resends the rejected order with its original key.
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: { id: "ok2" } }));
    await flushQueue(opts(fetchMock, { onlyKey: rejected.idempotencyKey }));
    const lastHeaders = (fetchMock.mock.calls[3]?.[1] as RequestInit).headers as Record<string, string>;
    expect(lastHeaders["Idempotency-Key"]).toBe(rejected.idempotencyKey);
    expect(loadQueue()).toEqual([]);
  });

  it("stops on 401 and keeps every order waiting without counting an attempt", async () => {
    const a = enqueueOrder(order, 1);
    enqueueOrder({ ...order, amountNaira: 800 }, 2);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" }));

    const result = await flushQueue(opts(fetchMock));

    expect(result.authRequired).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const queue = loadQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ idempotencyKey: a.idempotencyKey, status: "pending", attempts: 0 });
    expect(queue[0]?.lastError).toMatch(/sign in/i);
  });

  it("does nothing without a token", async () => {
    enqueueOrder(order);
    const fetchMock = jest.fn();

    const result = await flushQueue(opts(fetchMock, { getToken: () => null }));

    expect(result.authRequired).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(loadQueue()).toHaveLength(1);
  });

  it("removeOrder drops one order", () => {
    const a = enqueueOrder(order, 1);
    const b = enqueueOrder({ ...order, amountNaira: 9 }, 2);

    removeOrder(a.idempotencyKey);

    expect(loadQueue().map((o) => o.idempotencyKey)).toEqual([b.idempotencyKey]);
  });
});
