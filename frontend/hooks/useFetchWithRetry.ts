"use client";

import { useEffect, useState, useRef } from "react";
import { ApiError } from "../lib/apiFetch";

export interface UseFetchWithRetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Returns the result of calling fetchFn, with automatic retries on transient failures.
 * - Retries only for transient failures (network/timeout/5xx), not 4xx client errors
 * - Jittered exponential backoff between attempts
 * - Exposes attempt count and abort capability
 * 
 * NOTE: This hook must be called at the top level of a React function component,
 * not inside conditional blocks or regular functions.
 */
export function useFetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchWithRetryOptions = {}
): {
  data: T | null;
  isLoading: boolean;
  error: ApiError | Error | null;
  attempt: number;
  abort: () => void;
} {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    jitter = true,
    onRetry,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(1);
  const abortController = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    abortController.current = new AbortController();
    let currentAttempt = 1;
    let isAborted = false;
    let latestError: ApiError | Error | null = null;

    const delay = (attemptNum: number): number => {
      const base = initialDelay * Math.pow(2, attemptNum - 1);
      if (!jitter) return Math.min(base, maxDelay);
      // Jitter: add randomness between 0 and base to avoid thundering-herd
      const randomness = Math.random() * base;
      return Math.min(base + randomness, maxDelay);
    };

    const execute = async () => {
      if (isAborted) return;

      setIsLoading(true);
      setError(null);
      setAttempt(currentAttempt);

      if (currentAttempt > maxAttempts) {
        setIsLoading(false);
        setError(latestError ?? new Error("Max retry attempts exceeded"));
        setAttempt(maxAttempts);
        return;
      }

      try {
        const result = await fetchFn();
        setData(result);
        setIsLoading(false);
        setAttempt(maxAttempts);
        return;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        latestError = errorObj;

        // Only retry for transient failures:
        // - Network errors (fetch threw, not an ApiError)
        // - 5xx server errors
        // - Timeout errors
        // Do NOT retry 4xx client errors
        const isApiError = errorObj instanceof ApiError;
        const shouldRetry =
          !isApiError ||
          (isApiError && errorObj.status >= 500) ||
          errorObj.message.toLowerCase().includes("timeout") ||
          errorObj.message.toLowerCase().includes("network");

        if (!shouldRetry || currentAttempt >= maxAttempts) {
          setIsLoading(false);
          setError(errorObj);
          setAttempt(currentAttempt);
          return;
        }

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(currentAttempt, errorObj);
        }

        setAttempt(currentAttempt);

        // Schedule retry with backoff
        const backoffDelay = delay(currentAttempt);

        await new Promise((resolve) => {
          timeoutRef.current = window.setTimeout(resolve, backoffDelay);
        });

        currentAttempt++;
        await execute();
      }
    };

    execute();

    return () => {
      isAborted = true;
      abortController.current?.abort();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchFn, maxAttempts, initialDelay, maxDelay, jitter, onRetry]);

  const abort = () => {
    abortController.current?.abort();
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setError(new Error("Fetch aborted"));
    setAttempt(1);
  };

  return {
    data,
    isLoading,
    error,
    attempt,
    abort,
  };
}