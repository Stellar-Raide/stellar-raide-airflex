Repository Structure
stellar-raide-stellar-raide-airflex/
├── apps/
│   └── docs-site/       # Public documentation site (Next.js + Nextra), deployed to docs.stellar-raide-stellar-raide-airflex.io
├── contracts/           # Soroban smart contracts (escrow, marketplace, token)
├── frontend/
│   └── app/             # Next.js application
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
