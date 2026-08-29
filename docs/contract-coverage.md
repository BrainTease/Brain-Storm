# Contract Test Coverage — Issue #1017

## Overview

All 19 Soroban contract crates in `contracts/` are covered by unit tests.
This document describes how to generate a workspace-wide coverage report,
how to enforce the 90 % line-coverage threshold locally, and what crates
received additional coverage tests as part of #1017.

---

## Prerequisites

```bash
# Install cargo-llvm-cov (one-time)
cargo install cargo-llvm-cov

# Add the LLVM tools component (one-time)
rustup component add llvm-tools-preview
```

---

## Generating a Coverage Report

### HTML Report (local)

```bash
./scripts/coverage-contracts.sh
# Open: coverage/contracts/html/index.html
```

### CI / JSON + LCOV (GitHub Actions)

```bash
./scripts/coverage-contracts.sh --ci
# Produces: coverage/contracts/lcov.info
#           coverage/contracts/coverage.json
```

### Threshold Check (gate mode — exits non-zero on failure)

```bash
./scripts/coverage-contracts.sh --check
```

The threshold is set to **90 % line coverage** per crate.

---

## Per-crate Coverage Files

Each crate below 90 % received a dedicated `tests_coverage.rs` file as part
of issue #1017.  The new test modules are referenced from each crate's
`lib.rs` as `#[cfg(test)] mod tests_coverage;`.

| Crate | New test file |
|---|---|
| `contracts/market` | `src/tests_coverage.rs` |
| `contracts/certificate` | `src/tests_coverage.rs` |

Other crates already had high coverage or had tests added inline.

---

## Running Tests for a Single Crate

```bash
# Run all tests for the market contract
cargo test -p brain-storm-market

# Run only the new coverage tests
cargo test -p brain-storm-market tests_coverage

# Run with verbose output
cargo test -p brain-storm-market -- --nocapture
```

---

## Crate List and Coverage Notes

| Crate | Test files |
|---|---|
| analytics | `src/tests.rs`, `src/fuzz_tests.rs` |
| badges | `src/tests_ext.rs` |
| buyback | `src/tests.rs` |
| certificate | `src/tests_ext.rs`, `src/fuzz_tests.rs`, **`src/tests_coverage.rs`** |
| credential_metadata | `src/tests.rs`, `src/validation_tests.rs` |
| dispute | `src/tests_extra.rs`, `src/tests_ext.rs` |
| governance | `src/lib.rs` (inline) |
| grants | `src/tests_ext.rs` |
| liquidity_pool | `src/tests.rs` |
| market | `src/fuzz_tests.rs`, inline `tests` mod, **`src/tests_coverage.rs`** |
| nft | `src/tests.rs` |
| registry | `src/tests.rs`, `src/lookup_tests.rs`, `src/fuzz_tests.rs` |
| reputation | `src/tests.rs` |
| royalty_distribution | `src/tests.rs` |
| scholarship_fund | `src/tests.rs`, `src/integration_tests.rs` |
| shared | `src/tests.rs`, `src/upgrade_tests.rs` |
| token | `src/tests.rs`, `src/security_tests.rs`, `src/fuzz_tests.rs` |
| token_restrictions | `src/tests.rs` |

---

## CI Integration

The `contracts.yml` workflow already runs `cargo test --workspace`.
To add the coverage threshold gate, append these steps to the workflow:

```yaml
- name: Install cargo-llvm-cov
  uses: taiki-e/install-action@cargo-llvm-cov

- name: Generate contract coverage report
  run: cargo llvm-cov --workspace --lcov --output-path lcov.info

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: lcov.info
    flags: contracts
    fail_ci_if_error: true

- name: Enforce 90% coverage threshold
  run: ./scripts/coverage-contracts.sh --check
```
