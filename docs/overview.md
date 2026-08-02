# AirFlex — Project Overview

AirFlex is an open-source P2P marketplace for airtime and mobile data exchange,
backed by the Stellar blockchain. Users can buy and sell telecom value through
a secure escrow system powered by Soroban smart contracts.

---

## Problem

Millions of people accidentally over-purchase airtime or data and have no safe
way to recover its value. Existing resale channels are informal, risky, and
offer no dispute resolution.

## Solution

AirFlex creates a structured marketplace where:

- **Sellers** list excess airtime or data at a price they choose
- **Buyers** purchase listings with funds held in escrow
- **Soroban contracts** release payment only after delivery is verified
- **Stellar** settles transactions with low fees and fast finality

---

## Core Concepts

### Trade Offer

The atomic unit of the marketplace. A trade offer represents a seller's intent
to exchange a specific amount of a telecom asset (e.g. `MTN_AIRTIME`) for a
stablecoin amount (USDC or NGNC). Each offer is registered on-chain via the
escrow contract and mirrored in the PostgreSQL database.

### Escrow

Buyer funds are never sent directly to the seller. They are transferred into the
Soroban smart contract where they remain locked until:
- The platform backend confirms delivery → `release_payment` sends funds to seller
- The trade expires without completion → buyer self-refunds via `cancel_and_refund`
- A dispute is raised → admin intervenes

### Trade Lifecycle

```
           Seller creates listing
                    │
                    ▼
              Status: Open
                    │
           Buyer deposits escrow
                    │
                    ▼
             Status: Locked
                 /       \
      Delivery         No delivery
      confirmed        / timeout
          │           │
          ▼           ▼
     Completed    Cancelled
          │           │
     Funds →       Funds →
      Seller        Buyer

        (or)
     Either party raises dispute
                │
                ▼
           Disputed
                │
          Admin resolves
           /         \
    Completed      Cancelled
```

### Trade Statuses

| Status | Meaning |
|--------|---------|
| `Open` | Listing is live, waiting for a buyer |
| `Locked` | Buyer has deposited funds into escrow |
| `Completed` | Payment released to seller, trade finished |
| `Disputed` | Flagged by buyer or seller for admin review |
| `Cancelled` | Trade refunded, funds returned to buyer |

---

## System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js + Tailwind CSS | User-facing web app |
| API Server | Node.js + Express | REST API, business logic |
| Database | PostgreSQL | Trade records, user data |
| Smart Contract | Rust + Soroban | On-chain escrow |
| Payments | Paystack | Fiat deposits and withdrawals |
| Messaging | Termii | OTP delivery via SMS |
| Blockchain | Stellar + Horizon | Settlement and wallet |

---

## Deployed Contracts

| Contract | Network | Address |
|----------|---------|---------|
| Escrow | Testnet | `CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP` |

Explorer: https://stellar.expert/explorer/testnet/contract/CCBJ235OCBFZXBFSUUUT4PMG7RRCAXZXMUEB2L7CTTQ5NRSNO4P2SLNP

---

## Further Reading

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Smart Contract Reference](./smart-contract.md)
- [Architecture](./architecture.md)
- [Environment Variables](./environment.md)
