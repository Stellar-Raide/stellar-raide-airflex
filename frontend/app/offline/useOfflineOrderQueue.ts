"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  QUEUE_CHANGED_EVENT,
  QUEUE_STORAGE_KEY,
  flushQueue,
  loadQueue,
  removeOrder,
  type FlushResult,
  type QueuedSellOrder,
} from "./orderQueue";

interface Options {
  apiUrl: string;
  getToken: () => string | null;
  /** Called after a flush that sent at least one order. */
  onFlushed?: (result: FlushResult) => void;
}

/**
 * Keeps React state in sync with the offline sell-order queue and flushes it
 * when the browser comes back online (and once on mount if it already is).
 */
export function useOfflineOrderQueue({ apiUrl, getToken, onFlushed }: Options) {
  const [queue, setQueue] = useState<QueuedSellOrder[]>([]);
  const onFlushedRef = useRef(onFlushed);
  onFlushedRef.current = onFlushed;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const refresh = useCallback(() => setQueue(loadQueue()), []);

  const flush = useCallback(
    async (onlyKey?: string) => {
      const result = await flushQueue({
        apiUrl,
        getToken: () => getTokenRef.current(),
        onlyKey,
      });
      refresh();
      if (result.sentKeys.length > 0) onFlushedRef.current?.(result);
      return result;
    },
    [apiUrl, refresh],
  );

  useEffect(() => {
    refresh();

    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === QUEUE_STORAGE_KEY) refresh();
    }
    function handleOnline() {
      void flush();
    }

    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);

    if (window.navigator.onLine && loadQueue().length > 0) {
      void flush();
    }

    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
    };
  }, [flush, refresh]);

  return {
    queue,
    /** Retries one order now, even if the server rejected it earlier. */
    retry: (idempotencyKey: string) => flush(idempotencyKey),
    /** Drops an order from the queue without sending it. */
    discard: (idempotencyKey: string) => {
      removeOrder(idempotencyKey);
      refresh();
    },
    flush: () => flush(),
  };
}
