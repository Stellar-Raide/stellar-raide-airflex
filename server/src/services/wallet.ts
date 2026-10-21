import type { PoolClient } from "pg";

export type WalletTransactionType =
  | "trade_settlement"
  | "platform_fee"
  | "referral_reward"
  | "deposit";

export interface WalletTransactionInput {
  userId: string;
  amount: number;
  type: WalletTransactionType;
  /** Required for trade-related types; omit for deposits. */
  tradeId?: string | null;
  /** External payment reference (e.g. Paystack reference) for deposit types. */
  externalReference?: string | null;
}

/**
 * Wallet section of a GDPR data export (issue #539).
 *
 * Deliberately omits the Stellar secret key, Paystack recipient/transfer
 * codes and full bank account numbers: these are credentials or raw payment
 * details, not personal data the user needs to port, and leaking them from a
 * downloaded file would let anyone holding it move funds.
 */
export interface WalletExport {
  wallet: {
    stellarPublicKey: string | null;
    fiatBalance: string | null;
  } | null;
  transactions: Array<{
    id: string;
    tradeId: string | null;
    amount: string;
    direction: "credit" | "debit";
    type: string;
    externalReference: string | null;
    createdAt: string;
  }>;
  withdrawals: Array<{
    id: string;
    amount: string;
    bankCode: string;
    accountName: string;
    accountNumber: string;
    reference: string;
    status: string;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

/** Keeps the last `visible` characters of a payment identifier. */
export function maskPaymentIdentifier(value: string | null, visible = 4): string | null {
  if (value === null) return null;
  if (value.length <= visible) return "*".repeat(value.length);
  return `${"*".repeat(value.length - visible)}${value.slice(-visible)}`;
}

/** Database-backed wallet ledger operations. Callers own the transaction. */
export class WalletService {
  constructor(private readonly client: PoolClient) {}

  /**
   * Collects the user's wallet, ledger and withdrawal history for a data
   * export, with payment details redacted (see WalletExport). Run inside a
   * REPEATABLE READ transaction for a consistent snapshot.
   */
  async exportHistory(userId: string): Promise<WalletExport> {
    const { rows: walletRows } = await this.client.query<{
      stellar_public_key: string | null;
      fiat_balance: string | null;
    }>(
      `SELECT stellar_public_key, fiat_balance::text AS fiat_balance
       FROM wallets WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    const { rows: txRows } = await this.client.query<{
      id: string;
      trade_id: string | null;
      amount: string;
      direction: "credit" | "debit";
      type: string;
      external_reference: string | null;
      created_at: Date;
    }>(
      `SELECT id, trade_id, amount::text AS amount, direction, type, external_reference, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    const { rows: wdRows } = await this.client.query<{
      id: string;
      amount: string;
      bank_code: string;
      account_name: string;
      account_number: string;
      reference: string;
      status: string;
      failure_reason: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, amount::text AS amount, bank_code, account_name, account_number,
              reference, status, failure_reason, created_at, updated_at
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    const wallet = walletRows[0];

    return {
      wallet: wallet
        ? { stellarPublicKey: wallet.stellar_public_key, fiatBalance: wallet.fiat_balance }
        : null,
      transactions: txRows.map((t) => ({
        id: t.id,
        tradeId: t.trade_id,
        amount: t.amount,
        direction: t.direction,
        type: t.type,
        externalReference: maskPaymentIdentifier(t.external_reference, 6),
        createdAt: new Date(t.created_at).toISOString(),
      })),
      withdrawals: wdRows.map((w) => ({
        id: w.id,
        amount: w.amount,
        bankCode: w.bank_code,
        accountName: w.account_name,
        accountNumber: maskPaymentIdentifier(w.account_number) ?? "",
        reference: w.reference,
        status: w.status,
        failureReason: w.failure_reason,
        createdAt: new Date(w.created_at).toISOString(),
        updatedAt: new Date(w.updated_at).toISOString(),
      })),
    };
  }

  async debit(userId: string, amount: number, tradeId: string): Promise<void> {
    await this.client.query(
      `INSERT INTO transactions (user_id, trade_id, amount, direction, type)
       VALUES ($1, $2, $3, 'debit', 'trade_settlement')`,
      [userId, tradeId, amount]
    );
  }

  /**
   * Credit a user's wallet.
   *
   * For `deposit` credits the method also increments `wallets.fiat_balance`
   * so the stored balance stays in sync with the ledger. All other credit
   * types (trade_settlement, platform_fee, referral_reward) are ledger-only
   * entries settled by the trade flow.
   */
  async credit(input: WalletTransactionInput): Promise<void> {
    await this.client.query(
      `INSERT INTO transactions
         (user_id, trade_id, amount, direction, type, external_reference)
       VALUES ($1, $2, $3, 'credit', $4, $5)`,
      [
        input.userId,
        input.tradeId ?? null,
        input.amount,
        input.type,
        input.externalReference ?? null,
      ]
    );

    // Deposits must also update the wallet's running fiat balance.
    if (input.type === "deposit") {
      await this.client.query(
        `UPDATE wallets SET fiat_balance = fiat_balance + $1 WHERE user_id = $2`,
        [input.amount, input.userId]
      );
    }
  }
}
