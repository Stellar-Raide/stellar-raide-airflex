import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SellPage from "./page";
import { resetConversionRateCache } from "./ratesCache";
import { QUEUE_STORAGE_KEY, loadQueue, resetOrderQueueForTests } from "../offline/orderQueue";

// Real catalog text (issue #453), so assertions match what users see.
jest.mock("next-intl", () => jest.requireActual("../../i18n/testing").nextIntlMock);

jest.mock("../lib/auth", () => ({
  isAuthenticated: () => true,
  getToken: () => "mock-jwt-token",
}));

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

function res(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
}

type Handler = (init: RequestInit) => Promise<unknown>;

/**
 * fetch mock: POST /trades goes to `onTrade`. Profile and rates work unless
 * `networkDown` is set, which makes them fail like a real offline request.
 */
function mockFetch(onTrade: Handler, { networkDown = false } = {}) {
  const fn = jest.fn().mockImplementation((url: string, init: RequestInit = {}) => {
    if (url.includes("/api/v1/trades")) return onTrade(init);
    if (networkDown) return Promise.reject(new TypeError("Failed to fetch"));
    if (url.includes("/api/v1/profile")) return res(200, { data: { kycStatus: "verified" } });
    if (url.includes("/api/v1/rates")) return res(200, { rate: 1600 });
    return Promise.reject(new Error(`Unknown URL ${url}`));
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const tradeCalls = (fn: jest.Mock) =>
  fn.mock.calls.filter(([url]) => String(url).includes("/api/v1/trades"));

async function fillAndSubmit(amount = "500") {
  await waitFor(() => expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(/Asset type/i), { target: { value: "MTN_AIRTIME" } });
  fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: amount } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Create listing|Save listing offline/i }));
  });
}

describe("SellPage offline queue (issue #461)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    resetConversionRateCache();
    resetOrderQueueForTests();
    setOnline(true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setOnline(true);
  });

  it("queues a listing created while offline instead of sending it, and shows it as pending (offline)", async () => {
    setOnline(false);
    const fetchMock = mockFetch(() => res(201, { data: {} }), { networkDown: true });
    window.localStorage.setItem("stellar-raide-stellar-raide-airflex:sell-kyc-status", "verified");

    render(<SellPage />);
    await fillAndSubmit();

    expect(await screen.findByTestId("queued-notice")).toHaveTextContent(/saved on this device/i);
    expect(tradeCalls(fetchMock)).toHaveLength(0);

    const stored = JSON.parse(window.localStorage.getItem(QUEUE_STORAGE_KEY) as string);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ assetType: "MTN_AIRTIME", amountNaira: 500, status: "pending" });
    expect(stored[0].idempotencyKey).toBeTruthy();

    const list = screen.getByTestId("offline-order-list");
    expect(within(list).getByTestId("offline-order-status")).toHaveTextContent("Pending (offline)");
    expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
  });

  it("flushes the queue on the online event with the stored idempotency key, once", async () => {
    setOnline(false);
    // Profile and rates fail while offline; the trade POST works once online.
    const fetchMock = mockFetch(() => res(201, { data: { id: "trade-1" } }), { networkDown: true });
    window.localStorage.setItem("stellar-raide-stellar-raide-airflex:sell-kyc-status", "verified");

    render(<SellPage />);
    await fillAndSubmit();
    await screen.findByTestId("offline-order-list");
    const key = loadQueue()[0]?.idempotencyKey;

    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      // A second online event in a row must not send the order again.
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(screen.queryByTestId("offline-order-list")).not.toBeInTheDocument());
    const calls = tradeCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const init = calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(key);
    expect(loadQueue()).toEqual([]);
    expect(await screen.findByTestId("flushed-notice")).toHaveTextContent(/1 queued listing was sent/i);
  });

  it("keeps a failed flush queued with a visible retry indicator, and Retry resends it with the same key", async () => {
    window.localStorage.setItem("stellar-raide-stellar-raide-airflex:sell-kyc-status", "verified");
    let tradeAttempt = 0;
    const fetchMock = mockFetch(() => {
      tradeAttempt += 1;
      // 1st: the live submit loses its connection. 2nd: flush hits a 503. 3rd: Retry works.
      if (tradeAttempt === 1) return Promise.reject(new TypeError("Failed to fetch"));
      if (tradeAttempt === 2) return res(503, { error: "unavailable" });
      return res(201, { data: { id: "trade-9" } });
    });

    render(<SellPage />);
    await fillAndSubmit();

    // Connection dropped mid-request: the order is queued, not lost.
    expect(await screen.findByTestId("queued-notice")).toBeInTheDocument();
    const key = loadQueue()[0]?.idempotencyKey;
    expect(key).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    const indicator = await screen.findByTestId("offline-order-retry-indicator");
    expect(indicator).toHaveTextContent(/Attempts: 1/);
    expect(screen.getByTestId("offline-order-status")).toHaveTextContent("Failed");
    expect(loadQueue()).toHaveLength(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    await waitFor(() => expect(screen.queryByTestId("offline-order-list")).not.toBeInTheDocument());
    const keys = tradeCalls(fetchMock).map(
      ([, init]) => ((init as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe(key);
  });

  it("sends an Idempotency-Key header on a normal online submit", async () => {
    const fetchMock = mockFetch(() =>
      res(201, {
        data: {
          id: "t1",
          asset_type: "MTN_AIRTIME",
          amount: 500,
          status: "open",
          expires_at: new Date().toISOString(),
        },
      }),
    );

    render(<SellPage />);
    await fillAndSubmit();

    await screen.findByText(/Listing Created/i);
    const [call] = tradeCalls(fetchMock);
    const headers = (call?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeTruthy();
    expect(loadQueue()).toEqual([]);
  });

  it("lets the seller discard a queued order", async () => {
    setOnline(false);
    window.localStorage.setItem("stellar-raide-stellar-raide-airflex:sell-kyc-status", "verified");
    mockFetch(() => res(201, { data: {} }), { networkDown: true });

    render(<SellPage />);
    await fillAndSubmit();
    await screen.findByTestId("offline-order-list");

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => expect(screen.queryByTestId("offline-order-list")).not.toBeInTheDocument());
    expect(loadQueue()).toEqual([]);
  });
});
