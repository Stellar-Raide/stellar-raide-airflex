/**
 * Minimal monitoring seam (issue #285).
 *
 * There is no first-party monitoring module in the frontend yet, so this file
 * provides a single, no-throw entry point for reporting errors. It always logs
 * locally, and additionally forwards to whatever monitoring service happens to
 * be attached to the global scope (e.g. a Sentry-compatible `Sentry` object or
 * a custom `window.__AIRFLEX_MONITOR__`).
 *
 * Everything here is SSR-safe: it must never touch `window`/`navigator`
 * directly and must never throw, even when no monitoring service is present.
 */

export type MonitoringContext = Record<string, unknown>;

interface MonitoringService {
  captureException?: (error: unknown, context?: MonitoringContext) => void;
}

type MonitoringGlobal = typeof globalThis & {
  __AIRFLEX_MONITOR__?: MonitoringService;
  Sentry?: MonitoringService;
};

/**
 * Resolve the monitoring service, if one has been installed on the global
 * scope. Returns `undefined` when running on the server or when nothing is
 * available.
 */
function getMonitoringService(): MonitoringService | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }

  const root = globalThis as MonitoringGlobal;

  if (typeof root.__AIRFLEX_MONITOR__?.captureException === "function") {
    return root.__AIRFLEX_MONITOR__;
  }

  if (typeof root.Sentry?.captureException === "function") {
    return root.Sentry;
  }

  return undefined;
}

/**
 * Report an error to the console and, when available, to the monitoring
 * service. Guaranteed not to throw.
 *
 * @param error - The error (or thrown value) to report.
 * @param context - Optional structured context (e.g. `{ source: "..." }`).
 */
export function reportError(error: unknown, context?: MonitoringContext): void {
  console.warn("[monitoring] captured error:", error, context ?? "");

  try {
    const service = getMonitoringService();
    service?.captureException?.(error, context);
  } catch (monitoringError) {
    console.error(
      "[monitoring] failed to forward error to monitoring service:",
      monitoringError
    );
  }
}
