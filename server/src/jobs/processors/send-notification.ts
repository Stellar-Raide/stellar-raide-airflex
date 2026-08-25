/**
 * send-notification processor
 *
 * Dispatches SMS notifications via the Termii API. Used for any asynchronous
 * notification that doesn't need to block the HTTP request — e.g. trade status
 * updates, escrow confirmations, admin alerts.
 *
 * Job data shape: SendNotificationData
 */

import type { Job } from "../queue";
import logger from "../../utils/logger";

export type NotificationType =
  | "trade_locked"
  | "trade_completed"
  | "trade_cancelled"
  | "trade_disputed"
  | "deletion_scheduled"
  | "wallet_funded"
  | "custom";

export interface SendNotificationData {
  /** Destination phone number in E.164 format */
  phone: string;
  /** Notification type — used to select the message template */
  type: NotificationType;
  /** Template variables merged into the message text */
  vars?: Record<string, string>;
  /** Override: send this exact message instead of a template */
  message?: string;
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

const TEMPLATES: Record<NotificationType, (vars: Record<string, string>) => string> = {
  trade_locked: (v) =>
    `AirFlex: Your trade (${v["tradeId"] ?? "N/A"}) has been locked. ` +
    `The buyer's funds are secured in escrow. Deliver the airtime/data now.`,

  trade_completed: (v) =>
    `AirFlex: Payment released! Trade (${v["tradeId"] ?? "N/A"}) is now complete. ` +
    `Funds have been transferred to your wallet.`,

  trade_cancelled: (v) =>
    `AirFlex: Trade (${v["tradeId"] ?? "N/A"}) has been cancelled. ` +
    `Any locked funds will be refunded.`,

  trade_disputed: (v) =>
    `AirFlex: Trade (${v["tradeId"] ?? "N/A"}) has been escalated to a dispute. ` +
    `Our team will review and reach out within 24 hours.`,

  deletion_scheduled: (v) =>
    `AirFlex: Your account deletion has been scheduled for ${v["date"] ?? "30 days from now"}. ` +
    `To cancel, visit the app or contact support.`,

  wallet_funded: (_v) =>
    `AirFlex: Your Stellar wallet has been funded and is ready to use.`,

  custom: (v) => v["message"] ?? "AirFlex notification.",
};

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

/**
 * Processor — called by QueueService when a send-notification job is dequeued.
 *
 * Sends the notification via Termii plain SMS. Throws on API error so the
 * QueueService retry policy applies (up to 3 attempts with back-off).
 */
export async function sendNotificationProcessor(
  job: Job<SendNotificationData>
): Promise<void> {
  const { phone, type, vars = {}, message: override } = job.data;

  const apiKey = process.env["TERMII_API_KEY"];
  if (!apiKey) {
    throw new Error("TERMII_API_KEY is not set");
  }

  const text = override ?? TEMPLATES[type](vars);

  logger.debug({ jobId: job.id, phone, type }, "[send-notification] Dispatching SMS");

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      api_key: apiKey,
      to:      phone,
      from:    "AirFlex",
      sms:     text,
      type:    "plain",
      channel: "generic",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Termii SMS API error ${res.status}: ${body}`);
  }

  logger.info({ jobId: job.id, phone, type }, "[send-notification] SMS dispatched");
}
