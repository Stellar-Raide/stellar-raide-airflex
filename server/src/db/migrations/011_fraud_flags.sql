-- Migration 011: fraud_flags — accounts flagged for admin review (issue #491).
--
-- Written by FraudDetectionService.flagAccount when a rule trips (e.g. too
-- many failed trades inside the rolling window). Rows are never deleted by
-- the application: an admin moves them from 'open' to 'reviewed' or
-- 'dismissed', so the table doubles as the audit trail of why and when an
-- account was flagged and who looked at it.
--
-- Reverse: down/011_fraud_flags.sql

CREATE TABLE IF NOT EXISTS fraud_flags (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason_code  VARCHAR(64)  NOT NULL,
    details      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status       VARCHAR(16)  NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'reviewed', 'dismissed')),
    flagged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ,
    review_note  TEXT
);

-- At most one open flag per user and reason: re-tripping a rule while a flag
-- is still awaiting review is a no-op (INSERT ... ON CONFLICT DO NOTHING).
CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_flags_open_user_reason
    ON fraud_flags (user_id, reason_code)
    WHERE status = 'open';

-- Admin review queue: GET /api/v1/admin/fraud-flags?status=open
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status_flagged_at
    ON fraud_flags (status, flagged_at DESC);
