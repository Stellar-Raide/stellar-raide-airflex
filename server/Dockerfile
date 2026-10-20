# ---------------------------------------------------------------------------
# AirFlex API Server — Multi-stage Dockerfile
# ---------------------------------------------------------------------------
# Stage 1 : Build — compiles TypeScript to JavaScript
# Stage 2 : Production — minimal runtime image (no dev dependencies, no tsc)
# ---------------------------------------------------------------------------

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set a non-root working directory
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching.
# node_modules are only re-installed when package files change.
COPY package.json ./

# Install all dependencies (including devDependencies needed for tsc)
RUN npm install --ignore-scripts

# Copy the rest of the source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript → JavaScript
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Principle of least privilege — run as a non-root user
RUN addgroup -S stellar-raide-stellar-raide-airflex && adduser -S stellar-raide-stellar-raide-airflex -G stellar-raide-stellar-raide-airflex

WORKDIR /app

# Copy only the compiled output and production dependency manifests
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Switch to non-root user
USER stellar-raide-stellar-raide-airflex

# Expose the default API port (overridable via PORT env var)
EXPOSE 3001

# Health-check so container orchestrators can detect unhealthy instances
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
