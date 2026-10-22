#!/usr/bin/env bash
# =============================================================================
# lib.sh — shared configuration for the local Soroban sandbox fixtures.
#
# Sourced by every script in tests/soroban/. Not meant to be run directly.
# All values can be overridden from the environment.
# =============================================================================

SOROBAN_FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SOROBAN_FIXTURES_DIR}/../.." && pwd)"
CONTRACTS_DIR="${REPO_ROOT}/contracts"

# Docker Compose project / file
COMPOSE_FILE="${SOROBAN_FIXTURES_DIR}/docker-compose.yml"
COMPOSE_PROJECT="${SOROBAN_COMPOSE_PROJECT:-stellar-raide-stellar-raide-airflex-soroban-test}"

# Sandbox network
export SOROBAN_SANDBOX_PORT="${SOROBAN_SANDBOX_PORT:-8000}"
SANDBOX_URL="http://localhost:${SOROBAN_SANDBOX_PORT}"
SANDBOX_RPC_URL="${SANDBOX_URL}/rpc"
SANDBOX_FRIENDBOT_URL="${SANDBOX_URL}/friendbot"
SANDBOX_PASSPHRASE="Standalone Network ; February 2017"
SANDBOX_NETWORK_NAME="stellar-raide-stellar-raide-airflex-local"

# How long sandbox-up.sh waits for the RPC to report healthy (seconds).
SANDBOX_TIMEOUT="${SANDBOX_TIMEOUT:-60}"

# Identity that deploys and administers the sandbox contracts.
DEPLOYER_IDENTITY="${SOROBAN_SANDBOX_IDENTITY:-stellar-raide-stellar-raide-airflex-sandbox-deployer}"

# All mutable state (stellar-cli config, keys, exported contract IDs) lives
# here so teardown can remove it with a single rm and nothing leaks into the
# user's global ~/.config/stellar.
SANDBOX_STATE_DIR="${SOROBAN_SANDBOX_STATE_DIR:-${SOROBAN_FIXTURES_DIR}/.sandbox}"
CONTRACTS_ENV_FILE="${SANDBOX_STATE_DIR}/contracts.env"

export STELLAR_CONFIG_HOME="${SANDBOX_STATE_DIR}/stellar-config"
export STELLAR_RPC_URL="${SANDBOX_RPC_URL}"
export STELLAR_NETWORK_PASSPHRASE="${SANDBOX_PASSPHRASE}"

WASM_DIR="${CONTRACTS_DIR}/target/wasm32v1-none/release"
ESCROW_WASM="${WASM_DIR}/stellar-raide-stellar-raide-airflex_escrow.wasm"
MARKETPLACE_WASM="${WASM_DIR}/stellar-raide-stellar-raide-airflex_marketplace.wasm"

log()  { printf '\033[36m[soroban-sandbox]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[soroban-sandbox]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31m[soroban-sandbox]\033[0m %s\n' "$*" >&2; exit 1; }

require() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: ${cmd}"
  done
}

compose() {
  docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" "$@"
}

# Runs stellar-cli from inside the state dir so any project-local `.stellar`
# config it creates is also contained (and removed) there.
stellar_cli() {
  mkdir -p "${SANDBOX_STATE_DIR}"
  (cd "${SANDBOX_STATE_DIR}" && stellar "$@")
}

# Succeeds when the sandbox RPC answers getHealth with "healthy".
rpc_healthy() {
  curl -sf -X POST "${SANDBOX_RPC_URL}" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null \
    | grep -q '"healthy"'
}

# Strips the JSON quotes stellar-cli puts around string return values.
unquote() {
  local value="$1"
  value="${value%\"}"
  printf '%s' "${value#\"}"
}
