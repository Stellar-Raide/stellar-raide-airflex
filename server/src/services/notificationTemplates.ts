/**
 * notificationTemplates.ts — SMS/email message templates for the
 * NotificationService.
 *
 * Templates live here as plain string constants so route handlers and services
 * never inline message text. The NotificationService renders these constants
 * with the event payload via `renderTemplate` / `renderNotification`.
 *
 * Placeholders are expressed as `{name}` tokens and are substituted from the
 * payload passed to `NotificationService.send(...)`. Rendering is strict: a
 * placeholder without a matching payload value throws a
 * `MissingTemplateVariableError` instead of leaking a raw `{name}` token into
 * a message a user will read.
 */

export const NOTIFICATION_TEMPLATES = {
  /**
   * Sent to the seller when a buyer locks a trade (deposits funds into escrow).
   */
  TRADE_LOCKED:
    "AirFlex: Your trade {tradeId} has been locked. " +
    "The buyer's funds are secured in escrow. Deliver the airtime/data now.",

  /**
   * Sent to both parties when escrow is released after delivery confirmation.
   */
  TRADE_COMPLETED:
    "AirFlex: Payment released! Trade {tradeId} is now complete. " +
    "Funds have been transferred to the seller's wallet.",

  /**
   * Sent to both parties and all admins when a trade is escalated to a dispute.
   */
  DISPUTE_FILED:
    "AirFlex: Trade {tradeId} has been escalated to a dispute. " +
    "Our team will review it and reach out within 24 hours.",

  /**
   * Sent to the user when a withdrawal request is processed.
   */
  WITHDRAWAL_PROCESSED:
    "AirFlex: Your withdrawal of {amount} has been processed and will arrive " +
    "in your bank account shortly.",

  /**
   * Sent to the user when a withdrawal request fails.
   */
  WITHDRAWAL_FAILED:
    "AirFlex: Your withdrawal of {amount} has failed. {reason}. " +
    "Your wallet balance has been restored.",

  /** Sent to admins when a Paystack webhook permanently fails processing (#118). */
  WEBHOOK_FAILED:
    "AirFlex admin: Paystack webhook {eventId} ({eventType}) failed after retries. " +
    "Inspect /api/admin/webhooks and replay if needed.",
} as const;

export type NotificationTemplateKey = keyof typeof NOTIFICATION_TEMPLATES;

// ---------------------------------------------------------------------------
// Email templates (HTML + plain-text fallback)
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  subject: string;
  /** HTML body. Payload values are HTML-escaped before substitution. */
  html: string;
  /** Plain-text fallback for clients that do not render HTML. */
  text: string;
}

/**
 * Every SMS template has an email counterpart. Each HTML body must use exactly
 * the same placeholders as its plain-text fallback so a payload that renders
 * one always renders the other.
 */
export const NOTIFICATION_EMAIL_TEMPLATES: Record<
  NotificationTemplateKey,
  EmailTemplate
