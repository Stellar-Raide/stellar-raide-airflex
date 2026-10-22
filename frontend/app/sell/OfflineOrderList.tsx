"use client";

import { useFormatter, useTranslations } from "next-intl";
import { NAIRA_FORMAT, assetLabel, type SellTranslator } from "./assetLabels";
import type { QueuedSellOrder } from "../offline/orderQueue";

interface Props {
  orders: QueuedSellOrder[];
  /** True while the browser reports no connectivity. */
  offline: boolean;
  onRetry: (idempotencyKey: string) => void;
  onDiscard: (idempotencyKey: string) => void;
}

function statusBadge(order: QueuedSellOrder, offline: boolean, t: SellTranslator) {
  if (order.status === "syncing") {
    return { text: t("queue.syncing"), classes: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" };
  }
  if (order.status === "failed") {
    return { text: t("queue.failed"), classes: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  }
  return {
    text: offline ? t("queue.pendingOffline") : t("queue.pending"),
    classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  };
}

/** Lists sell orders saved on this device that have not reached the backend yet. */
export function OfflineOrderList({ orders, offline, onRetry, onDiscard }: Props) {
  const t = useTranslations("Sell");
  const format = useFormatter();

  if (orders.length === 0) return null;

  return (
    <section
      aria-label={t("queue.label")}
      data-testid="offline-order-list"
      className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/60 dark:bg-amber-950/30"
    >
      <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        {t("queue.heading", { count: orders.length })}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {orders.map((order) => {
          const badge = statusBadge(order, offline, t);
          return (
            <li
              key={order.idempotencyKey}
              data-testid="offline-order"
              className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-gray-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {assetLabel(t, order.assetType)} · {format.number(order.amountNaira, NAIRA_FORMAT)}
                </span>
                <span
                  data-testid="offline-order-status"
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}
                >
                  {badge.text}
                </span>
              </div>

              {order.status === "failed" && (
                <p role="alert" data-testid="offline-order-retry-indicator" className="text-xs text-red-600 dark:text-red-400">
                  {order.lastError ?? t("queue.couldNotSend")} {t("queue.attempts", { count: order.attempts })}
                </p>
              )}
              {order.status === "pending" && order.lastError && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{order.lastError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onRetry(order.idempotencyKey)}
                  disabled={order.status === "syncing" || offline}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {order.status === "failed" ? t("queue.retry") : t("queue.sendNow")}
                </button>
                <button
                  type="button"
                  onClick={() => onDiscard(order.idempotencyKey)}
                  disabled={order.status === "syncing"}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400"
                >
                  {t("queue.discard")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
