import {
  optimisticBalanceReducer,
  INITIAL_BALANCE_STATE,
  toBalanceNumber,
} from "./useOptimisticBalance";

describe("toBalanceNumber (#447)", () => {
  it("parses numeric strings", () => {
    expect(toBalanceNumber("1234.56")).toBeCloseTo(1234.56);
  });
  it("passes numbers through", () => {
    expect(toBalanceNumber(500)).toBe(500);
  });
  it("returns 0 for invalid input", () => {
    expect(toBalanceNumber("")).toBe(0);
    expect(toBalanceNumber(null)).toBe(0);
    expect(toBalanceNumber(undefined)).toBe(0);
    expect(toBalanceNumber("abc")).toBe(0);
    expect(toBalanceNumber(NaN)).toBe(0);
  });
});

describe("optimisticBalanceReducer (#447)", () => {
  const base = { confirmed: 10_000, optimistic: 10_000, pending: false };

  it("apply subtracts a withdrawal delta and marks pending", () => {
    const next = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    expect(next.optimistic).toBe(7_500);
    expect(next.confirmed).toBe(10_000);
    expect(next.pending).toBe(true);
  });

  it("apply adds a deposit delta", () => {
    const next = optimisticBalanceReducer(base, { type: "apply", delta: 1_500 });
    expect(next.optimistic).toBe(11_500);
    expect(next.pending).toBe(true);
  });

  it("revert restores the confirmed balance and clears pending", () => {
    const pending = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    const next = optimisticBalanceReducer(pending, { type: "revert" });
    expect(next.optimistic).toBe(10_000);
    expect(next.confirmed).toBe(10_000);
    expect(next.pending).toBe(false);
  });

  it("commit settles on the optimistic value when none is provided", () => {
    const pending = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    const next = optimisticBalanceReducer(pending, { type: "commit" });
    expect(next.confirmed).toBe(7_500);
    expect(next.optimistic).toBe(7_500);
    expect(next.pending).toBe(false);
  });

  it("commit accepts an explicit server value", () => {
    const pending = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    const next = optimisticBalanceReducer(pending, { type: "commit", value: 7_490 });
    expect(next.confirmed).toBe(7_490);
    expect(next.optimistic).toBe(7_490);
    expect(next.pending).toBe(false);
  });

  it("setConfirmed snaps both balances to the server value and clears pending", () => {
    const pending = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    const next = optimisticBalanceReducer(pending, { type: "setConfirmed", value: 7_500 });
    expect(next.confirmed).toBe(7_500);
    expect(next.optimistic).toBe(7_500);
    expect(next.pending).toBe(false);
  });

  it("concurrent applies branch from confirmed, not the in-flight optimistic value", () => {
    // First withdrawal of 2,500 → optimistic 7,500.
    const first = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    // A second concurrent withdrawal of 1,000 must compute from confirmed
    // (10,000), not the optimistic 7,500 — so the result is 9,000, not 6,500.
    const second = optimisticBalanceReducer(first, { type: "apply", delta: -1_000 });
    expect(second.optimistic).toBe(9_000);
    expect(second.confirmed).toBe(10_000);
    expect(second.pending).toBe(true);
  });

  it("revert after a concurrent apply restores the confirmed baseline", () => {
    const first = optimisticBalanceReducer(base, { type: "apply", delta: -2_500 });
    const second = optimisticBalanceReducer(first, { type: "apply", delta: -1_000 });
    const reverted = optimisticBalanceReducer(second, { type: "revert" });
    expect(reverted.optimistic).toBe(10_000);
    expect(reverted.pending).toBe(false);
  });

  it("initial state is non-pending with zero balances", () => {
    expect(INITIAL_BALANCE_STATE.pending).toBe(false);
    expect(INITIAL_BALANCE_STATE.confirmed).toBe(0);
    expect(INITIAL_BALANCE_STATE.optimistic).toBe(0);
  });

  it("does not allow the displayed balance to go below zero on a withdrawal", () => {
    // A withdrawal larger than the balance still clamps at 0 for display
    // purposes — the server will reject it, but the UI should not flash a
    // negative number.
    const next = optimisticBalanceReducer(base, { type: "apply", delta: -99_999 });
    expect(next.optimistic).toBe(0);
  });
});
