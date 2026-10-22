-- Reverses migration 014_data_export_requests.sql (run by `pnpm db:migrate:rollback`).

DROP INDEX IF EXISTS idx_data_export_requests_expiry;
DROP INDEX IF EXISTS idx_data_export_requests_user;
DROP TABLE IF EXISTS data_export_requests;
