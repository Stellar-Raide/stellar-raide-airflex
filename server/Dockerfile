# ---------------------------------------------------------------------------
# AirFlex API Server — Multi-stage Dockerfile
# ---------------------------------------------------------------------------
# Stage 1 : Build — compiles TypeScript to JavaScript
# Stage 2 : Production — minimal runtime image (no dev dependencies, no tsc)
# ---------------------------------------------------------------------------

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY server/package.json ./server/

RUN pnpm --filter stellar-raide-stellar-raide-airflex-server install --frozen-lockfile

COPY server/ ./server/

RUN pnpm --filter stellar-raide-stellar-raide-airflex-server build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -S stellar-raide-stellar-raide-airflex && adduser -S stellar-raide-stellar-raide-airflex -G stellar-raide-stellar-raide-airflex

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY server/package.json ./server/

RUN pnpm --filter stellar-raide-stellar-raide-airflex-server install --prod --frozen-lockfile

COPY --from=builder /app/server/dist ./server/dist

WORKDIR /app/server

USER stellar-raide-stellar-raide-airflex

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
