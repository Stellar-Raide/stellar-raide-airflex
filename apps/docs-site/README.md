# AirFlex Docs Site

Public documentation site for AirFlex, built with [Next.js](https://nextjs.org)
and [Nextra](https://nextra.site) (`nextra-theme-docs`). Deployed to
**docs.stellar-raide-stellar-raide-airflex.io** — see [Deployment](./pages/deployment.mdx) for the full
setup.

## Quick start

```bash
npm install
npm run dev   # http://localhost:3002
```

## Structure

```
apps/docs-site/
├── pages/
│   ├── index.mdx                 # Introduction
│   ├── getting-started.mdx
│   ├── api-reference/            # generated from openapi/openapi.json
│   ├── contract-reference/       # generated from contracts/*/src/lib.rs doc comments
│   ├── sdk-reference/
│   ├── deployment.mdx
│   └── contributing.mdx
├── openapi/
│   └── openapi.json              # canonical API spec — edit this, not pages/api-reference/*.mdx
├── scripts/
│   ├── generate-api-reference.mjs
│   └── generate-contract-reference.mjs
├── theme.config.tsx
└── next.config.mjs
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server on `:3002` (regenerates docs first) |
| `npm run build` | Production build (regenerates docs first) |
| `npm run generate` | Run both generators without building |
| `npm run generate:api` | Regenerate `pages/api-reference/**` from `openapi/openapi.json` |
| `npm run generate:contracts` | Regenerate `pages/contract-reference/**` from Rust `///` doc comments |

See [Contributing](./pages/contributing.mdx) for the full guide on adding
pages and regenerating the generated sections.
