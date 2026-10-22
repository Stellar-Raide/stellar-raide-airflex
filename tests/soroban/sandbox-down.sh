#!/usr/bin/env bash
# =============================================================================
# sandbox-down.sh — remove the local Soroban sandbox and all of its state.
#
# Usage:  tests/soroban/sandbox-down.sh
#
# Stops and removes the container, its anonymous volumes and network, and
# deletes tests/soroban/.sandbox (stellar-cli config, keys, contracts.env).
# Safe to run repeatedly or when nothing is running.
# =============================================================================

set -uo pipefail
# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if command -v docker >/dev/null 2>&1; then
  log "Removing sandbox container, volumes and network (project: ${COMPOSE_PROJECT})..."
  compose down -v --remove-orphans --timeout 5 >/dev/null 2>&1 \
    || warn "docker compose down reported an error (sandbox may not have been running)"
else
  warn "docker not found — skipping container teardown"
fi

# Guard against an empty or root path before deleting.
case "${SANDBOX_STATE_DIR}" in
  ""|"/") die "Refusing to remove suspicious state dir '${SANDBOX_STATE_DIR}'" ;;
esac
if [[ -d "${SANDBOX_STATE_DIR}" ]]; then
  log "Removing sandbox state at ${SANDBOX_STATE_DIR}..."
  rm -rf "${SANDBOX_STATE_DIR}"
fi

log "Sandbox torn down."
