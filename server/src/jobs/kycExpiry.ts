import pool from "../db";
import logger from "../utils/logger";
import { NotificationService } from "../services/notifications";

/** Scan KYC records and notify each affected user once per UTC day. */
export async function checkKycDocumentExpiry(): Promise<{ processed: number; notified: number }> {
  const days = Number.parseInt(process.env.KYC_EXPIRY_WARNING_DAYS ?? "30", 10) || 30;
  const { rows } = await pool.query<{ user_id: string; expiry_date: string }>(
    `SELECT id AS user_id, kyc_document_expiry::text AS expiry_date
       FROM users
      WHERE kyc_document_expiry IS NOT NULL
        AND kyc_document_expiry <= CURRENT_DATE + ($1::int * INTERVAL '1 day')`, [days]
  );
  let notified = 0;
  for (const row of rows) {
    const inserted = await pool.query(
      `INSERT INTO kyc_expiry_notifications (user_id, notification_date)
       VALUES ($1, CURRENT_DATE) ON CONFLICT (user_id, notification_date) DO NOTHING`, [row.user_id]
    );
    if (inserted.rowCount) {
      await NotificationService.send(row.user_id, "KYC_DOCUMENT_EXPIRING", { expiryDate: row.expiry_date });
      notified++;
    }
  }
  if (rows.length) await NotificationService.sendToAdmins("KYC_ADMIN_SUMMARY", { count: rows.length });
  logger.info({ processed: rows.length, notified }, "[kyc-expiry] scan complete");
  return { processed: rows.length, notified };
}
