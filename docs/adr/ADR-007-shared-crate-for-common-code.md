# ADR-007: `contracts/shared` for Common Contract Code

**Status:** Accepted

**Date:** 2026-07-25

**Author(s):** Brain-Storm maintainers

---

## Context

`contracts/shared` (crate name `brain-storm-shared`) is unusual among the 18 production contracts: it is both a library of reusable Soroban patterns (`pausable.rs`, `reentrancy.rs`, `multisig.rs`, `upgrade.rs`, `validation.rs`, `errors.rs`) **and** a deployable contract in its own right (`#[contract] pub struct SharedContract` in `contracts/shared/src/lib.rs`), exposing RBAC (`assign_role`/`has_role`/`has_permission`), a generic authorized cross-contract call registry (`authorize_caller`/`call_contract`/`relay_event`), and pause/reentrancy/upgrade primitives as callable functions.

Contributors have had to guess whether new contracts are expected to depend on `brain-storm-shared` for these patterns. Static analysis of every `contracts/*/Cargo.toml` shows the answer, as of this writing, is **no**: the only crate with a path dependency on `brain-storm-shared` is `contracts/integration`, and it's a `[dev-dependencies]` entry used purely to deploy the shared contract inside integration tests. Every production contract that needs a pause flag or an admin check (e.g. `market::pause`/`unpause`/`is_paused`, `registry::pause`/`unpause`) reimplements it locally rather than calling out to the deployed `shared` contract or depending on `brain-storm-shared` as a library.

This ADR records why the crate exists, what it is for, and — since ADRs must not contradict current code — the honest state of how (and how much) it's actually reused today.

## Decision

We keep `contracts/shared` as a single crate serving two purposes:

1. **A vetted pattern library.** `pausable.rs`, `reentrancy.rs`, `multisig.rs`, `upgrade.rs`, and `validation.rs` are the canonical, tested (`tests.rs`, `upgrade_tests.rs`) implementations of pause-with-auto-unpause, a reentrancy lock, an N-of-M multisig proposal flow, a timelocked WASM upgrade flow, and basic input validation (positive amounts, percentage bounds, future timestamps). Contract authors copy these patterns rather than re-deriving them from scratch.
2. **A deployed RBAC contract.** `SharedContract` is deployed on-chain and provides `Role`/`Permission`-based access control (`Admin`/`Instructor`/`Student` roles) plus a generic `authorize_caller`/`call_contract` registry that lets one contract be recorded as an authorized caller of another. It is the contract deployed alongside `analytics` and `token` in the `contracts/integration` end-to-end test scenario.

What we do **not** currently do is make every other production contract take a compile-time dependency on `brain-storm-shared`, or call the deployed `SharedContract` on-chain for their own pause/admin checks. `market`, `registry`, and every other contract that needs a pause flag or an admin gate implement it inline with `env.storage().instance()` and `admin.require_auth()` directly.

## Rationale

**Why not duplicate the code with no shared crate at all?**
Soroban contracts are independently compiled WASM binaries with no shared runtime — there's no way for two deployed contracts to literally share code the way two services can share a library at runtime. Without a shared *source* crate, the reentrancy guard, the pause auto-unpause math, the multisig threshold/expiry logic, and the timelocked upgrade flow would each be re-derived per contract, multiplying the number of places a subtle bug (e.g. an off-by-one in `expires_ledger` comparison) could hide. Keeping one audited implementation in `contracts/shared/src/*.rs` — even if contract authors copy rather than import it — means code review and security audits (see `docs/CONTRACT_SECURITY.md`) have one canonical implementation to check each contract's inline copy against.

**Why is it also a deployed contract, not just a library?**
RBAC (`Role`/`Permission`) and the authorized-caller registry are naturally *shared state* — "is address X an Instructor" is a fact that should have one on-chain answer, not 18 separate copies that could drift. Deploying `SharedContract` gives a single, queryable source of truth for roles, independent of which other contract is asking. The pause/reentrancy/upgrade *logic*, by contrast, is inherently per-contract state (each contract has its own `Paused` flag for its own storage), so those parts are consumed as copied source rather than through a deployed call.

