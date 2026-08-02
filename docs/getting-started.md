# Getting Started

This guide walks you through running AirFlex locally from a fresh clone.

---

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | Bundled with Node.js |
| PostgreSQL | 15.x | https://www.postgresql.org |
| Git | any | https://git-scm.com |
| Rust | 1.80+ | https://rustup.rs |
| stellar-cli | 27.x | See below |

### Install stellar-cli

**Windows:**
```bash
winget install -e --id Stellar.StellarCLI --accept-source-agreements --accept-package-agreements
```

**macOS / Linux:**
```bash
cargo install --locked stellar-cli
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/dark-sarge/stellar-raide-stellar-raide-stellar-raide-airflex.git
cd stellar-raide-stellar-raide-stellar-raide-airflex
```

---

## 2. Set Up the Database

Create a PostgreSQL database:

```bash
createdb stellar-raide-stellar-raide-airflex
```

Run the schema (once a migrations file exists, use that instead):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stellar_public_key VARCHAR(60),
  stellar_secret_key TEXT, -- encrypt at rest in production
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_offers (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  asset_type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  contract_listing_id TEXT,
  escrow_tx_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_offers_status ON trade_offers(status);
CREATE INDEX idx_trade_offers_expires ON trade_offers(expires_at);
```

---

## 3. Configure the Server

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in your values:

```env
PORT=3001
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/stellar-raide-stellar-raide-airflex

STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
ESCROW_CONTRACT_ADDRESS=CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP

PAYSTACK_SECRET_KEY=sk_test_your_key_here
TERMII_API_KEY=your_termii_key_here

JWT_SECRET=a_long_random_string_at_least_32_characters
```

See [Environment Variables](./environment.md) for full documentation of each variable.

---

## 4. Start the API Server

```bash
cd server
npm install
npm run dev
```

The server starts on `http://localhost:3001`.

Verify it's running:

```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

---

## 5. Start the Frontend

```bash
cd frontend
# install dependencies once a package.json exists
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

---

## 6. Verify the Contract

The escrow contract is already deployed on testnet. You can inspect it:

```bash
stellar contract invoke \
  --id CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP \
  --source your-key-alias \
  --network testnet \
  -- trade_count
```

---

## Available Server Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Hot-reload dev server via ts-node-dev |
| Build | `npm run build` | Compile TypeScript to `dist/` |
| Start | `npm run start` | Run compiled production build |

---

## Next Steps

- Read the [API Reference](./api-reference.md) to explore all endpoints
- Read the [Smart Contract Reference](./smart-contract.md) to understand the on-chain logic
- See [Architecture](./architecture.md) for a full system diagram
