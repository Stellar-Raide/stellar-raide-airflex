-- Migration 011: idempotency keys for wallet withdrawals (issue #479).
--
-- POST /api/v1/wallet/withdraw requires an `Idempotency-Key` header. The key
-- is recorded here in the same transaction that debits `wallets.fiat_balance`
-- and inserts the `withdrawals` row, together with the response that was sent.
-- A retry with the same key gets that stored response back and never debits
-- the wallet again:
--
--   * The key row is inserted first, before the wallet is touched. The
--     primary key on (user_id, idempotency_key) makes a concurrent retry
--     block on that INSERT until the first request commits, after which it
--     fails with a unique violation and the stored response is returned
--     instead of performing a second debit.
--   * The response columns are filled in before the same transaction
--     commits, so a committed row always has them.
--   * If the first request's transaction rolls back, its key row goes with
--     it, so a retry runs the withdrawal as if for the first time.
--
-- Keys are scoped per user, so one user can never replay another's response.

CREATE TABLE IF NOT EXISTS withdrawal_idempotency_keys (
    user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key     VARCHAR(128)  NOT NULL,

    -- SHA-256 of the normalised request body. A retry that reuses the key
    -- with a different body is rejected rather than answered with the
    -- response to a request it did not make.
    request_fingerprint CHAR(64)      NOT NULL,

    withdrawal_id       UUID          REFERENCES withdrawals(id) ON DELETE SET NULL,

    -- The response returned for the first request with this key. NULL only
    -- inside the transaction that created the row.
    response_status     SMALLINT,
    response_body       JSONB,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, idempotency_key)
);

-- Supports purging old keys, e.g. DELETE ... WHERE created_at < NOW() - INTERVAL '30 days'.
CREATE INDEX IF NOT EXISTS idx_withdrawal_idempotency_keys_created
    ON withdrawal_idempotency_keys (created_at);
