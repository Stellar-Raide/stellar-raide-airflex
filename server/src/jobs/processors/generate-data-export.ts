/**
 * generate-data-export.ts — builds a user's GDPR data export (issue #539).
 *
 * Enqueued by GET /api/v1/users/me/export. Assembles the export from a
 * consistent REPEATABLE READ snapshot, encrypts it with ENCRYPTION_KEY,
 * stores it on the data_export_requests row as 'ready', and notifies the
 * user by SMS. After the final retry fails the row is marked 'failed', which
 * frees the user's 24 h quota so they can request again.
 *
 * Also exports purgeExpiredDataExports(), run daily by jobs/cron.ts.
 */

import type { Job } from "../queue";
import pool from "../../db";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { buildUserDataExport, exportRetentionHours, sha256Hex } from "../../services/dataExport";
import { NotificationService } from "../../services/notifications";

export interface GenerateDataExportData {
  exportId: string;
  userId: string;
}

export async function generateDataExportProcessor(job: Job<GenerateDataExportData>): Promise<void> {
  const { exportId, userId } = job.data;

  const { rowCount } = await pool.query(
    `UPDATE data_export_requests SET status = 'processing'
     WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'processing')`,
    [exportId, userId]
  );
  if (!rowCount) {
    logger.warn({ exportId }, "[data-export] Request not pending — skipping");
    return;
  }

  try {
    const client = await pool.connect();
    let json: string;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const payload = await buildUserDataExport(client, userId, exportId);
      await client.query("COMMIT");
      json = JSON.stringify(payload, null, 2);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const retentionHours = exportRetentionHours();
    await pool.query(
      `UPDATE data_export_requests
       SET status = 'ready',
           payload_encrypted = $2,
           payload_sha256 = $3,
           size_bytes = $4,
           completed_at = NOW(),
           expires_at = NOW() + make_interval(hours => $5),
           failure_reason = NULL
       WHERE id = $1`,
      [exportId, encrypt(json), sha256Hex(json), Buffer.byteLength(json, "utf8"), retentionHours]
    );

    logger.info({ exportId, bytes: Buffer.byteLength(json, "utf8") }, "[data-export] Export ready");

    await NotificationService.send(userId, "DATA_EXPORT_READY", {
      days: Math.max(1, Math.round(retentionHours / 24)),
    });
  } catch (err) {
    if (job.attempts >= job.maxAttempts) {
      await pool.query(
        `UPDATE data_export_requests SET status = 'failed', failure_reason = $2 WHERE id = $1`,
        [exportId, (err as Error).message.slice(0, 500)]
      );
    }
    throw err;
  }
}

/**
 * Drops the encrypted payload of exports past their expiry and marks them
 * 'expired'. The row is kept (without personal data) for the rate limit and
 * request history. Returns the number of exports expired.
 */
export async function purgeExpiredDataExports(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE data_export_requests
     SET status = 'expired', payload_encrypted = NULL
     WHERE status = 'ready' AND expires_at < NOW()`
  );
  const expired = rowCount ?? 0;
  logger.info({ expired }, "[data-export] Expired data exports purged");
  return expired;
}