> = {
  TRADE_LOCKED: {
    subject: "AirFlex: Trade {tradeId} locked",
    html:
      "<p>Your trade <strong>{tradeId}</strong> has been locked.</p>" +
      "<p>The buyer's funds are secured in escrow. Deliver the airtime/data now.</p>",
    text:
      "Your trade {tradeId} has been locked.\n\n" +
      "The buyer's funds are secured in escrow. Deliver the airtime/data now.",
  },

  TRADE_COMPLETED: {
    subject: "AirFlex: Trade {tradeId} complete",
    html:
      "<p>Payment released! Trade <strong>{tradeId}</strong> is now complete.</p>" +
      "<p>Funds have been transferred to the seller's wallet.</p>",
    text:
      "Payment released! Trade {tradeId} is now complete.\n\n" +
      "Funds have been transferred to the seller's wallet.",
  },

  DISPUTE_FILED: {
    subject: "AirFlex: Trade {tradeId} disputed",
    html:
      "<p>Trade <strong>{tradeId}</strong> has been escalated to a dispute.</p>" +
      "<p>Our team will review it and reach out within 24 hours.</p>",
    text:
      "Trade {tradeId} has been escalated to a dispute.\n\n" +
      "Our team will review it and reach out within 24 hours.",
  },

  WITHDRAWAL_PROCESSED: {
    subject: "AirFlex: Withdrawal processed",
    html:
      "<p>Your withdrawal of <strong>{amount}</strong> has been processed.</p>" +
      "<p>It will arrive in your bank account shortly.</p>",
    text:
      "Your withdrawal of {amount} has been processed.\n\n" +
      "It will arrive in your bank account shortly.",
  },

  WITHDRAWAL_FAILED: {
    subject: "AirFlex: Withdrawal failed",
    html:
      "<p>Your withdrawal of <strong>{amount}</strong> has failed.</p>" +
      "<p>Reason: <em>{reason}</em></p>" +
      "<p>Your wallet balance has been restored.</p>",
    text:
      "Your withdrawal of {amount} has failed.\n\n" +
      "Reason: {reason}\n\n" +
      "Your wallet balance has been restored.",
  },

  WEBHOOK_FAILED: {
    subject: "AirFlex admin: Paystack webhook {eventId} failed",
    html:
      "<p>Paystack webhook <code>{eventId}</code> (<code>{eventType}</code>) " +
      "failed after retries.</p>" +
      "<p>Inspect <a href=\"/api/admin/webhooks\">/api/admin/webhooks</a> " +
      "and replay if needed.</p>",
    text:
      "Paystack webhook {eventId} ({eventType}) failed after retries.\n\n" +
      "Inspect /api/admin/webhooks and replay if needed.",
  },
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export type TemplatePayload = Record<string, string | number>;

export interface RenderedNotification {
  sms: string;
  subject: string;
  html: string;
  text: string;
}

/** Thrown when a template references a placeholder the payload doesn't supply. */
export class MissingTemplateVariableError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing template variable(s): ${missing.join(", ")}`);
    this.name = "MissingTemplateVariableError";
  }
}

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes a value for safe interpolation into HTML text or attributes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

/** Returns the unique placeholder names referenced by a template, in order. */
export function extractPlaceholders(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    names.add(match[1]!);
  }
  return [...names];
}

/** Returns every placeholder a notification needs across all of its variants. */
export function requiredVariables(key: NotificationTemplateKey): string[] {
  const email = NOTIFICATION_EMAIL_TEMPLATES[key];
  return extractPlaceholders(
    [NOTIFICATION_TEMPLATES[key], email.subject, email.html, email.text].join("\n")
  );
}

/** Names with no usable value: undefined, null, or an empty/whitespace-only string. */
function findMissing(names: string[], payload: TemplatePayload): string[] {
  return names.filter((name) => {
    const value = payload[name] as string | number | null | undefined;
    return value === undefined || value === null || String(value).trim() === "";
  });
}

/**
 * Substitutes `{name}` placeholders in a template with payload values.
 *
 * Throws `MissingTemplateVariableError` listing every placeholder that has no
 * value (undefined, null, or an empty/whitespace-only string). Extra payload
 * keys are ignored. Pass `escape` to transform each value before substitution
 * (e.g. `escapeHtml` for HTML bodies).
 */
export function renderTemplate(
  template: string,
  payload: TemplatePayload,
  escape: (value: string) => string = (value) => value
): string {
  const missing = findMissing(extractPlaceholders(template), payload);
  if (missing.length > 0) {
    throw new MissingTemplateVariableError(missing);
  }

  return template.replace(PLACEHOLDER, (_token, name: string) =>
    escape(String(payload[name]))
  );
}

/** Renders every variant (SMS, email subject, HTML body, plain text) of a notification. */
export function renderNotification(
  key: NotificationTemplateKey,
  payload: TemplatePayload
): RenderedNotification {
  const email = NOTIFICATION_EMAIL_TEMPLATES[key];
  if (!email) {
    throw new Error(`Unknown notification template: ${String(key)}`);
  }

  const missing = findMissing(requiredVariables(key), payload);
  if (missing.length > 0) {
    throw new MissingTemplateVariableError(missing);
  }

  return {
    sms: renderTemplate(NOTIFICATION_TEMPLATES[key], payload),
    subject: renderTemplate(email.subject, payload),
    html: renderTemplate(email.html, payload, escapeHtml),
    text: renderTemplate(email.text, payload),
  };
}
