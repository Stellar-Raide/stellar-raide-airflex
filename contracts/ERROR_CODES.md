# Contract Error Codes Reference

Both Soroban contracts (`escrow` and `marketplace`) share a single `ContractError` enum with a unified numeric discriminant space. This means the server-side SDK layer can use one mapping table for calls to either contract.

> **Important:** Discriminant values are permanently fixed once deployed. Never change an existing value. New variants must always append at the end with the next available integer.

---

## Error Table

| Variant | Code | Contract(s) | Triggering Conditions |
|---|---|---|---|
| `AlreadyInitialized` | **1** | escrow, marketplace | `initialize` is called on a contract that already has an admin address set in instance storage. |
| `Unauthorized` | **2** | escrow, marketplace | Caller is not the contract admin; or `get_admin` is called before the contract is initialised; or a buyer attempts to perform an admin-only action; or a seller tries to cancel a trade they have no fills in. |
| `TradeNotFound` | **3** | escrow, marketplace | No `TradeOffer` or `Listing` exists in persistent storage for the supplied ID; or the specific fill ID does not exist within a trade. |
| `WrongStatus` | **4** | escrow, marketplace | The trade or listing is in a status that does not permit the requested operation (e.g. depositing into a `Completed` trade, releasing payment on an `Open` trade, cancelling an already-`Cancelled` listing). |
| `TradeExpired` | **5** | escrow, marketplace | `env.ledger().timestamp() >= trade.expires_at` — the on-chain clock has passed the expiry timestamp set at listing creation. |
| `InsufficientFunds` | **6** | escrow | The requested `fill_amount` is greater than `trade.total_amount - trade.filled_amount` (fill exceeds the remaining unfilled portion of the trade). |
| `InvalidExpiry` | **7** | escrow, marketplace | The `expires_at` argument passed to `create_listing` is less than or equal to the current ledger timestamp. |
| `AlreadyDisputed` | **8** | escrow | `flag_dispute` is called on a trade whose status is already `Disputed`. |
| `ContractPaused` | **9** | escrow, marketplace | Any state-mutating function is called while the admin has activated the pause circuit-breaker (`DataKey::Paused == true`). |
| `TimelockNotExpired` | **10** | escrow | A buyer calls `cancel_and_refund` before the trade's `expires_at` timestamp has passed. Only the admin can bypass the timelock. |
| `UnsupportedToken` | **11** | escrow | The `token` address supplied to `create_listing` is not present in the contract's allowed-token whitelist (`DataKey::AllowedToken(address)`). |
| `InvalidAmount` | **12** | escrow, marketplace | A monetary parameter (`amount`, `fill_amount`, `price`, or `quantity`) is zero or negative. |
| `FillAlreadyProcessed` | **13** | escrow | `release_payment` or `cancel_and_refund` is attempted on a sub-escrow fill that already has `released == true` or `refunded == true`. |
| `NotAParty` | **14** | escrow | `flag_dispute` is called by an address that is neither the trade seller nor a buyer with an active fill in the trade. |

---

## Server-Side Mapping

The TypeScript error classes that map to these codes live in:

```
server/src/services/contractErrors.ts
```

Use `parseContractError(err)` to convert a raw Stellar SDK error into a typed class instance. Each class is named after its variant (e.g. `TradeNotFoundError`, `WrongStatusError`) and carries a `code` property matching the table above.

---

## Adding New Error Codes

1. Append the new variant to the `ContractError` enum in **both** `contracts/escrow/src/lib.rs` and `contracts/marketplace/src/lib.rs` with the next sequential integer.
2. Add a row to the table above.
3. Add a corresponding subclass in `server/src/services/contractErrors.ts` and register it in `ERROR_REGISTRY`.
4. Write a unit test for the new variant in the relevant contract's `#[cfg(test)]` module.
