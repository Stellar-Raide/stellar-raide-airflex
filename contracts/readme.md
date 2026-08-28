# AirFlex Smart Contracts

Soroban (Rust) smart contracts for the AirFlex P2P airtime/data marketplace on the Stellar network.

---

## Contracts

| Contract    | Description                                             |
|-------------|--------------------------------------------------------|
| `escrow`    | Trustless escrow for P2P trades (deposit, release, refund) |
| `marketplace` | On-chain listing registry with seller reputation tracking |

---

## Deployed Addresses

Contract IDs are the canonical source of truth. Always cross-reference with
`contracts/deployments.json` — the file is updated automatically by `deploy.sh`
and the CI deploy workflow.

### Escrow Contract

| Network | Contract ID | Explorer |
|---------|-------------|----------|
| Testnet | `CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP) |
| Mainnet | _not yet deployed_ | — |

**Network passphrase (Testnet):** `Test SDF Network ; September 2015`
**Network passphrase (Mainnet):** `Public Global Stellar Network ; September 2015`

### Marketplace Contract

| Network | Contract ID | Explorer |
|---------|-------------|----------|
| Testnet | _not yet deployed_ | — |
| Mainnet | _not yet deployed_ | — |

---

## Project Structure

```
contracts/
├── Cargo.toml            # Workspace manifest
├── Cargo.lock
├── deployments.json      # Canonical contract address registry
├── deploy.sh             # Build-and-deploy automation script
├── escrow/
│   ├── Cargo.toml
│   └── src/lib.rs        # Escrow contract source
└── marketplace/
    ├── Cargo.toml
    └── src/lib.rs        # Marketplace contract source
```

---

## Development

### Prerequisites

- Rust stable (with `wasm32v1-none` target)
- [`stellar-cli`](https://developers.stellar.org/docs/tools/developer-tools/stellar-cli) installed and on `$PATH`

Install the WASM target:

```bash
rustup target add wasm32v1-none
```

### Build

```bash
cd contracts
cargo build --release --target wasm32v1-none
```

Or using stellar-cli:

```bash
stellar contract build
```

### Test

```bash
cd contracts
cargo test --all-features
```

### Lint

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

---

## Deployment

### Automated (CI)

The `soroban-deploy.yml` workflow handles testnet deployment automatically on
successful CI runs against `main`. Mainnet deployment is **manual-dispatch only**
to prevent accidental production deploys.

### Manual (local)

Use the `deploy.sh` script from the repo root:

```bash
# Deploy all contracts to testnet
export SOROBAN_DEPLOYER_SECRET="S..."   # deployer Stellar secret key
export SOROBAN_ADMIN_ADDRESS="G..."     # admin public key

./contracts/deploy.sh --network testnet --contract all

# Deploy only escrow, skip auto-initialize
./contracts/deploy.sh --network testnet --contract escrow --initialize no

# Mainnet (requires interactive confirmation prompt)
./contracts/deploy.sh --network mainnet --contract escrow
```

After deployment the script:
1. Updates `contracts/deployments.json` with the new contract ID.
2. Commits the change (pass `--commit no` to skip).

Copy the new contract ID into your `server/.env`:

```
ESCROW_CONTRACT_ID=C...
MARKETPLACE_CONTRACT_ID=C...
```

---

## Security

- **Timelocks:** Buyers can self-refund after 24 hours if the trade is not completed.
- **Admin-only oracle:** Only the initialised admin address can call `release_payment`.
  Who calls it: System Backend (must be the admin/oracle address set at initialization).
- **Pause circuit-breaker:** Admin can pause all state-mutating operations in an emergency.
- **Reentrancy:** Soroban's host environment prevents re-entrant calls natively.
