-- explain_trade_offers_status_created_at.sql
--
-- Manual check that the list-trade queries use
-- idx_trade_offers_status_created_at (migration 012, issue #543).
--
--   psql "$DATABASE_URL" -f server/sql/explain_trade_offers_status_created_at.sql
--
-- Expected: an "Index Scan using idx_trade_offers_status_created_at" node with
-- no separate Sort node above it. On a near-empty table the planner may still
-- pick a Seq Scan because it is cheaper; seed a few thousand rows (or run
-- `SET enable_seqscan = off;` for the session) to see the index plan.
--
-- Read-only: wraps everything in a transaction that is rolled back.

BEGIN;

ANALYZE trade_offers;

-- 1. Public marketplace list (routes/trades.ts, GET /api/v1/trades)
EXPLAIN (ANALYZE, BUFFERS, COSTS)
SELECT t.*
  FROM trade_offers t
 WHERE t.status = 'Active'
   AND t.expires_at > NOW()
 ORDER BY t.created_at DESC
 LIMIT 20 OFFSET 0;

-- 2. Admin list filtered by status (routes/admin.ts, GET /api/v1/admin/trades)
EXPLAIN (ANALYZE, BUFFERS, COSTS)
SELECT *
  FROM trade_offers
 WHERE status = 'Disputed'
 ORDER BY created_at DESC
 LIMIT 20 OFFSET 0;

ROLLBACK;
