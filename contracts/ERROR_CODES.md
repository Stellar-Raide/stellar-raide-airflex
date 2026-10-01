# AirFlex Soroban Smart Contract Error Codes

This document lists all error codes thrown by the AirFlex Escrow and Marketplace Soroban contracts.

## Error Codes Reference

| Error Code | Error Name | Description | Contract |
|---|---|---|---|
| `1` / `101` | `Unauthorized` | Caller is not authorized to perform this operation (e.g. missing signature or wrong role). | Escrow & Marketplace |
| `2` / `102` | `AlreadyInitialized` | The contract has already been initialized with an admin and parameters. | Escrow & Marketplace |
| `3` / `103` | `ContractPaused` | Operations are currently paused by the administrator emergency pause. | Escrow & Marketplace |
| `4` / `104` | `InvalidStatus` | The requested state transition is invalid for the current `TradeStatus` or `ListingStatus`. | Escrow & Marketplace |
| `5` / `105` | `TradeNotFound` / `ListingNotFound` | The specified trade ID or listing ID does not exist in persistent storage. | Escrow & Marketplace |
| `6` / `106` | `TokenNotAllowed` | The requested token address is not in the contract's allowed tokens whitelist. | Escrow |
| `7` / `107` | `InsufficientAmount` / `InvalidAmount` | The specified amount is zero, negative, or exceeds available fill balance. | Escrow & Marketplace |
| `8` / `108` | `ExpiryNotReached` | Attempted to trigger auto-cancellation or refund before the expiry timestamp. | Escrow & Marketplace |
| `9` / `109` | `AlreadyExpired` | Attempted to deposit or accept a listing after its expiry timestamp. | Escrow & Marketplace |
| `10` / `110` | `DisputeAlreadyFlagged` | A dispute has already been raised for this trade/listing. | Escrow & Marketplace |

## Escrow Contract — Canonical Error Code Table

The escrow contract (`contracts/escrow/src/lib.rs`) uses stable integer discriminants.
New codes are always appended; existing values are never changed.

| Discriminant | Variant name | Description |
|---|---|---|
| `1` | `AlreadyInitialized` | Contract already initialized. |
| `2` | `Unauthorized` | Caller lacks required authority. |
| `3` | `TradeNotFound` | Trade ID not found in persistent storage. |
| `4` | `WrongStatus` | State transition is invalid for current status. |
| `5` | `TradeExpired` | Trade has passed its expiry timestamp. |
| `6` | `InsufficientFunds` | Amount exceeds available or escrowed balance. |
| `7` | `InvalidExpiry` | Expiry is in the past or otherwise invalid. |
| `8` | `AlreadyDisputed` | Trade already has an active dispute. |
| `9` | `ContractPaused` | Contract is paused; state-mutating calls are blocked. |
| `10` | `TimelockNotExpired` | Required timelock period has not elapsed. |
| `11` | `UnsupportedToken` | Token address is not on the allowed tokens list. |
| `12` | `InvalidAmount` | Amount is zero or negative. |
| `13` | `FillAlreadyProcessed` | Sub-escrow fill has already been released or refunded. |
| `14` | `NotAParty` | Caller is not the seller or any buyer on this trade. |
| `15` | `PauseCooldownNotExpired` | Pause cooldown window has not elapsed before unpause. |
| `16` | `InvalidCategory` | `asset_type` symbol is not on the admin-managed allowed categories list. |

## Handling Errors

When calling contract functions via Soroban SDK or RPC:
- Errors are returned as contract error host functions (`panic_with_error`).
- Client SDKs map these panic codes to corresponding `Error` enums for handling in frontend and server services.
