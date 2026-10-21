# 🗺️ AirFlex Roadmap

This roadmap is the public, issue-driven plan for AirFlex. It maps the work in
the [GitHub issue tracker](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues) to
distinct milestones so contributors can see what the project is building next,
and users can understand what is coming.

- **Status legend:** ✅ shipped · 🚧 in progress · 📋 planned
- **Target dates** are quarter-based and indicative, not commitments.

---

## Milestones

### v0.1.0 — Foundation
> Monorepo, CI/CD, Docker, core server scaffold.
> **Target: Q3 2026**

| Status | Issue | Work |
|--------|-------|------|
| ✅ | [#92](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/92) | pnpm monorepo with workspaces and shared tooling |
| ✅ | [#91](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/91) | Docker and Docker Compose setup for local development |
| ✅ | [#123](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/123) | Next.js 14 App Router scaffold |
| ✅ | [#141](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/141) | PostgreSQL connection pool (`pg`) |
| ✅ | [#78](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/78) | Server CI pipeline (lint, test, build) |
| ✅ | [#69](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/69) | Frontend CI pipeline |
| ✅ | [#93](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/93) | ESLint and Prettier across workspaces |
| ✅ | [#100](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/100) | Performance monitoring with OpenTelemetry |
| ✅ | [#95](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/95) | Dependabot for automated dependency updates |
| ✅ | [#96](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/96) | Secret scanning and SAST with CodeQL |
| ✅ | [#94](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/94) | `SECURITY.md` with responsible disclosure policy |
| ✅ | [#80](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/80) | API versioning strategy (`/api/v1/`) |
| ✅ | [#81](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/81) | OpenAPI 3.1 specification + Swagger UI |
| ✅ | [#84](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/84) | Health and readiness probes |
| ✅ | [#99](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/99) | Railway / Render deployment guide |
| ✅ | [#101](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/101) | Documentation site (Nextra) |
| ✅ | [#139](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/139)–[#148](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/148) | Server scaffold hardening (env validation, logger, middleware, request IDs, async errors) |
| ✅ | [#157](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/157) | Migration CLI script (`server/src/db/migrate.ts`) |
| 🚧 | [#98](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/98) | Husky and lint-staged pre-commit hooks |
| 🚧 | [#121](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/121) | Monorepo-wide type coverage reporting |
| 🚧 | [#97](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/97) | `CHANGELOG.md` (Keep a Changelog) |
| ✅ | [#111](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/111) | This roadmap document |

### v0.2.0 — Auth & Wallets
> OTP, Stellar wallet, virtual accounts, Paystack deposits, recovery.
> **Target: Q4 2026**

| Status | Issue | Work |
|--------|-------|------|
| ✅ | [#7](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/7) | OTP authentication API (Termii) |
| ✅ | [#9](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/9) | Paystack webhook deposit processing |
| ✅ | [#125](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/125) | Auth context and `useAuth` hook |
| ✅ | [#126](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/126) | Next.js middleware for route protection |
| ✅ | [#114](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/114) | Seller onboarding KYC flow UI |
| ✅ | [#108](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/108) | 2FA recovery flow (one-time backup codes) |
| 🚧 | [#109](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/109) | Display recovery codes post-signup + management UI |
| 🚧 | [#74](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/74) | User profile API (phone, settings, KYC status) |
| 🚧 | [#115](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/115) | KYC submission storage and admin review API |

### v0.3.0 — Marketplace MVP
> Trade listings, buy flow, escrow integration, marketplace UI.
> **Target: Q1 2027**

| Status | Issue | Work |
|--------|-------|------|
| ✅ | [#63](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/63) | Onboarding wizard for first-time users |
| ✅ | [#67](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/67) | Reusable UI component library (Storybook) |
| ✅ | [#62](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/62) | Marketplace search and filter controls |
| ✅ | [#64](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/64) | Referral programme UI and code sharing |
| ✅ | [#75](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/75) | Referral programme API |
| ✅ | [#66](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/66) | Stellar explorer deep-link component |
| 🚧 | [#127](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/127) | `TradeCard` component for listing grid |
| 🚧 | [#128](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/128) | Skeleton loading state for marketplace grid |
| 🚧 | [#129](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/129) | `AssetTypeBadge` with carrier branding |
| 🚧 | [#130](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/130) | `next.config.js` env variable validation |
| 🚧 | [#131](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/131) | Typed base fetch client (`lib/api.ts`) |
| 🚧 | [#132](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/132) | `useTradeList` / `useTrade` data-fetching hooks |
| 🚧 | [#133](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/133) | Toast notification system |
| 🚧 | [#134](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/134) | `CurrencyInput` with Naira formatting |
| 🚧 | [#103](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/103)–[#106](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/106) | `@stellar-raide-stellar-raide-airflex/*` SDK packages (shared types, wallet, API client, Soroban client) |

### v0.4.0 — Full Trade Lifecycle
> Dispute resolution, delivery confirmation, notifications, analytics, platform ops.
> **Target: Q2 2027**

| Status | Issue | Work |
|--------|-------|------|
| ✅ | [#70](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/70) | Admin trade resolution API |
| ✅ | [#71](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/71) | Notification service (SMS/email) |
| ✅ | [#82](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/82) | Platform fee deduction on trade completion |
| ✅ | [#83](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/83) | GDPR/NDPR-compliant data deletion |
| ✅ | [#77](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/77) | Background job queue |
| ✅ | [#110](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/110) | Platform analytics dashboard (trade volume metrics) |
| ✅ | [#72](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/72) | Server-Sent Events for real-time updates |
| 🚧 | [#73](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/73) | Horizon event listener for on-chain events |
| 🚧 | [#76](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/76) | Redis caching layer for hot endpoints |
| ✅ | [#118](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/118) | Webhook retry logic and dead-letter queue |
| 🚧 | [#112](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/112) | AML/fraud detection: transaction velocity checks |
| ✅ | [#119](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/119) | Seller rating system after trade completion |
| 🚧 | [#79](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/79) | Integration test suite for all API routes |
| ✅ | [#117](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/117) | Load testing suite with k6 |

### v0.5.0 — Polish & Launch
> Admin dashboard, PWA, i18n, docs, security hardening.
> **Target: Q3 2027**

| Status | Issue | Work |
|--------|-------|------|
| ✅ | [#23](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/23) | Admin dashboard (trade and user management) |
| ✅ | [#89](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/89) | Contracts published to testnet with documented addresses |
| ✅ | [#107](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/107) | Mobile-responsive PWA manifest and service worker |
| 🚧 | [#65](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/65) | Accessibility audit — WCAG 2.1 AA compliance |
| 🚧 | [#68](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/68) | i18n for Yoruba, Igbo, and Hausa |
| ✅ | [#120](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/120) | Content Security Policy and security headers audit |
| 🚧 | [#135](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/135) | Session expiry detection and auto-logout |
| 🚧 | [#113](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/113) | Escrow contract audit preparation document |
| 🚧 | [#102](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/102) | Database backup and point-in-time recovery |
| 🚧 | [#124](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/124) | Root app layout with providers and global styles |

---

## Quarterly Plan

Every entry uses the same structure: **Milestone | Feature | Status | Issue / Label | Description**.
Status is one of `planned`, `in-progress` or `done`; `done` items carry the
date their pull request was merged into `main`.

### Q4 2026 — Marketplace Features

| Milestone | Feature | Status | Issue / Label | Description |
|-----------|---------|--------|---------------|-------------|
| v0.4.0 — Full Trade Lifecycle | Reputation scoring | planned | label: `marketplace`, `reputation` (builds on [#119](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/119)) | Aggregate post-trade ratings, completion rate and dispute history into a public seller score. |
| v0.4.0 — Full Trade Lifecycle | Bulk listing management | planned | label: `marketplace`, `sellers` | Let sellers create, pause, reprice and cancel many listings in one action. |
| v0.4.0 — Full Trade Lifecycle | Marketplace analytics | planned | label: `marketplace`, `analytics` (extends [#110](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/110)) | Seller-facing dashboard for volume, sell-through rate and average time-to-fill. |
| v0.4.0 — Full Trade Lifecycle | Saved searches and listing alerts | planned | label: `marketplace`, `notifications` | Notify buyers when a listing matching a saved asset/price filter is posted. |
| v0.4.0 — Full Trade Lifecycle | Dynamic fee tiers | planned | label: `marketplace`, `fees` (extends [#82](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/82)) | Lower platform fees for high-reputation, high-volume sellers. |
| v0.4.0 — Full Trade Lifecycle | Full trade lifecycle E2E test | in-progress | [#531](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/531) | Playwright scenario covering listing → escrow deposit → payment confirmation → release. |
| v0.5.0 — Polish & Launch | Q4 roadmap entries | in-progress | [#530](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/530) | This quarterly plan. |
| v0.5.0 — Polish & Launch | Vulnerability reporting SLA | in-progress | [#529](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/529) | Concrete acknowledgement, triage and resolution SLAs in `SECURITY.md`. |
| v0.5.0 — Polish & Launch | Local contract build guide | in-progress | [#528](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/528) | `CONTRIBUTING.md` section on building, testing and deploying contracts locally. |
| v0.4.0 — Full Trade Lifecycle | Escrow release timelock | done (merged 2026-10-20) | [#504](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/504) | Escrow release is held until the dispute window has elapsed. |
| v0.4.0 — Full Trade Lifecycle | Marketplace storage limits | done (merged 2026-10-20) | [#505](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/505) | Bounded on-chain storage for marketplace listings. |
| v0.3.0 — Marketplace MVP | Optimistic wallet balance | done (merged 2026-10-20) | [#447](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/447) | Wallet balance updates immediately and reconciles with the server. |
| v0.3.0 — Marketplace MVP | Skeleton loading for trade cards | done (merged 2026-10-20) | [#446](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/446) | Placeholder cards while the marketplace grid loads. |
| v0.5.0 — Polish & Launch | Custom 404 with navigation | done (merged 2026-10-20) | [#472](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/472) | Not-found page that points users back to the marketplace. |
| v0.5.0 — Polish & Launch | PWA manifest icons | done (merged 2026-10-20) | [#462](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/462) | Complete icon set for installable PWA. |

### Q3 2026 — Completed

| Milestone | Feature | Status | Issue / Label | Description |
|-----------|---------|--------|---------------|-------------|
| v0.1.0 — Foundation | Migration CLI | done (merged 2026-08-28) | [#157](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/157) | `server/src/db/migrate.ts` migration runner. |
| v0.1.0 — Foundation | Public roadmap | done (merged 2026-08-28) | [#111](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/111) | This roadmap document. |
| v0.2.0 — Auth & Wallets | 2FA recovery flow | done (merged 2026-08-28) | [#108](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/108) | One-time backup codes for account recovery. |
| v0.4.0 — Full Trade Lifecycle | Platform analytics API | done (merged 2026-08-28) | [#110](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/110) | Trade volume metrics for the admin dashboard. |
| v0.4.0 — Full Trade Lifecycle | Server-Sent Events | done (merged 2026-08-28) | [#72](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/72) | Real-time trade updates with a 30s heartbeat. |
| v0.4.0 — Full Trade Lifecycle | Seller rating system | done (merged 2026-09-23) | [#119](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/119) | Post-trade seller rating API and buyer UI. |
| v0.4.0 — Full Trade Lifecycle | Webhook retries and dead-letter queue | done (merged 2026-09-23) | [#118](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/118) | Paystack webhook queue, retries and admin replay. |
| v0.4.0 — Full Trade Lifecycle | k6 load testing suite | done (merged 2026-09-23) | [#117](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/117) | Load tests with an on-demand CI workflow. |
| v0.5.0 — Polish & Launch | PWA manifest and service worker | done (merged 2026-08-28) | [#107](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/107) | Installable, offline-capable app shell. |
| v0.5.0 — Polish & Launch | CSP and security headers | done (merged 2026-09-23) | [#120](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/120) | Nonce-based Content Security Policy on the frontend. |

---

## Won't Fix (for now)

Deliberately deferred features, with rationale. Revisit these when the
underlying assumption changes.

- **Native mobile apps** — AirFlex targets mobile-first users in Nigeria where
  app-store distribution can be a barrier. The PWA ([#107](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/107))
  delivers an installable, offline-capable experience without store approval or
  platform-specific code. Native apps add significant maintenance cost for
  little user benefit at this stage.
- **GraphQL subscription layer ([#116](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/116))** —
  the SSE endpoint ([#72](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/72)) already
  covers real-time trade updates with far less infrastructure. Revisit only if
  clients demonstrate a concrete need for queryable subscriptions.
- **End-to-end encryption for trade chat ([#122](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/issues/122))** —
  there is no chat feature yet. E2E encryption is only meaningful once
  messaging exists, and premature key-management complexity would slow the
  marketplace MVP.

---

## Community Requests

Feature ideas are collected and upvoted on the
[GitHub Discussions](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/discussions) page.
(Note: discussions must be enabled by the maintainers before the page is
live — until then, please open a feature-request issue instead.) The most
upvoted requests are candidates for the next milestone.

---


