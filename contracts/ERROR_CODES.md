# AirFlex Soroban Smart Contract Error Codes

This document lists all error codes thrown by the AirFlex Escrow and Marketplace Soroban contracts.

Discriminants are the values of the `ContractError` enum in
`contracts/escrow/src/lib.rs` and `contracts/marketplace/src/lib.rs`. Codes `1`–`14`
are shared by both contracts; escrow appends `15`–`16`. The server-side mirror in
`server/src/services/contractErrors.ts` maps every code back to a typed error.

**Never renumber an existing variant** — new variants are always appended with the
next integer, because deployed callers decode by discriminant.

## Error Codes Reference

| Error Code | Error Name | Description | Contract |
|---|---|---|---|
| `1` | `AlreadyInitialized` | `initialize` was called on a contract that already has an admin. | Escrow & Marketplace |
| `2` | `Unauthorized` | The caller is not permitted to perform this action (missing signature, seller acting as buyer, admin acting as buyer, or a caller who is not a party to the trade). | Escrow & Marketplace |
| `3` | `TradeNotFound` | No trade/listing with the given ID exists in storage. | Escrow & Marketplace |
| `4` | `WrongStatus` | The action is invalid for the trade's current status. | Escrow & Marketplace |
| `5` | `TradeExpired` | The trade has passed its expiry timestamp (also returned when a listing has *not* yet expired). | Escrow & Marketplace |
| `6` | `InsufficientFunds` | The requested amount exceeds the trade's remaining capacity or the contract's balance. | Escrow & Marketplace |
| `7` | `InvalidExpiry` | The supplied expiry is not in the future. | Escrow & Marketplace |
| `8` | `AlreadyDisputed` | A dispute is already open on this trade. | Escrow & Marketplace |
| `9` | `ContractPaused` | The contract is paused by the admin circuit breaker. | Escrow & Marketplace |
| `10` | `TimelockNotExpired` | A timelocked action was attempted too early (buyer refund before expiry, or the 72-hour emergency-withdrawal timelock). | Escrow & Marketplace |
| `11` | `UnsupportedToken` | The token is not on the contract's allow-list. | Escrow & Marketplace |
| `12` | `InvalidAmount` | The amount is zero, negative, or not a whole number of stroops. | Escrow & Marketplace |
| `13` | `FillAlreadyProcessed` | The sub-escrow fill has already been released or refunded. | Escrow & Marketplace |
| `14` | `NotAParty` | The caller is neither the seller nor a buyer of the trade. | Escrow & Marketplace |
| `15` | `PauseCooldownNotExpired` | `unpause` was called before the 5-minute pause cooldown elapsed. | Escrow |
| `16` | `DuplicateFill` | The buyer already holds an active (unreleased, unrefunded) sub-escrow on this trade — one active fill per buyer per trade (issue #294). | Escrow |

## Handling Errors

When calling contract functions via Soroban SDK or RPC:
- Errors are returned as contract error host functions (`panic_with_error`).
- Client SDKs map these panic codes to corresponding `Error` enums for handling in frontend and server services.
