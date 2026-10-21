#!/usr/bin/env bash
# =============================================================================
# integration-test.sh — full sandbox lifecycle for contract integration tests.
#
# Usage:  tests/soroban/integration-test.sh
#
#   1. sandbox-up.sh        start the local network, fund a deployer
#   2. deploy-contracts.sh  build + deploy + initialise escrow and marketplace
#   3. smoke-test.sh        assert both contracts are live and initialised
#   4. $INTEGRATION_CMD     optional extra suite, run with contracts.env loaded
#   5. sandbox-down.sh      always runs (even on failure) unless KEEP_SANDBOX=1
#
# Environment:
#   INTEGRATION_CMD   Command to run against the deployed contracts, e.g.
#                     INTEGRATION_CMD="pnpm --filter stellar-raide-stellar-raide-airflex-server test"
#   KEEP_SANDBOX=1    Leave the sandbox running afterwards for debugging.
#   SKIP_BUILD=1      Reuse existing WASM in contracts/target.
# =============================================================================

set -euo pipefail
FIXTURES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${FIXTURES}/lib.sh"

teardown() {
  local status=$?
  trap - EXIT INT TERM
  if [[ "${KEEP_SANDBOX:-0}" == "1" ]]; then
    warn "KEEP_SANDBOX=1 — leaving sandbox running. Tear down with: make -C contracts sandbox-down"
  else
    "${FIXTURES}/sandbox-down.sh" || true
  fi
  exit "${status}"
}
trap teardown EXIT INT TERM

"${FIXTURES}/sandbox-up.sh"

deploy_args=()
[[ "${SKIP_BUILD:-0}" == "1" ]] && deploy_args+=(--skip-build)
"${FIXTURES}/deploy-contracts.sh" "${deploy_args[@]+"${deploy_args[@]}"}"

"${FIXTURES}/smoke-test.sh"

if [[ -n "${INTEGRATION_CMD:-}" ]]; then
  log "Running: ${INTEGRATION_CMD}"
  (
    # shellcheck disable=SC1090
    source "${CONTRACTS_ENV_FILE}"
    cd "${REPO_ROOT}"
    bash -c "${INTEGRATION_CMD}"
  )
fi

log "Integration tests passed."
