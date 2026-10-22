-- Migration 014: data_export_requests — GDPR data portability exports (issue #539).
--
-- GET /api/v1/users/me/export inserts a 'pending' row and enqueues the
-- generate-data-export job, which assembles the user's data, encrypts it with
-- AES-256-GCM (ENCRYPTION_KEY) and stores the ciphertext here as 'ready'.
-- The user downloads it through a short-lived HMAC-signed URL.
--
-- Lifecycle: pending → processing → ready → expired   (or → failed)
-- The daily data-export-cleanup task nulls payload_encrypted and marks the
-- row 'expired' once expires_at passes. The row itself is kept (without any
-- personal data) so the one-export-per-24h limit and request history survive.
--
-- Reverse: down/014_data_export_requests.sql

CREATE TABLE IF NOT EXISTS data_export_requests (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status            VARCHAR(16)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
    format            VARCHAR(8)   NOT NULL DEFAULT 'json'
                      CHECK (format IN ('json')),
    payload_encrypted TEXT,
    payload_sha256    CHAR(64),
    size_bytes        INTEGER,
    requested_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    downloaded_at     TIMESTAMPTZ,
    failure_reason    TEXT
);

-- Rate-limit lookup (latest request per user) and status listing.
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user
    ON data_export_requests (user_id, requested_at DESC);

-- Cleanup scan for expired ready exports.
CREATE INDEX IF NOT EXISTS idx_data_export_requests_expiry
    ON data_export_requests (expires_at)
    WHERE status = 'ready';
