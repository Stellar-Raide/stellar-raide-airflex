# Smart Contract Reference

AirFlex uses a single Soroban smart contract written in Rust that manages the
full P2P trade escrow lifecycle.

---

## Deployment Info

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP` |
| **WASM Hash** | `ddb4b0aa7d93746c913228a8caac75a6e93dca1eab8fa4a2a49df1f2644c69e7` |
| **WASM Size** | 7,973 bytes (optimized) |
| **SDK Version** | `soroban-sdk v22.0.11` |
| **Source** | `contracts/escrow/src/lib.rs` |

Explorer: https://stellar.expert/explorer/testnet/contract/CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP

---

## Data Structures

### `TradeStatus`

```rust
pub enum TradeStatus {
    Open,       // Listing is live, waiting for a buyer
    Locked,     // Buyer has deposited funds into escrow
    Completed,  // Funds released to the seller
    Disputed,   // Flagged for admin intervention
    Cancelled,  // Funds returned to the buyer
}
```

### `TradeOffer`

The core on-ledger object for every trade:

```rust
pub struct TradeOffer {
    pub id: u64,
    pub seller: Address,
    pub buyer: Option<Address>,
    pub token: Address,       // Payment token contract (USDC / NGNC)
    pub amount: i128,         // Amount in token base units (7 decimals)
    pub asset_type: Symbol,   // e.g. "MTN_AIRTIME", "GLO_DATA"
    pub status: TradeStatus,
    pub expires_at: u64,      // Unix timestamp
}
```

---

## Contract Functions

### `initialize`

Sets the contract admin and seeds the trade counter. **Must be called once
immediately after deployment.** Panics if called again.

| Parameter | Type | Description |
|-----------|------|-------------|
| `admin` | `Address` | The account that will control payment release and dispute resolution |

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source deployer --network testnet \
  -- initialize --admin <ADMIN_PUBLIC_KEY>
```

---

### `create_listing`

Registers a new trade offer on the ledger. Called by the **seller**.

| Parameter | Type | Description |
|-----------|------|-------------|
| `seller` | `Address` | Seller's Stellar address (must sign) |
| `token` | `Address` | Payment token contract address |
| `amount` | `i128` | Token amount buyer must pay (base units) |
| `asset_type` | `Symbol` | Short label for what is being sold |
| `expires_at` | `u64` | Unix timestamp — must be in the future |

**Returns:** `u64` — the new trade ID

**Guards:**
- `seller.require_auth()` — seller must sign
- `amount > 0`
- `expires_at > now`

**Emits event:** `("created", asset_type)` → `(id, seller, amount)`

---

### `deposit_to_escrow`

Locks buyer's funds into the contract. Called by the **buyer**.

Transfers `trade.amount` tokens from `buyer` → contract.
Sets status to `Locked`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `buyer` | `Address` | Buyer's Stellar address (must sign) |
| `trade_id` | `u64` | ID of the trade to purchase |

**Guards:**
- `buyer.require_auth()`
- Trade must be `Open`
- Trade must not be expired
- Buyer cannot be the same as the seller

**Emits event:** `("locked",)` → `(trade_id, buyer)`

---

### `release_payment`

Releases escrowed funds to the seller after delivery is confirmed.
Called by the **admin** (platform backend).

Transfers `trade.amount` tokens from contract → seller.
Sets status to `Completed`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `trade_id` | `u64` | ID of the trade to complete |

**Guards:**
- `admin.require_auth()` — only the admin can release
- Trade must be in `Locked` state

**Emits event:** `("completed",)` → `(trade_id, seller)`

---

### `cancel_and_refund`

Returns escrowed funds to the buyer and marks the trade `Cancelled`.

Can be called by:
- The **buyer**, after the trade's `expires_at` has passed (24h timelock)
- The **admin**, at any point (for dispute resolution)

Transfers `trade.amount` tokens from contract → buyer.

| Parameter | Type | Description |
|-----------|------|-------------|
| `caller` | `Address` | Buyer or admin address (must sign) |
| `trade_id` | `u64` | ID of the trade to cancel |

**Guards:**
- `caller.require_auth()`
- Trade must be `Locked` or `Disputed`
- If called by buyer: `now >= expires_at` (timelock enforced)
- Only buyer or admin can call

**Emits event:** `("cancelled",)` → `(trade_id, buyer)`

---

### `flag_dispute`

Flags a `Locked` trade as `Disputed` so the admin can intervene.
Called by **either trade party** (buyer or seller).

| Parameter | Type | Description |
|-----------|------|-------------|
| `caller` | `Address` | Buyer or seller address (must sign) |
| `trade_id` | `u64` | ID of the trade to dispute |

**Guards:**
- `caller.require_auth()`
- Trade must be `Locked`
- Caller must be the buyer or the seller

**Emits event:** `("disputed",)` → `(trade_id, caller)`

---

### `get_trade`

Read-only. Returns a full `TradeOffer` by ID.

| Parameter | Type | Description |
|-----------|------|-------------|
| `trade_id` | `u64` | ID of the trade to fetch |

**Returns:** `TradeOffer`

---

### `trade_count`

Read-only. Returns the total number of trades ever created (the current counter
value).

**Returns:** `u64`

---

### `get_admin`

Read-only. Returns the admin address.

**Returns:** `Address`

---

## Security Properties

| Property | Implementation |
|----------|---------------|
| Auth on all writes | Every state-changing function calls `require_auth()` |
| Seller can't self-buy | Checked in `deposit_to_escrow` |
| Expiry enforcement | `deposit_to_escrow` rejects expired trades |
| Buyer timelock | `cancel_and_refund` enforces `now >= expires_at` for buyer self-refunds |
| Admin-only release | `release_payment` requires admin signature |
| Reentrancy safety | Soroban's host environment prevents reentrant calls natively |
| Storage TTL | All persistent entries bumped to 30-day ledger TTL |

---

## Events

Events can be indexed by any off-chain listener (e.g. Horizon event stream).

| Topic | Data | Emitted by |
|-------|------|------------|
| `("created", asset_type)` | `(trade_id, seller, amount)` | `create_listing` |
| `("locked",)` | `(trade_id, buyer)` | `deposit_to_escrow` |
| `("completed",)` | `(trade_id, seller)` | `release_payment` |
| `("cancelled",)` | `(trade_id, buyer)` | `cancel_and_refund` |
| `("disputed",)` | `(trade_id, caller)` | `flag_dispute` |

---

## Building Locally

```bash
# Add the required WASM target
rustup target add wasm32v1-none

# Build from the contracts workspace root
cd contracts
stellar contract build
```

Output: `contracts/target/wasm32v1-none/release/stellar-raide-stellar-raide-airflex_escrow.wasm`

For deployment instructions see [SOROBAN_DEPLOY_GUIDE.md](../SOROBAN_DEPLOY_GUIDE.md).
