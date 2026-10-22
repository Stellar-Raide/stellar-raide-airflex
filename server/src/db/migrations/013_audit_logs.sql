-- Migration 013: audit_logs — immutable trail of state-changing admin actions (issue #539).
--
-- Every admin mutation (dispute resolution, fraud flag review, webhook
-- replay, ...) appends one row recording who did what to which resource,
-- with the resource's state before and after the change.
--
-- Immutability is enforced in the database, not just by the absence of an
-- API route: a trigger rejects every UPDATE and TRUNCATE, and every DELETE
-- except the retention job's purge of rows older than 365 days (see
-- src/jobs/auditLogRetention.ts). That job opts in per transaction with
--   SELECT set_config('stellar-raide-stellar-raide-airflex.audit_retention', 'on', true);
-- so even a compromised admin route issuing raw SQL cannot rewrite history.
--
-- actor_id deliberately has no foreign key to users: ON DELETE SET NULL /
-- CASCADE would mutate audit rows when an account is deleted, which the
-- trigger forbids. The actor's id and role are snapshotted instead.
--
-- Also widens users.role to admit 'super_admin', the only role allowed to
-- read audit logs (GET /api/v1/admin/audit-logs).
--
-- Reverse: down/013_audit_logs.sql

CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actor_id     UUID         NOT NULL,
    actor_role   VARCHAR(16),
    action       VARCHAR(64)  NOT NULL,
    target_type  VARCHAR(32)  NOT NULL,
    target_id    TEXT         NOT NULL,
    before_value JSONB,
    after_value  JSONB,
    -- Request context: request id, client IP, user agent.
    metadata     JSONB        NOT NULL DEFAULT '{}'::jsonb
);

-- Default listing (newest first) and the retention job's range scan.
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at
    ON audit_logs (occurred_at DESC);

-- "What did this admin do?"
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON audit_logs (actor_id, occurred_at DESC);

-- "What happened to this trade / flag / user?"
CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON audit_logs (target_type, target_id, occurred_at DESC);

-- "Every dispute resolution last month."
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON audit_logs (action, occurred_at DESC);

CREATE OR REPLACE FUNCTION audit_logs_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF current_setting('stellar-raide-stellar-raide-airflex.audit_retention', true) = 'on'
           AND OLD.occurred_at < NOW() - INTERVAL '365 days' THEN
            RETURN OLD;
        END IF;
    END IF;

    RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_prevent_mutation();

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_prevent_mutation();

-- users.role gains 'super_admin'. The original CHECK was declared inline in
-- migration 009, so Postgres named it users_role_check.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'));

DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role) WHERE role IN ('admin', 'super_admin');
