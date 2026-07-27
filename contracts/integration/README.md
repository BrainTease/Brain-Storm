# Contract Integration Tests

End-to-end integration tests that deploy contracts to a local Stellar sandbox and
exercise full register/progress/token-reward flows.

## Prerequisites

- Rust toolchain with `wasm32-unknown-unknown` target
- [Stellar CLI](https://github.com/stellar/stellar-cli) v21.5.0+
- Docker (for the local sandbox)

## Local Reproduction

```bash
# 1. Start local Stellar sandbox
stellar network start local --docker

# 2. Build contracts
./scripts/build.sh

# 3. Run integration tests
cd contracts/integration
cargo test --test integration -- --test-threads=1

# 4. Stop sandbox
stellar network stop local --docker
```

## CI

The `.github/workflows/contract-integration.yml` workflow:
1. Starts `stellar-quickstart` in Docker (local network mode).
2. Builds all WASM contracts.
3. Deploys analytics + token + shared contracts.
4. Runs the scripted end-to-end scenario defined in `tests/integration.rs`.
5. Asserts emitted events and final contract state.
