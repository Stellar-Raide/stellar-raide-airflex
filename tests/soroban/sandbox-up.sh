#!/usr/bin/env bash
# =============================================================================
# sandbox-up.sh — start the local Soroban sandbox and fund a deployer identity.
#
# Usage:  tests/soroban/sandbox-up.sh
#
# Fails if the RPC is not healthy within SANDBOX_TIMEOUT seconds (default 60).
# Idempotent: re-running against a live sandbox just re-checks health.
# =============================================================================

set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require docker curl stellar

log "Starting sandbox container (project: ${COMPOSE_PROJECT}, port: ${SOROBAN_SANDBOX_PORT})..."
compose up -d --quiet-pull

started_at=${SECONDS}
log "Waiting up to ${SANDBOX_TIMEOUT}s for Soroban RPC at ${SANDBOX_RPC_URL}..."
until rpc_healthy; do
  if (( SECONDS - started_at >= SANDBOX_TIMEOUT )); then
    compose logs --tail 50 >&2 || true
    die "Soroban RPC was not healthy after ${SANDBOX_TIMEOUT}s"
  fi
  sleep 1
done
log "RPC healthy after $(( SECONDS - started_at ))s."

mkdir -p "${SANDBOX_STATE_DIR}" "${STELLAR_CONFIG_HOME}"

stellar_cli network add "${SANDBOX_NETWORK_NAME}" \
  --rpc-url "${SANDBOX_RPC_URL}" \
  --network-passphrase "${SANDBOX_PASSPHRASE}" >/dev/null 2>&1 || true

# Friendbot can lag a few seconds behind RPC health on a fresh ledger.
log "Creating and funding identity '${DEPLOYER_IDENTITY}'..."
stellar_cli keys generate "${DEPLOYER_IDENTITY}" --overwrite >/dev/null 2>&1 \
  || stellar_cli keys generate "${DEPLOYER_IDENTITY}" >/dev/null 2>&1 \
  || true
DEPLOYER_ADDRESS="$(stellar_cli keys address "${DEPLOYER_IDENTITY}")"

funded=false
for _ in $(seq 1 15); do
  if curl -sf "${SANDBOX_FRIENDBOT_URL}?addr=${DEPLOYER_ADDRESS}" >/dev/null; then
    funded=true
    break
  fi
  sleep 1
done
${funded} || die "Friendbot did not fund ${DEPLOYER_ADDRESS}"

log "Sandbox ready in $(( SECONDS - started_at ))s. Deployer: ${DEPLOYER_ADDRESS}"
