import { Response } from "express";

/**
 * sseEmitter.ts — Lightweight Server-Sent Events (SSE) hub.
 *
 * Each authenticated client opens GET /api/v1/events and receives a persistent
 * text/event-stream connection. The server pushes trade status change events
 * without needing the client to poll.
 *
 * SSE is chosen over WebSockets because:
 *  - It is unidirectional (server → client), which matches our use-case exactly.
 *  - It works over plain HTTP/1.1 with automatic reconnection built into browsers.
 *  - No extra library is needed; Express can write chunked responses natively.
 *
 * Usage
 * -----
 *  // Register a client connection (called from the /api/v1/events route):
 *  SseEmitter.addClient(userId, res, req.header("last-event-id"));
 *
 *  // Push an event to specific users (called from tradeVerification):
 *  SseEmitter.emit(
 *    [sellerId, buyerId],
 *    { type: "trade_completed", tradeId: "...", status: "Completed" }
 *  );
 *
 *  // Push a broadcast admin alert:
 *  SseEmitter.emitAll({ type: "admin_alert", message: "..." });
 *
 * Heartbeat
 * ---------
 * While a client is connected the server writes an SSE comment line
 * (`: heartbeat`) every 30 seconds. Comment lines are ignored by EventSource
 * but keep the TCP connection alive through proxies and load balancers that
 * would otherwise close idle connections.
 *
 * Replay (Last-Event-ID)
 * ----------------------
 * Every emitted event carries a monotonically increasing `id:` field. The most
 * recent REPLAY_BUFFER_SIZE events are kept in memory; when a client reconnects
 * with a `Last-Event-ID` header (EventSource does this automatically), any
 * buffered events addressed to that user with a higher id are replayed before
 * live delivery resumes.
 *
 * Slow consumers
 * --------------
 * A client that stops reading lets Node buffer writes in memory. Once a
 * connection has more than MAX_BUFFERED_BYTES queued it is dropped, so one
 * stalled client can neither exhaust memory nor delay delivery to others. The
 * client reconnects and recovers missed events through Last-Event-ID.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to write a keep-alive comment line to each connected client. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** How many recent events are retained for Last-Event-ID replay. */
export const REPLAY_BUFFER_SIZE = 500;

/** Queued-but-unsent bytes after which a connection is considered stalled. */
export const MAX_BUFFERED_BYTES = 1024 * 1024;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

interface SseClient {
  userId: string;
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
}

interface BufferedEvent {
  id: number;
  /** Recipient user IDs, or null for a broadcast to everyone. */
  userIds: string[] | null;
  event: SseEvent;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** All currently connected SSE clients. */
const clients: SseClient[] = [];

/** Ring of the most recent events, oldest first. */
const replayBuffer: BufferedEvent[] = [];

/** Id of the last emitted event. */
let lastEventId = 0;

/**
 * Registers an Express Response as an SSE stream for the given user.
 *
 * Sets the required headers and sends an initial "connected" event so the
 * client knows the stream is alive, then replays any buffered events newer
 * than `lastSeenEventId`. Also removes the client from the registry when the
 * connection closes (browser tab closed, network drop, etc.).
 */
function addClient(userId: string, res: Response, lastSeenEventId?: string): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx proxy buffering
  res.flushHeaders();

  // Send an immediate confirmation so the client knows it is connected
  writeEvent(res, { type: "connected", userId });

  replayMissed(userId, res, lastSeenEventId);

  // Heartbeat: a comment line every 30s prevents proxies from closing idle
  // connections. Per-client interval so it stops when this connection closes.
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
      if (typeof (res as Response & { flush?: () => void }).flush === "function") {
        (res as Response & { flush: () => void }).flush();
      }
    } catch {
      // Client disconnected mid-write — the "close" handler will clean up
    }
  }, HEARTBEAT_INTERVAL_MS);
  // Don't keep the process alive just for an open SSE stream
  heartbeat.unref?.();

  const client: SseClient = { userId, res, heartbeat };
  clients.push(client);

  // Clean up when the client disconnects
  res.on("close", () => removeClient(client));
}

