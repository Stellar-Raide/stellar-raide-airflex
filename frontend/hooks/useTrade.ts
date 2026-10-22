"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch, ApiError } from "../lib/apiFetch";
import type { TradeOffer } from "@stellar-raide-stellar-raide-airflex/shared";

export interface UseTradeReturn {
  trade: TradeOffer | null;
  isLoading: boolean;
  error: ApiError | Error | null;
  attempt: number;
  refetch: () => Promise<void>;
}

interface ApiResponse {
  data?: TradeOffer;
  trade?: TradeOffer;
}

// In-memory cache for SWR deduplication
const cacheMap = new Map<string, { data: TradeOffer | null; timestamp: number }>();
const inFlightPromises = new Map<string, Promise<TradeOffer | null>>();
const CACHE_TTL_MS = 5000; // 5 seconds deduplication window

export function clearTradeCache(): void {
  cacheMap.clear();
  inFlightPromises.clear();
}

export function useTrade(id: string): UseTradeReturn {
  const [trade, setTrade] = useState<TradeOffer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [attempt, setAttempt] = useState<number>(1);

  const cacheKey = `/api/v1/trades/${id}`;
  const isMounted = useRef(true);

  const fetchData = async (isRefetch = false): Promise<void> => {
    if (!id) {
      setTrade(null);
      setIsLoading(false);
      setError(null);
      setAttempt(1);
      return;
    }

    if (!isRefetch) {
      const cached = cacheMap.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setTrade(cached.data);
        setIsLoading(false);
        setError(null);
        setAttempt(1);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setAttempt(1);

    // Retry logic with exponential backoff concept (without setTimeout for test simplicity)
    // Retries only for transient failures (5xx, network, timeout), not 4xx client errors
    let lastError: ApiError | Error | null = null;

    for (let i = 1; i <= 3; i++) {
      setAttempt(i);

      try {
        let promise = inFlightPromises.get(cacheKey);
        if (!promise) {
          promise = apiFetch<ApiResponse>(cacheKey).then((res) => {
            const fetchedTrade = res.data ?? res.trade ?? (res as unknown as TradeOffer);
            cacheMap.set(cacheKey, { data: fetchedTrade, timestamp: Date.now() });
            return fetchedTrade;
          });
          inFlightPromises.set(cacheKey, promise);
        }

        const result = await promise;
        inFlightPromises.delete(cacheKey);

        if (isMounted.current) {
          setTrade(result);
          setIsLoading(false);
        }
        setAttempt(3);
        return;
      } catch (err) {
        const errorObj = err instanceof ApiError ? err : new Error(String(err));
        lastError = errorObj;

        // Only retry for transient failures (5xx, network, timeout), not 4xx client errors
        const isApiError = errorObj instanceof ApiError;
        const shouldRetry =
          !isApiError ||
          (isApiError && errorObj.status >= 500) ||
          errorObj.message.toLowerCase().includes("timeout") ||
          errorObj.message.toLowerCase().includes("network");

        if (!shouldRetry || i >= 3) {
          if (isMounted.current) {
            setIsLoading(false);
            setError(errorObj);
          }
          setAttempt(i);
          return;
        }

        // Continue to next retry attempt
      }
    }

    // Should not reach here, but just in case
    setIsLoading(false);
    setError(lastError ?? new Error("Max retry attempts exceeded"));
    setAttempt(3);
  };

  useEffect(() => {
    isMounted.current = true;
    void fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [id, cacheKey]);

  return {
    trade,
    isLoading,
    error,
    attempt,
    refetch: () => fetchData(true),
  };
}