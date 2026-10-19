"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";

/**
 * useOptimisticBalance — optimistic wallet-balance updates (issue #447).
 *
 * Keeps a `confirmed` balance (last value from the server) and an
 * `optimistic` balance (what the user sees, which may include an in-flight
 * deposit/withdrawal/trade delta). Callers `apply` a delta the instant an
 * action is submitted, `revert` if the server rejects it, and let a server
 * refresh (`setConfirmed`, driven by the `confirmedBalance` prop) snap the
 * display back to reality once the response lands.
 *
 * Compatibility rules:
 *   - `apply` always computes from the **confirmed** baseline, so concurrent
 *     optimistic updates never compound on top of an in-flight optimistic
 *     value (a second action uses the confirmed balance, not the first
 *     optimistic one).
 *   - A server sync (`setConfirmed`) snaps both `confirmed` and `optimistic`
 *     to the fresh value and clears `pending`, so a successful action is
 *     reflected immediately and a failed action (after `revert`) is restored.
 *
 * The transition logic lives in the pure `optimisticBalanceReducer` so it can
 * be unit-tested without rendering React.
 */

export interface OptimisticBalanceState {
  /** Last server-confirmed balance. */
  confirmed: number;
  /** Balance currently displayed to the user (confirmed ± in-flight delta). */
  optimistic: number;
  /** True while an optimistic update is awaiting a server response. */
  pending: boolean;
}

export type OptimisticBalanceAction =
  | { type: "setConfirmed"; value: number }
  | { type: "apply"; delta: number }
  | { type: "revert" }
  | { type: "commit"; value?: number };

export const INITIAL_BALANCE_STATE: OptimisticBalanceState = {
  confirmed: 0,
  optimistic: 0,
  pending: false,
};

/** Coerce a balance that may arrive as a string ("0") or number into a number. */
export function toBalanceNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value ?? "");
  return isNaN(parsed) ? 0 : parsed;
}

export function optimisticBalanceReducer(
  state: OptimisticBalanceState,
  action: OptimisticBalanceAction,
): OptimisticBalanceState {
  switch (action.type) {
    case "setConfirmed": {
      // A fresh server value is authoritative: snap the display to it and
      // clear any pending optimistic update.
      return { confirmed: action.value, optimistic: action.value, pending: false };
    }
    case "apply": {
      // Always branch from the confirmed baseline so concurrent applies do not
      // compound on an in-flight optimistic value. Clamp at zero so a withdrawal
      // never flashes a negative balance (the server still rejects overdrafts).
      return {
        confirmed: state.confirmed,
        optimistic: Math.max(0, state.confirmed + action.delta),
        pending: true,
      };
    }
    case "revert": {
      // The server rejected the action — restore the confirmed balance.
      return { confirmed: state.confirmed, optimistic: state.confirmed, pending: false };
    }
    case "commit": {
      // The action succeeded and the caller knows the new balance (or trusts
      // the optimistic value). Either way we settle on a non-pending state.
      const confirmed = action.value ?? state.optimistic;
      return { confirmed, optimistic: confirmed, pending: false };
    }
    default:
      return state;
  }
}

export interface UseOptimisticBalanceResult {
  /** The balance string to display (formatted with thousands separators). */
  displayedBalance: string;
  /** The raw numeric balance currently displayed. */
  displayedNumber: number;
  /** The last server-confirmed numeric balance. */
  confirmedNumber: number;
  /** True while an optimistic update is in-flight. */
  pending: boolean;
  /** Optimistically apply a delta (e.g. `-amount` for a withdrawal). */
  apply: (delta: number) => void;
  /** Revert to the confirmed balance after a failed action. */
  revert: () => void;
  /** Commit a known new balance and clear pending. */
  commit: (value?: number) => void;
}

function formatBalance(value: number): string {
  return value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function useOptimisticBalance(
  confirmedBalance: string | number | null | undefined,
): UseOptimisticBalanceResult {
  const initial = toBalanceNumber(confirmedBalance);

  const [state, dispatch] = useReducer(optimisticBalanceReducer, INITIAL_BALANCE_STATE, () => ({
    confirmed: initial,
    optimistic: initial,
    pending: false,
  }));

  // Track the last confirmed value we synced so we only dispatch on real
  // changes (avoids looping with the effect below).
  const lastSynced = useRef(initial);

  useEffect(() => {
    const next = toBalanceNumber(confirmedBalance);
    if (next !== lastSynced.current) {
      lastSynced.current = next;
      dispatch({ type: "setConfirmed", value: next });
    }
  }, [confirmedBalance]);

  const apply = useCallback((delta: number) => dispatch({ type: "apply", delta }), []);
  const revert = useCallback(() => dispatch({ type: "revert" }), []);
  const commit = useCallback((value?: number) => dispatch({ type: "commit", value }), []);

  return {
    displayedBalance: formatBalance(state.optimistic),
    displayedNumber: state.optimistic,
    confirmedNumber: state.confirmed,
    pending: state.pending,
    apply,
    revert,
    commit,
  };
}