**Why hasn't compile-time reuse (a real `brain-storm-shared` dependency) happened yet?**
Adding `brain-storm-shared` as a path dependency to, say, `market`'s `Cargo.toml` is straightforward in principle, but doing so was evidently deprioritized in favor of shipping each domain contract's own feature set (`market`'s pause support landed under issue `#663`, `registry`'s under the same batch per its git history — both implemented inline rather than by adding the dependency). This is a real gap, not a deliberate design choice, and is called out as a **negative consequence** below rather than as intended architecture.

**Alternatives considered**
1. **No shared crate; every contract reimplements everything from scratch with no shared reference.** Rejected — no canonical pattern to audit against; higher risk of divergent, subtly-inconsistent pause/reentrancy semantics across 18 contracts.
2. **Make `brain-storm-shared` a real compile-time dependency of every contract, calling `SharedContract::has_permission` etc. instead of local checks.** Not adopted (yet) — every check would become a cross-contract call (gas cost, and a hard runtime dependency on `shared`'s address and interface staying stable across upgrades). This remains a reasonable future direction; see Implementation Notes.
3. **Fold `shared`'s RBAC into `governance`**, since governance already gates upgrades. Rejected — RBAC (who is a Student/Instructor) is a much higher-frequency, lower-stakes read than governance proposals, and coupling the two would mean every role check goes through the governance contract's storage.

## Consequences

### Positive
- One audited reference implementation exists for pause, reentrancy, multisig, and timelocked-upgrade patterns.
- RBAC has a single on-chain source of truth via the deployed `SharedContract`, usable by off-chain systems (`apps/backend`) without querying 18 separate contracts.
- New contracts can bootstrap pause/upgrade support by copying a known-good pattern instead of writing one from scratch.

### Negative
- **No production contract currently depends on `brain-storm-shared` at compile time or calls the deployed `SharedContract` on-chain.** Each contract's pause/admin logic is an independent copy, so a fix to `contracts/shared/src/pausable.rs` does **not** automatically propagate to `market`'s or `registry`'s inline copies — each must be patched separately. Contributors fixing a bug in one contract's pause logic should check whether the same bug exists in every other contract's local copy.
- The deployed `SharedContract`'s `authorize_caller`/`call_contract`/`relay_event` cross-contract-call registry is unused by any of the 18 production contracts today (only exercised in `contracts/integration` tests) — it is speculative infrastructure, not a wired-up convention.

### Neutral
- Adding a real compile-time dependency on `brain-storm-shared` to a production contract is safe to do incrementally, contract by contract — it does not require a workspace-wide migration.

## Implementation Notes

- If you fix a bug in `contracts/shared/src/*.rs`, grep other contracts for the equivalent inline logic (`grep -rn "Paused" contracts/*/src/lib.rs`) and check whether they need the same fix.
- When starting a **new** contract that needs pause/reentrancy/multisig/upgrade support, prefer adding `brain-storm-shared` as a real path dependency over copy-pasting, to start closing the gap described above.
- Do not build new features on `SharedContract::authorize_caller`/`call_contract` without first confirming with a maintainer that this registry is meant to become load-bearing — as of this ADR it is unused by any production contract.

## References

- [contracts/shared/src/lib.rs](../../contracts/shared/src/lib.rs)
- [contracts/shared/src/pausable.rs](../../contracts/shared/src/pausable.rs)
- [contracts/shared/src/multisig.rs](../../contracts/shared/src/multisig.rs)
- [contracts/shared/src/upgrade.rs](../../contracts/shared/src/upgrade.rs)
- [contracts/integration/tests/integration.rs](../../contracts/integration/tests/integration.rs)
- [docs/contract-interfaces.md § Shared / RBAC Contract](../contract-interfaces.md#shared--rbac-contract)
- [ADR-006: Contract-Per-Domain Architecture](./ADR-006-contract-per-domain-architecture.md)
- [Issue #762](https://github.com/BrainTease/Brain-Storm/issues/762)

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-25 | Brain-Storm maintainers | Initial proposal, derived from dependency analysis of `contracts/*/Cargo.toml` for issue #762 |
