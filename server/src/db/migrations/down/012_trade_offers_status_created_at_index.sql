-- Reverses migration 012_trade_offers_status_created_at_index.sql
-- (run by `pnpm db:migrate:rollback`).

DROP INDEX IF EXISTS idx_trade_offers_status_created_at;
