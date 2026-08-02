# 🌀 AirFlex

> **Open-source P2P Airtime & Data Exchange Marketplace powered by the
> Stellar Network**

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stellar](https://img.shields.io/badge/blockchain-Stellar-7D00FF)
![Soroban](https://img.shields.io/badge/contracts-Soroban-orange)

AirFlex is an open-source fintech platform that enables users to
securely buy, sell, and exchange airtime and mobile data through a
peer-to-peer marketplace backed by Stellar. By combining traditional
payment rails with Soroban smart contracts, AirFlex delivers
transparent, low-cost, escrow-backed telecom value exchange.

------------------------------------------------------------------------

# Features

-   📱 P2P airtime & data marketplace
-   🔐 OTP authentication
-   💳 Virtual bank accounts
-   👛 Integrated wallet
-   🌍 Stellar wallet generation
-   ⛓ Soroban escrow contracts
-   💸 Fast deposits & withdrawals
-   📊 Admin dashboard
-   🔔 Webhook-driven payment processing

------------------------------------------------------------------------

# Why AirFlex?

Millions of users accidentally over-purchase airtime or data but have no
safe way to recover its value. AirFlex creates a secure marketplace
where telecom value can be exchanged while using Stellar for fast
settlement and auditable escrow.

------------------------------------------------------------------------

# Architecture

``` text
User
 │
 ▼
Next.js Web App
 │
 ▼
Express API
 ├── PostgreSQL
 ├── Paystack
 ├── Termii
 └── Stellar Network
      ├── Horizon RPC
      ├── Soroban
      └── AFX Asset
```

------------------------------------------------------------------------

# Repository Structure

``` text
stellar-raide-stellar-raide-airflex/
├── contracts/          # Soroban smart contracts (escrow, marketplace, token)
├── frontend/
│   └── app/            # Next.js application
├── server/
│   ├── src/
│   │   ├── middleware/ # Express middleware (auth, etc.)
│   │   ├── routes/     # API route handlers
│   │   ├── services/   # External integrations (Stellar SDK, etc.)
│   │   ├── types/      # Shared TypeScript types
│   │   ├── db.ts       # PostgreSQL connection pool
│   │   └── index.ts    # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md
```

# Marketplace Flow

1.  User signs up with phone number.
2.  OTP verification completes.
3.  Wallet, Stellar keypair, and virtual account are created.
4.  Seller lists airtime/data.
5.  Buyer accepts offer.
6.  Escrow locks funds.
7.  Transfer is verified.
8.  Soroban releases payment.

# Stellar Integration

-   Native Stellar wallet generation
-   Horizon API integration
-   Custom AFX asset
-   Soroban escrow contracts
-   Low-fee settlement
-   Event logging
-   Testnet then Mainnet deployment

# Tech Stack

  Layer        Technology
  ------------ ------------------------
  Frontend     Next.js + Tailwind CSS
  Backend      Node.js + Express
  Database     PostgreSQL
  Blockchain   Stellar + Soroban
  Payments     Paystack
  Messaging    Termii

# Quick Start

``` bash
git clone https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex.git
cd stellar-raide-stellar-raide-stellar-raide-airflex
pnpm install
pnpm dev
```

# Environment

``` env
DATABASE_URL=
STELLAR_NETWORK=testnet
HORIZON_URL=
SOROBAN_RPC_URL=
PAYSTACK_SECRET_KEY=
TERMII_API_KEY=
JWT_SECRET=
```

# Roadmap

-   MVP marketplace
-   Wallet infrastructure
-   Soroban escrow
-   SDK packages
-   Mobile apps
-   Mainnet launch

# Contributing

We welcome contributions. Please: 1. Fork the repository. 2. Create a
feature branch. 3. Add tests. 4. Open a pull request.

See `CONTRIBUTING.md` for details.

# Security

Please report vulnerabilities privately. Never disclose security issues
publicly before a fix is available.

# License

MIT License.