/**
 * Emits an SSE event to all connections belonging to the specified user IDs.
 * Safe to call with an empty array — it simply no-ops.
 */
function emit(userIds: string[], event: SseEvent): void {
  if (userIds.length === 0) return;
  const id = remember([...userIds], event);
  // Iterate a snapshot: stalled clients may be removed mid-loop
  for (const client of [...clients]) {
    if (userIds.includes(client.userId)) {
      deliver(client, event, id);
    }
  }
}

/**
 * Emits an SSE event to ALL currently connected clients.
 * Used for admin alerts and system-wide broadcasts.
 */
function emitAll(event: SseEvent): void {
  const id = remember(null, event);
  for (const client of [...clients]) {
    deliver(client, event, id);
  }
}

/** Returns the count of currently open SSE connections (useful for health checks). */
function connectionCount(): number {
  return clients.length;
}

/**
 * Ends every open stream and releases its heartbeat timer. Intended for
 * graceful shutdown; clients reconnect (with Last-Event-ID) once the server
 * is back.
 */
function closeAll(): void {
  for (const client of [...clients]) {
    removeClient(client);
    try {
      client.res.end();
    } catch {
      // Already closed
    }
  }
}

/** Test helper: closes all clients and forgets buffered events and ids. */
function reset(): void {
  closeAll();
  replayBuffer.length = 0;
  lastEventId = 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Stores an event in the replay buffer and returns its assigned id. */
function remember(userIds: string[] | null, event: SseEvent): number {
  lastEventId += 1;
  replayBuffer.push({ id: lastEventId, userIds, event });
  if (replayBuffer.length > REPLAY_BUFFER_SIZE) {
    replayBuffer.splice(0, replayBuffer.length - REPLAY_BUFFER_SIZE);
  }
  return lastEventId;
}

/** Writes buffered events newer than `lastSeenEventId` that target `userId`. */
function replayMissed(userId: string, res: Response, lastSeenEventId?: string): void {
  // Ignore absent or malformed ids rather than replaying the whole buffer
  if (lastSeenEventId === undefined || !/^\d+$/.test(lastSeenEventId)) return;
  const since = Number(lastSeenEventId);

  for (const entry of replayBuffer) {
    if (entry.id <= since) continue;
    if (entry.userIds === null || entry.userIds.includes(userId)) {
      writeEvent(res, entry.event, entry.id);
    }
  }
}

/** Writes an event to one client, dropping the client if it has stalled. */
function deliver(client: SseClient, event: SseEvent, id: number): void {
  writeEvent(client.res, event, id);
  if ((client.res.writableLength ?? 0) > MAX_BUFFERED_BYTES) {
    removeClient(client);
    try {
      client.res.destroy();
    } catch {
      // Already closed
    }
  }
}

/** Unregisters a client and stops its heartbeat. Idempotent. */
function removeClient(client: SseClient): void {
  clearInterval(client.heartbeat);
  const idx = clients.indexOf(client);
  if (idx !== -1) clients.splice(idx, 1);
}

/**
 * Writes a single SSE message frame to the given response stream.
 *
 * SSE wire format:
 *   id: <id>\n        (omitted for the connected handshake)
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 */
function writeEvent(res: Response, event: SseEvent, id?: number): void {
  // Writing to an ended stream emits an error; skip connections that are
  // already gone and let the "close" handler unregister them.
  if (res.writableEnded || res.destroyed) return;
  try {
    if (id !== undefined) res.write(`id: ${id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    // Express will flush automatically for chunked encoding, but calling
    // flush() explicitly ensures delivery when response compression is active.
    if (typeof (res as Response & { flush?: () => void }).flush === "function") {
      (res as Response & { flush: () => void }).flush();
    }
  } catch {
    // Client disconnected mid-write — the "close" handler will clean up
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const SseEmitter = {
  addClient,
  emit,
  emitAll,
  connectionCount,
  closeAll,
  reset,
} as const;
