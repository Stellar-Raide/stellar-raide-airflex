
# 📜 AirFlex Escrow Smart Contract

The AirFlex Escrow contract is a **Soroban (Rust)** smart contract designed to facilitate trustless Peer-to-Peer (P2P) trades. It ensures that funds are securely held until the delivery of airtime or data is verified.

---

## 🏗️ Technical Specifications
- **Network:** Stellar (Soroban)
- **Language:** Rust
- **SDK Version:** Soroban SDK v20+
- **Contract Type:** Escrow / Atomic Swap

---

## 🛠️ Data Structures

### `TradeStatus`
Represents the current state of a P2P transaction.
```rust
pub enum TradeStatus {
    Open,       // Listed and waiting for a buyer
    Locked,     // Buyer has deposited funds into escrow
    Completed,  // Funds released to the seller
    Disputed,   // Trade flagged for admin intervention
    Cancelled   // Funds returned to the buyer
}

```

### `TradeOffer`

The core object stored on the ledger for every trade.

```rust
pub struct TradeOffer {
    pub id: u64,
    pub seller: Address,
    pub buyer: Option<Address>,
    pub amount: i128,          // Stablecoin amount (USDC/NGNC)
    pub asset_type: Symbol,    // e.g., "MTN_AIRTIME"
    pub status: TradeStatus,
    pub expires_at: u64,       // Unix timestamp
}

```

---

## ⚡ Contract Functions

### 1. `Notesing`

**Who calls it:** The Seller
Initializes a trade entry on the blockchain.

* **Parameters:** `seller: Address`, `amount: i128`, `asset_type: Symbol`
* **Logic:** Registers the trade ID and sets status to `Open`.

### 2. `deposit_to_escrow`

**Who calls it:** The Buyer
Moves funds from the buyer's wallet into the contract's secure storage.

* **Parameters:** `buyer: Address`, `trade_id: u64`
* **Logic:** Transfers token amount from buyer -> contract. Updates status to `Locked`.

### 3. `release_payment`

**Who calls it:** System Backend (via Oracle/Verification)
Finalizes the trade once airtime/data receipt is confirmed.

* **Parameters:** `trade_id: u64`
* **Logic:** Transfers funds from contract -> seller. Updates status to `Completed`.

### 4. `cancel_and_refund`

**Who calls it:** Buyer (after timeout) or Admin
Handles failed trades or disputes.

* **Parameters:** `trade_id: u64`
* **Logic:** Returns funds from contract -> buyer. Updates status to `Cancelled`.

---

## 🔒 Security & Governance

* **Timelocks:** If a trade is `Locked` for more than 24 hours without completion, the buyer can trigger a self-refund.
* **Multi-Sig Admin:** Only the AirFlex official multisig wallet can resolve trades marked as `Disputed`.
* **Reentrancy Guard:** The contract uses Soroban's native host environment to prevent recursive call attacks.

---

## 🚀 Deployment Instructions

### Build

```bash
stellar contract build

```

### Test

```bash
cargo test

```

### Deploy (Testnet)

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar-raide-stellar-raide-airflex_escrow.wasm \
  --source-account S... \
  --network testnet

```

```

```
