-- Reverses migration 011_fraud_flags.sql (run by `pnpm db:migrate:rollback`).

DROP INDEX IF EXISTS idx_fraud_flags_status_flagged_at;
DROP INDEX IF EXISTS idx_fraud_flags_open_user_reason;
DROP TABLE IF EXISTS fraud_flags;
