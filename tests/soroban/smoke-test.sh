#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh — assert the sandbox deployment is live and initialised.
#
# Usage:  tests/soroban/smoke-test.sh
#
# Reads contract IDs from tests/soroban/.sandbox/contracts.env and checks each
# contract's read-only getters against the expected post-initialise state.
# =============================================================================

set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require stellar
[[ -f "${CONTRACTS_ENV_FILE}" ]] || die "No ${CONTRACTS_ENV_FILE} — run deploy-contracts.sh first"
# shellcheck disable=SC1090
source "${CONTRACTS_ENV_FILE}"

failures=0

# expect <description> <expected> <contract id> <fn> [args...]
expect() {
  local description="$1" expected="$2" id="$3"
  shift 3
  local actual
  actual="$(unquote "$(stellar_cli contract invoke --id "${id}" \
    --source "${DEPLOYER_IDENTITY}" -- "$@" 2>/dev/null || echo '<invoke failed>')")"
  if [[ "${actual}" == "${expected}" ]]; then
    log "  ok   ${description}"
  else
    warn "  FAIL ${description}: expected '${expected}', got '${actual}'"
    failures=$(( failures + 1 ))
  fi
}

log "Smoke-testing escrow ${ESCROW_CONTRACT_ID}"
expect "escrow admin is the deployer"     "${SOROBAN_ADMIN_ADDRESS}" "${ESCROW_CONTRACT_ID}" get_admin
expect "escrow is not paused"             "false"                    "${ESCROW_CONTRACT_ID}" is_paused
expect "escrow starts with zero trades"   "0"                        "${ESCROW_CONTRACT_ID}" trade_count

log "Smoke-testing marketplace ${MARKETPLACE_CONTRACT_ID}"
expect "marketplace admin is the deployer"      "${SOROBAN_ADMIN_ADDRESS}" "${MARKETPLACE_CONTRACT_ID}" get_admin
expect "marketplace is not paused"              "false"                    "${MARKETPLACE_CONTRACT_ID}" is_paused
expect "marketplace starts with zero listings"  "0"                        "${MARKETPLACE_CONTRACT_ID}" listing_count

(( failures == 0 )) || die "${failures} smoke check(s) failed"
log "All smoke checks passed."
