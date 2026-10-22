.PHONY: build test clean wasm \
	sandbox-up sandbox-deploy sandbox-smoke sandbox-down integration-test

# Local Soroban sandbox fixtures (see tests/README.md)
SANDBOX := $(CURDIR)/../tests/soroban

build:
	cargo build --release --workspace

test:
	cargo test --workspace --all-features --target $(shell rustc -vV | sed -n 's|host: ||p')

clean:
	cargo clean --workspace

# Release WASM consumed by the sandbox deploy fixture and deploy.sh
wasm:
	cargo build --release --target wasm32v1-none

# Start the local sandbox and fund a deployer identity (< 60s)
sandbox-up:
	bash $(SANDBOX)/sandbox-up.sh

# Build, deploy and initialise escrow + marketplace; writes contract IDs to
# tests/soroban/.sandbox/contracts.env
sandbox-deploy: wasm
	bash $(SANDBOX)/deploy-contracts.sh --skip-build

# Check the deployed contracts are live and initialised
sandbox-smoke:
	bash $(SANDBOX)/smoke-test.sh

# Remove the sandbox container, volumes and all local state
sandbox-down:
	bash $(SANDBOX)/sandbox-down.sh

# Full lifecycle: up → deploy → smoke (+ $$INTEGRATION_CMD) → down (always)
integration-test: wasm
	SKIP_BUILD=1 bash $(SANDBOX)/integration-test.sh
