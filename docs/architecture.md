# Architecture

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        User (Browser)                        │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│                  (frontend/app/)                             │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST / JSON
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   Express API Server                         │
│                   (server/src/)                              │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Middleware  │  │    Routes    │  │      Services       │ │
│  │             │  │              │  │                     │ │
│  │  helmet     │  │  GET /health │  │  stellar.ts         │ │
│  │  cors       │  │  GET  /trades│  │  ├─ createListing   │ │
│  │  morgan     │  │  POST /trades│  │  └─ depositToEscrow │ │
│  │  express.   │  │  GET  /:id   │  │                     │ │
│  │    json()   │  │  POST /:buy  │  │                     │ │
│  │  authenticate│ │              │  │                     │ │
│  └─────────────┘  └──────┬───────┘  └──────────┬──────────┘ │
│                          │                      │            │
└──────────────────────────┼──────────────────────┼────────────┘
                           │                      │
              ┌────────────┘                      │
              ▼                                   ▼
┌─────────────────────┐            ┌──────────────────────────┐
│     PostgreSQL       │            │      Stellar Network     │
│                     │            │                          │
│  users              │            │  ┌────────────────────┐  │
│  wallets            │            │  │   Horizon RPC      │  │
│  trade_offers       │            │  │  (account loads,   │  │
│                     │            │  │   tx submission)   │  │
└─────────────────────┘            │  └────────────────────┘  │
                                   │  ┌────────────────────┐  │
              ┌────────────────────┤  │  Soroban RPC       │  │
              │                    │  │  (contract calls,  │  │
              ▼                    │  │   tx simulation)   │  │
┌─────────────────────┐            │  └────────────────────┘  │
│      Paystack        │            │  ┌────────────────────┐  │
│  (fiat payments)    │            │  │  Escrow Contract   │  │
└─────────────────────┘            │  │  create_listing    │  │
                                   │  │  deposit_to_escrow │  │
┌─────────────────────┐            │  │  release_payment   │  │
│       Termii         │            │  │  cancel_and_refund │  │
│  (OTP via SMS)      │            │  └────────────────────┘  │
└─────────────────────┘            └──────────────────────────┘
```

---

## Request Flow — Creating a Trade

```
Client
  │
  │  POST /api/trades
  │  Authorization: Bearer <jwt>
  │  { assetType, amount, expiresInHours }
  │
  ▼
authenticate middleware
  │  verify JWT → extract { sub, stellarPublicKey }
  │
  ▼
trades router (POST /)
  │  validate body with Zod
  │  fetch stellar_secret_key from wallets table
  │
  ▼
stellar.createListing()
  │  build Soroban transaction
  │  simulate via Soroban RPC
  │  sign with seller keypair
  │  submit to Soroban RPC
  │  poll until confirmed
  │  return contract trade ID
  │
  ▼
PostgreSQL INSERT into trade_offers
  │  id, seller_id, asset_type, amount, status='Active',
  │  contract_listing_id, expires_at
  │
  ▼
Response 201 { data: TradeOffer }
```

---

## Request Flow — Buying a Trade

```
Client
  │
  │  POST /api/trades/:id/buy
  │  Authorization: Bearer <jwt>
  │  { buyerSecretKey }
  │
  ▼
authenticate middleware
  │  verify JWT → extract { sub, stellarPublicKey }
  │
  ▼
trades router (POST /:id/buy)
  │  fetch trade from PostgreSQL
  │  guard: status === 'Active'
  │  guard: buyer !== seller
  │
  ▼
stellar.depositToEscrow()
  │  build Soroban transaction calling deposit_to_escrow
  │  simulate → sign → submit
  │  poll until confirmed
  │  return escrow tx hash
  │
  ▼
PostgreSQL UPDATE trade_offers
  │  SET status='Locked', buyer_id, escrow_tx_hash
  │
  ▼
Response 200 { data: TradeOffer }
```

---

## Module Breakdown

### `server/src/index.ts`
Server entry point. Loads env, validates required vars, registers middleware,
mounts routes, starts the HTTP listener.

### `server/src/routes/trades.ts`
All `/api/trades` route handlers. Zod validation, business logic, async error
wrapping. Delegates blockchain calls to `services/stellar.ts` and DB queries
to the pool in `db.ts`.

### `server/src/middleware/authenticate.ts`
Validates `Authorization: Bearer <jwt>` headers. Decodes the token and attaches
`{ sub, stellarPublicKey }` to `req.user`. Returns `401` on failure.

### `server/src/services/stellar.ts`
Wraps `@stellar/stellar-sdk`. Builds, simulates, signs, and submits Soroban
transactions. Polls Soroban RPC until transactions reach a terminal state.
Two exported functions: `createListing` and `depositToEscrow`.

### `server/src/db.ts`
Shared `pg.Pool` (max 10 connections). All DB queries go through this pool.

### `server/src/types/trade.ts`
TypeScript interface `TradeOffer` and union type `TradeStatus` matching the
PostgreSQL `trade_offers` table schema.

### `contracts/escrow/src/lib.rs`
Soroban smart contract. Manages on-chain trade state, token custody,
authorization, and event emission.

---

## Key Design Decisions

**Why PostgreSQL alongside the blockchain?**
The Soroban contract stores minimal on-chain state (trade IDs, amounts,
addresses). The database holds the rest (user profiles, phone numbers, wallet
keys, full trade history) and enables efficient queries that would be expensive
on-chain.

**Why is the admin the only one who can call `release_payment`?**
P2P airtime delivery can't be cryptographically verified on-chain. The platform
acts as an oracle — it verifies delivery through a separate channel (e.g. SMS
delivery receipt from Termii) and then triggers payment release.

**Why Stellar for settlement?**
Low fees (~0.00001 XLM per operation), 5-second finality, and native
stablecoin support (USDC via Circle, NGNC via Convexity) make it well-suited
for micro-value telecom transactions.

**Why Soroban for escrow instead of a simple multisig?**
Soroban allows programmable release conditions, event emission for indexing,
and extensibility (future: dispute voting, time-weighted release, etc.).
