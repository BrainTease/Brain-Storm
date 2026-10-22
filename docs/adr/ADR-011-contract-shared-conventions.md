# ADR-011: Shared Contract Error, Storage, and Constant Conventions

**Status:** Proposed

**Date:** 2026-10-16

**Author(s):** Brain-Storm Smart Contracts Team

---

## Context

The Soroban contracts under `contracts/` are independent crates (see [ADR-006](./ADR-006-contract-per-domain-architecture.md)). Each one defines its own errors, storage keys, and TTL handling. The common helpers live in `contracts/shared/src`, which provides:

- `errors.rs`: the `SharedError` enum
- `constants.rs`: basis-point, precision, and ledger TTL constants
- `lib.rs`: the `DataKey` enum for RBAC and cross-contract call state, plus event topics built with `symbol_short!`
- `access.rs`, `pausable.rs`, `reentrancy.rs`, `validation.rs`, `pagination.rs`, and related helpers

The helpers exist, but nothing states which conventions every contract must follow. Without that, the same concept can be named or stored differently in different crates, which makes indexers, client SDKs, and audits harder.

This ADR records the conventions that `contracts/shared` already implements, so that new and existing contracts can be checked against one reference.

---

## Decision

### 1. Error codes

- Contracts expose errors as `#[contracttype]` enums with explicit `u32` discriminants.
- Use `SharedError` for errors that are common to all contracts. Do not redefine these conditions in a domain enum.
- Domain-specific errors use their own enum. Their codes must not overlap the ranges reserved by `SharedError`.
- `SharedError` ranges, by category:

| Range       | Category        | Examples                                                   |
| ----------- | --------------- | ---------------------------------------------------------- |
| 1000–1999   | Authorization   | `Unauthorized` (1000), `InsufficientRole` (1002)           |
| 2000–2999   | Validation      | `InvalidInput` (2000), `InvalidAmount` (2001)              |
| 3000–3999   | Existence       | `NotFound` (3000), `AlreadyExists` (3001)                  |
| 4000–4999   | Balance         | `InsufficientBalance` (4000), `InsufficientFunds` (4001)   |
| 5000–5999   | Operation       | `OperationFailed` (5000), `Paused` (5003)                  |

- Each variant has a doc comment. That comment is the human-readable meaning used by SDK and error-mapping code.

### 2. Storage keys

- Shared state is keyed through a single `DataKey` enum per contract. Keys are never built from raw strings or ad-hoc `Symbol`s at call sites.
- Variant names are `PascalCase`. Each variant documents its stored value type in a trailing comment, for example `CrossContractCall(u64)` maps to `CrossContractCallRecord`.
- Instance storage holds contract-wide configuration such as `Admin` and `NextCallId`. Per-entity records use keys with an identifier payload, such as `Role(Address)`.
- Event topics use `symbol_short!` with a short namespace and action pair, for example `("shared", "call_init")`. Topics must fit the `symbol_short!` length limit.

### 3. TTL and ledger constants

- All ledger-based TTL values come from `contracts/shared/src/constants.rs`. Contracts must not hard-code TTL numbers.
- The current constants are:
  - `MIN_TEMP_ENTRY_TTL = 1_000` ledgers
  - `MIN_PERSISTENT_ENTRY_TTL = 1_000` ledgers
  - `MAX_ENTRY_TTL = 100_000` ledgers
- Values are in ledgers, not seconds. Doc comments may give approximate wall-clock equivalents for testnet, and those equivalents are informational only.

### 4. Numeric constants

- Basis points use `BASIS_POINTS_DENOMINATOR = 10_000` (1 bps = 0.01%).
- Fixed-point accumulators use `PRECISION_SCALE_12 = 10^12`.
- Any other magic number used in a calculation should be added to `constants.rs` with a doc comment.

### 5. Shared helpers

- Authorization uses `access.rs` (`require_admin` and related checks). Contracts must not write their own admin checks.
- Emergency pause uses `pausable.rs`, and reentrancy guards use `reentrancy.rs`.

---

## Rationale

- **One error vocabulary.** Clients and monitoring can map a code to a category from its range alone.
- **Typed keys.** A single `DataKey` enum makes every storage key visible in one place and prevents key collisions between features.
- **Ledger units.** Ledgers are the only deterministic time unit on Soroban. Naming TTL values in ledgers avoids drift from wall-clock assumptions.
- **Alternatives considered:**
  - *Each contract defines its own error enum with no shared ranges.* Rejected because it gives the same meaning to different codes across crates.
  - *Store TTL values in each contract.* Rejected because a change to network timing would then need edits in many places.

### Trade-offs accepted

- Domain errors have to pick codes outside the shared ranges, which limits how the ranges can grow.
- Existing contracts may not follow every rule. They are not required to migrate in this ADR.

---

## Consequences

### Positive

- Error codes, storage keys, and TTL values have one reference point for review and audits.

### Negative

- New contracts must read `contracts/shared` before defining their own errors and keys.

### Neutral

- No change to deployed contracts or their WASM.

---

## Implementation Notes

- **Files:** `contracts/shared/src/errors.rs`, `constants.rs`, `lib.rs`, `access.rs`, `pausable.rs`, `reentrancy.rs`.
- **Migration:** Existing contracts should be checked against this ADR as they are touched. Changes that alter an on-chain error code or storage key are upgrades and must follow [contract-upgrades.md](../contract-upgrades.md). Do not renumber a deployed error.
- **Enforcement:** Code review. A possible follow-up is a test that asserts no two `SharedError` variants share a code.
- **Rollback:** Not applicable. This ADR is documentation only.

---

## References

- [ADR-006: Contract-Per-Domain Architecture](./ADR-006-contract-per-domain-architecture.md)
- [ADR-007: `contracts/shared` for Common Contract Code](./ADR-007-shared-crate-for-common-code.md)
- [ADR-0001: Soroban Contract Module Boundaries](./0001-contract-module-boundaries.md)
- [Contract upgrades guide](../contract-upgrades.md)
- GitHub issue #1259

---

## Revision History

| Date       | Author                        | Change           |
| ---------- | ----------------------------- | ---------------- |
| 2026-10-16 | Brain-Storm Smart Contracts Team | Initial proposal |
