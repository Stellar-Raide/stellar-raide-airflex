/**
 * admin.ts — Admin-only API routes.
 *
 * All routes require a valid Bearer JWT. In the MVP, admin access is checked
 * by looking for a role = 'admin' column on the users row.  The authenticate
 * middleware validates the JWT; the requireAdmin middleware below validates
 * the role.
 */

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/authenticate";
import { QueueService } from "../jobs";
import { SseEmitter } from "../services/sseEmitter";
import pool from "../db";

const router = Router();

// ---------------------------------------------------------------------------
// requireAdmin middleware
// ---------------------------------------------------------------------------

/**
 * Ensures the authenticated user has role = 'admin' in the users table.
 * Returns 403 if the user is not an admin.
 */
async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { sub: userId } = (req as AuthenticatedRequest).user;

  const { rows } = await pool.query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  if (!rows.length || rows[0]?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/queues  (admin only)
// ---------------------------------------------------------------------------

/**
 * Returns queue depths and recent failure counts for all background job queues.
 *
 * Response shape:
 * {
 *   queues: Array<{
 *     name: string
 *     waiting: number
 *     active: number
 *     completed: number
 *     failed: number
 *     delayed: number
 *     recentFailures: Array<{ jobId, data, failedReason, timestamp }>
 *   }>
 * }
 */
router.get(
  "/queues",
  authenticate,
  requireAdmin,
  async (_req, res) => {
    const queues = QueueService.getStats();
    res.status(200).json({ queues });
  }
);

// ---------------------------------------------------------------------------
// Dashboard endpoints (Issue #23)
// ---------------------------------------------------------------------------

/**
 * `GET /api/v1/admin/metrics`
 *
 * Summary counts for the dashboard panel. One round trip rather than five
 * separate count queries - the dashboard renders them together, so fetching
 * them together keeps the numbers mutually consistent. Five queries could
 * each land on a different moment and show, say, more completed trades than
 * total.
 */
router.get(
  "/metrics",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const { rows } = await pool.query<{
      total_users: string;
      open_trades: string;
      locked_trades: string;
      completed_trades: string;
      disputed_trades: string;
      total_volume: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM users)::text                                   AS total_users,
         (SELECT COUNT(*) FROM trades WHERE status = 'open')::text            AS open_trades,
         (SELECT COUNT(*) FROM trades WHERE status = 'locked')::text          AS locked_trades,
         (SELECT COUNT(*) FROM trades WHERE status = 'completed')::text       AS completed_trades,
         (SELECT COUNT(*) FROM trades WHERE status = 'disputed')::text        AS disputed_trades,
         (SELECT COALESCE(SUM(amount), 0) FROM trades
           WHERE status = 'completed')::text                                  AS total_volume`
    );

    const row = rows[0];
    res.status(200).json({
      totalUsers: Number(row.total_users),
      openTrades: Number(row.open_trades),
      lockedTrades: Number(row.locked_trades),
      completedTrades: Number(row.completed_trades),
      disputedTrades: Number(row.disputed_trades),
      totalVolume: Number(row.total_volume),
    });
  }
);

/**
 * `GET /api/v1/admin/trades?status=disputed`
 *
 * Trades filtered by status, newest first. Capped at 100 - an admin table is
 * for triage, and an uncapped query on a growing table is a way to stall the
 * connection pool.
 */
router.get(
  "/trades",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const status = typeof req.query["status"] === "string" ? req.query["status"] : null;

    const { rows } = await pool.query(
      `SELECT t.id, t.status, t.amount, t.created_at,
              buyer.phone  AS buyer_phone,
              seller.phone AS seller_phone
       FROM trades t
       LEFT JOIN users buyer  ON buyer.id  = t.buyer_id
       LEFT JOIN users seller ON seller.id = t.seller_id
       WHERE ($1::text IS NULL OR t.status = $1::text)
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [status]
    );

    res.status(200).json({ trades: rows });
  }
);

/**
 * `POST /api/v1/admin/trades/:id/resolve`
 *
 * Settle a disputed trade one way or the other.
 *
 * Guarded on `status = 'disputed'` **inside the UPDATE**, not by a prior
 * SELECT. Two admins opening the same dispute is entirely normal, and a
 * check-then-update would let both resolutions apply - the second silently
 * overwriting the first, after both have already moved money. Making the
 * database arbitrate means the loser gets a 409 and can see what happened.
 */
router.post(
  "/trades/:id/resolve",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const tradeId = req.params["id"];
    const resolution = (req.body as { resolution?: string } | undefined)?.resolution;

    if (resolution !== "release_to_seller" && resolution !== "refund_to_buyer") {
      res.status(422).json({
        error: "resolution must be 'release_to_seller' or 'refund_to_buyer'",
      });
      return;
    }

    const newStatus = resolution === "release_to_seller" ? "completed" : "refunded";

    const { rows } = await pool.query<{
      id: string;
      status: string;
      buyer_id: string;
      seller_id: string;
    }>(
      `UPDATE trades
       SET status = $2,
           resolved_by = $3,
           resolved_at = NOW()
       WHERE id = $1 AND status = 'disputed'
       RETURNING id, status, buyer_id, seller_id`,
      [tradeId, newStatus, (req as any).user?.userId ?? (req as any).user?.sub ?? null]
    );

    if (rows.length === 0) {
      // Either the trade does not exist or someone already resolved it. Both
      // mean "your action did not apply", which is what the admin needs to know.
      res.status(409).json({
        error: "Trade not found or no longer disputed",
      });
      return;
    }

    const trade = rows[0];

    // Tell both parties immediately - this is a status change they have been
    // waiting on, and it is exactly what the notification hook (#24) consumes.
    SseEmitter.emit([trade.buyer_id, trade.seller_id], {
      type: "trade_status",
      tradeId: trade.id,
      newStatus: trade.status,
    });

    res.status(200).json({ trade });
  }
);

/**
 * `GET /api/v1/admin/users?phone=...`
 *
 * Look up one user with their wallet and trade history.
 *
 * Requires an exact phone match rather than offering a wildcard search: this
 * endpoint returns balances and full trade history, and a prefix search over
 * that is a bulk-export tool for anyone who reaches an admin token.
 */
router.get(
  "/users",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const phone = typeof req.query["phone"] === "string" ? req.query["phone"] : null;

    if (!phone) {
      res.status(422).json({ error: "phone query parameter is required" });
      return;
    }

    const { rows: users } = await pool.query(
      `SELECT u.id, u.phone, u.role, u.created_at,
              w.fiat_balance, w.stellar_public_key
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.phone = $1
       LIMIT 1`,
      [phone]
    );

    if (users.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { rows: trades } = await pool.query(
      `SELECT id, status, amount, created_at
       FROM trades
       WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [users[0].id]
    );

    res.status(200).json({ user: users[0], trades });
  }
);

router.patch("/users/:id", authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not Implemented" });
});

export default router;
