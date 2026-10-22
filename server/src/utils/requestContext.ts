import { AsyncLocalStorage } from "async_hooks";

/**
 * Per-request context (issue #481). The requestId middleware opens a context
 * for every request, so code anywhere downstream — services, the logger —
 * can read the correlation ID without it being passed around explicitly.
 */
export interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Runs `fn` with `context` available to everything it calls, sync or async. */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** Correlation ID of the request currently being handled, if any. */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
