/**
 * fund-stellar-account processor
 *
 * Funds a newly-created Stellar wallet via Friendbot (testnet) or a platform
 * hot-wallet transfer (mainnet). Triggered after a user's wallet is provisioned
 * during the OTP verify flow.
 *
 * Job data shape: FundStellarAccountData
 */

import type { Job } from "../queue";
import { generateAndFundWallet } from "../../services/stellar";
import pool from "../../db";
import { v4 as uuidv4 } from "uuid";
import logger from "../../utils/logger";

export interface FundStellarAccountData {
  /** AirFlex user UUID */
  userId: string;
}

/**
 * Processor — called by QueueService when a fund-stellar-account job is dequeued.
 *
 * Steps:
 *  1. Check whether the user already has a funded wallet (idempotent guard).
 *  2. Generate a fresh keypair and fund via Friendbot.
 *  3. Persist the wallet row (upsert) and mirror the public key on the users row.
 */
export async function fundStellarAccountProcessor(
  job: Job<FundStellarAccountData>
): Promise<void> {
  const { userId } = job.data;

  logger.info({ jobId: job.id, userId }, "[fund-stellar-account] Starting wallet provisioning");

  // Idempotency: skip if wallet already exists
  const { rows: existing } = await pool.query<{ stellar_public_key: string }>(
    `SELECT stellar_public_key FROM wallets WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (existing.length && existing[0]?.stellar_public_key) {
    logger.info({ jobId: job.id, userId }, "[fund-stellar-account] Wallet already exists — skipping");
    return;
  }

  const { publicKey, encryptedSecretKey } = await generateAndFundWallet();

  // Persist wallet
  await pool.query(
    `INSERT INTO wallets (id, user_id, stellar_public_key, stellar_secret_key)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET stellar_public_key = EXCLUDED.stellar_public_key,
           stellar_secret_key = EXCLUDED.stellar_secret_key`,
    [uuidv4(), userId, publicKey, encryptedSecretKey]
  );

  // Mirror public key on the users row for JWT embedding
  await pool.query(
    `UPDATE users SET stellar_public_key = $1 WHERE id = $2`,
    [publicKey, userId]
  );

  logger.info(
    { jobId: job.id, userId, publicKey },
    "[fund-stellar-account] Wallet provisioned and funded"
  );
}
