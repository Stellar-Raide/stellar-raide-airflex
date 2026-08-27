# AirFlex Deployment Guide

This guide covers deploying AirFlex to a production-like environment using:

- **Vercel** — Next.js frontend
- **Railway** — Express API server + PostgreSQL database

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend on Vercel](#1-frontend-on-vercel)
3. [Database (PostgreSQL) on Railway](#2-database-postgresql-on-railway)
4. [Server on Railway](#3-server-on-railway)
5. [Connecting to Stellar Testnet](#4-connecting-to-stellar-testnet)
6. [Running Database Migrations](#5-running-database-migrations)
7. [Post-Deployment Checklist](#6-post-deployment-checklist)

---

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Railway](https://railway.app) account
- `pnpm` installed locally (`npm install -g pnpm`)
- The AirFlex repository forked/cloned
- A Paystack account with a live/test secret key
- A Termii account with an API key
- A Stellar keypair for the server admin (generate below)

```bash
# Generate a server admin Stellar keypair (save the output securely)
stellar keys generate --network testnet server-admin
stellar keys address server-admin
```

---

## One-Click Deploy to Railway

Deploy the server and database to Railway in one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/stellar-raide-stellar-raide-airflex)

> The button uses the `railway.json` template at the repository root. After clicking,
> Railway will prompt you for the required environment variables listed in
> [Section 3](#3-server-on-railway) before provisioning resources.

---

## 1. Frontend on Vercel

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Full URL of your deployed Railway server | `https://stellar-raide-stellar-raide-airflex-server.up.railway.app` |
| `NEXTAUTH_SECRET` | Random secret for session signing (if using NextAuth) | `openssl rand -hex 32` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` | `testnet` |

### Deployment Steps

1. Push your repository to GitHub (or fork the official repo).

2. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.

3. In the **Configure Project** screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `pnpm build` (or leave as default `next build`)
   - **Output Directory**: `.next`

4. Expand **Environment Variables** and add each variable from the table above.

5. Click **Deploy**.

6. Once deployed, note your Vercel URL (e.g. `https://stellar-raide-stellar-raide-airflex.vercel.app`). You will add
   this as `CORS_ORIGIN` on the Railway server.

### Verifying a Successful Frontend Deployment

- Open your Vercel URL — the marketplace landing page should load.
- Open browser DevTools → Network tab → confirm API calls go to your `NEXT_PUBLIC_API_URL`.
- Navigate to `/auth/signup` and verify the OTP flow initiates without CORS errors.

---

## 2. Database (PostgreSQL) on Railway

### Deployment Steps

1. In your Railway project, click **+ New** → **Database** → **Add PostgreSQL**.

2. Railway provisions a managed PostgreSQL instance automatically.

3. Click the PostgreSQL service → **Variables** tab → copy the `DATABASE_URL` value.
   It follows the format:
   ```
   postgresql://<user>:<password>@<host>:<port>/<dbname>
   ```

4. This value will be used as the `DATABASE_URL` environment variable on the server
   service (see Section 3).

### Verifying a Successful Database Deployment

- In the Railway PostgreSQL service, open the **Data** tab or connect via
  `psql $DATABASE_URL` and run `\dt` to list tables after migrations have been applied.

---

## 3. Server on Railway

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Railway sets this automatically — do not override |
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | Copied from the Railway PostgreSQL service |
| `JWT_SECRET` | Yes | Random string ≥ 32 characters (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Yes | Exactly 64 hex characters (32 bytes for AES-256-GCM) — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STELLAR_SERVER_SECRET` | Yes | Stellar secret key of the server admin account (starts with `S`) |
| `ESCROW_CONTRACT_ADDRESS` | Yes | Deployed Soroban escrow contract address |
| `STELLAR_NETWORK` | Yes | `testnet` or `mainnet` |
| `HORIZON_URL` | Yes | Horizon RPC endpoint (see Section 4) |
| `SOROBAN_RPC_URL` | Yes | Soroban RPC endpoint (see Section 4) |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack live or test secret key |
| `TERMII_API_KEY` | Yes | Termii SMS API key |
| `CORS_ORIGIN` | Yes | Your Vercel frontend URL (e.g. `https://stellar-raide-stellar-raide-airflex.vercel.app`) |
| `REDIS_URL` | Yes | Redis connection string for BullMQ job queue (Railway Redis add-on) |
| `ENABLE_API_DOCS` | No | Set to `true` to serve Swagger UI in non-production environments |

### Deployment Steps

1. In your Railway project, click **+ New** → **GitHub Repo** → select your fork.

2. Railway auto-detects the `server/` directory. Set the **Root Directory** to `server`.

3. In **Settings** → **Build & Deploy**:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
   - **Start Command**: `pnpm start`

4. Go to the **Variables** tab and add every variable from the table above.

5. Click **Deploy**. Railway builds the TypeScript source and starts the server.

6. Add a **Redis** add-on for BullMQ:
   - Click **+ New** → **Database** → **Add Redis**.
   - Copy the `REDIS_URL` from the Redis service **Variables** tab and add it to
     the server service.

### Verifying a Successful Server Deployment

- Railway displays the public domain after deployment (e.g.
  `https://stellar-raide-stellar-raide-airflex-server.up.railway.app`).
- Visit `https://stellar-raide-stellar-raide-airflex-server.up.railway.app/health` — should return:
  ```json
  { "status": "ok", "timestamp": "..." }
  ```
- Visit `https://stellar-raide-stellar-raide-airflex-server.up.railway.app/ready` — should return:
  ```json
  { "status": "ready", "db": "ok" }
  ```

---

## 4. Connecting to Stellar Testnet

Set the following environment variables to connect to the Stellar Testnet:

```env
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
ESCROW_CONTRACT_ADDRESS=CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP
```

### Mainnet Endpoints (when ready)

```env
STELLAR_NETWORK=mainnet
HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban-rpc.mainnet.stellar.gateway.fm
```

### Funding the Server Admin Account on Testnet

The `STELLAR_SERVER_SECRET` account must be funded before it can submit transactions:

```bash
# Fund via Friendbot (testnet only)
curl "https://friendbot.stellar.org?addr=<YOUR_SERVER_PUBLIC_KEY>"
```

New user wallets are automatically funded via Friendbot on first login when
`STELLAR_NETWORK=testnet`. On mainnet, replace the Friendbot call with a funded
platform account that seeds new wallets with a minimum balance.

---

## 5. Running Database Migrations

After the server is deployed for the first time — and after every schema change —
run migrations against the production database.

### From your local machine

```bash
# Export the Railway DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/dbname"

cd server
pnpm db:migrate
```

### From the Railway CLI

```bash
# Install the Railway CLI
npm install -g @railway/cli

# Login and link your project
railway login
railway link

# Run migrations in the Railway environment
railway run pnpm db:migrate
```

### What `pnpm db:migrate` does

The migration script applies SQL files in `server/migrations/` sequentially,
creating or altering tables:

- `users` — phone, OTP fields, Stellar public key, deletion state
- `wallets` — Stellar key pairs (secret key AES-256-GCM encrypted)
- `trade_offers` — listings, escrow hashes, status transitions
- `transactions` — audit log (retained with `[deleted]` sentinel on account deletion)

> Always run migrations **before** starting a new server version that depends
> on schema changes.

---

## 6. Post-Deployment Checklist

Work through this checklist after every fresh deployment or promotion to production.

### Infrastructure

- [ ] `GET /health` returns HTTP 200 with `{ "status": "ok" }`
- [ ] `GET /ready` returns HTTP 200 with `{ "status": "ready", "db": "ok" }`
- [ ] PostgreSQL connection is live (confirmed by `/ready` response)
- [ ] Redis connection is live (check Railway Redis service metrics)
- [ ] Database migrations have been applied (`pnpm db:migrate`)

### Authentication & Messaging

- [ ] Send a test OTP: `POST /api/v1/auth/request-otp` with a real phone number
- [ ] Confirm the SMS arrives via Termii
- [ ] Verify the OTP: `POST /api/v1/auth/verify-otp` — should return a JWT
- [ ] Confirm a Stellar wallet was provisioned (check the `wallets` table)

### Payments

- [ ] Confirm Paystack webhook signature validation is active:
  - Send a test webhook event from the Paystack dashboard
  - Confirm the server responds with `200` and logs show HMAC verification passed
  - A missing or invalid `x-paystack-signature` header should return `401`

### Security

- [ ] `CORS_ORIGIN` is set to the exact Vercel frontend URL (not `*`)
- [ ] `NODE_ENV=production` — Swagger UI should be disabled
- [ ] `JWT_SECRET` is a strong random value (not the placeholder)
- [ ] `ENCRYPTION_KEY` is 64 hex chars and stored only in Railway's encrypted variables
- [ ] `STELLAR_SERVER_SECRET` is stored only in Railway's encrypted variables — never in `.env` committed to git

### Stellar / Soroban

- [ ] Server admin account has sufficient XLM balance to pay transaction fees
- [ ] `ESCROW_CONTRACT_ADDRESS` resolves on the configured network (testnet or mainnet)
- [ ] `GET /api/v1/wallet` returns a balance for a test user account

### API Documentation

- [ ] On staging (`NODE_ENV != production`), `GET /api/docs` opens Swagger UI
- [ ] `GET /api/docs.json` returns a valid OpenAPI 3.1 document

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `/health` returns 502 | Server did not start | Check Railway build logs for TypeScript errors |
| `/ready` returns `{ "db": "error" }` | DATABASE_URL wrong or DB not migrated | Verify variable + run `pnpm db:migrate` |
| OTP SMS not delivered | TERMII_API_KEY invalid or unset | Check Termii dashboard logs |
| Wallet balance fetch fails | HORIZON_URL unreachable | Confirm `STELLAR_NETWORK` and `HORIZON_URL` match |
| `release_payment` fails | STELLAR_SERVER_SECRET account not funded | Fund via Friendbot (testnet) or send XLM (mainnet) |
| CORS errors in browser | CORS_ORIGIN mismatch | Set `CORS_ORIGIN` to exact Vercel URL including protocol |
| BullMQ jobs not processing | REDIS_URL not set or Redis down | Add Redis add-on on Railway and set `REDIS_URL` |

---

*Last updated: 2026 — maintained by the AirFlex core team.*
