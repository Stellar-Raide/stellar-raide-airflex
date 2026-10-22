-- Reverses migration 013_audit_logs.sql (run by `pnpm db:migrate:rollback`).
--
-- Demotes any super_admin to admin first so the narrower role CHECK can be
-- restored.

UPDATE users SET role = 'admin' WHERE role = 'super_admin';

DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role) WHERE role = 'admin';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
DROP FUNCTION IF EXISTS audit_logs_prevent_mutation();
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_target;
DROP INDEX IF EXISTS idx_audit_logs_actor;
DROP INDEX IF EXISTS idx_audit_logs_occurred_at;
DROP TABLE IF EXISTS audit_logs;
