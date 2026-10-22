/**
 * auditLog.ts — append-only audit trail for admin actions (issue #539).
 *
 * Writes to the `audit_logs` table (migration 013). The table is immutable at
 * the database level: this module only ever INSERTs and SELECTs, and the
 * table's trigger rejects UPDATE/DELETE/TRUNCATE except for the retention
 * job's purge of rows older than 365 days.
 *
 * Callers that change state inside a transaction should pass their
 * PoolClient so the audit row commits or rolls back with the change itself.
 */

import type { Request } from "express";
import type { QueryResult, QueryResultRow } from "pg";
import pool from "../db";
import logger from "../utils/logger";
import type { AuthenticatedRequest } from "../middleware/authenticate";
import type { AuditAction, AuditTargetType } from "../schemas/admin.schemas";

/** Satisfied by both the Pool and a checked-out PoolClient. */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
}

export type { AuditAction, AuditTargetType };

export interface AuditLogInput {
  actorId: string;
  actorRole?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  occurred_at: string;
  actor_id: string;
  actor_role: string | null;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string;
  before_value: unknown;
  after_value: unknown;
  metadata: Record<string, unknown>;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

function toJson(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

/** Request context stored alongside each entry for forensic correlation. */
export function auditContext(req: Request): Record<string, unknown> {
  const res = req.res;
  return {
    requestId: (res?.locals as { requestId?: string } | undefined)?.requestId ?? null,
    ip: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

/** Actor id and role from an authenticated request. */
export function auditActor(req: Request): { actorId: string; actorRole: string | null } {
  const { sub, role } = (req as AuthenticatedRequest).user;
  return { actorId: sub, actorRole: role ?? null };
}

/**
 * Appends one audit entry. Throws on failure so a transactional caller rolls
 * back the audited change along with it.
 */
export async function recordAuditLog(entry: AuditLogInput, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs
       (actor_id, actor_role, action, target_type, target_id, before_value, after_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)`,
    [
      entry.actorId,
      entry.actorRole ?? null,
      entry.action,
      entry.targetType,
      entry.targetId,
      toJson(entry.before),
      toJson(entry.after),
      JSON.stringify(entry.metadata ?? {}),
    ]
  );
}

/**
 * Appends an audit entry for a change that has already been committed.
 *
 * Never throws: failing the HTTP response would not undo the change, so the
 * full entry is logged at error level instead, where it can be recovered and
 * back-filled.
 */
export async function recordAuditLogAfterCommit(entry: AuditLogInput): Promise<void> {
  try {
    await recordAuditLog(entry);
  } catch (err) {
    logger.error(
      { err: (err as Error).message, auditEntry: entry },
      "[audit] FAILED to persist audit log entry — back-fill required"
    );
  }
}

/** Read-only, filtered, paginated query over the audit trail (newest first). */
export async function listAuditLogs(
  filters: AuditLogFilters,
  db: Queryable = pool
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (filters.actorId) add("actor_id = ?", filters.actorId);
  if (filters.action) add("action = ?", filters.action);
  if (filters.targetType) add("target_type = ?", filters.targetType);
  if (filters.targetId) add("target_id = ?", filters.targetId);
  if (filters.from) add("occurred_at >= ?", filters.from.toISOString());
  if (filters.to) add("occurred_at <= ?", filters.to.toISOString());

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows: entries } = await db.query<AuditLogEntry>(
    `SELECT id, occurred_at, actor_id, actor_role, action, target_type, target_id,
            before_value, after_value, metadata
     FROM audit_logs
     ${where}
     ORDER BY occurred_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, filters.offset]
  );

  const { rows: countRows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_logs ${where}`,
    params
  );

  return { entries, total: parseInt(countRows[0]?.count ?? "0", 10) };
}
