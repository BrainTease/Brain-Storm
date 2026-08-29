# ADR-008: `registry` and `integration` Are Different Kinds of Crates

**Status:** Accepted

**Date:** 2026-07-25

**Author(s):** Brain-Storm maintainers

---

## Context

Two crate names in `contracts/` are easy to conflate: `registry` and `integration`. Both sound like they could be about "wiring contracts together," but they solve unrelated problems:

- `contracts/registry` (crate name `registry`) is a **production Soroban contract** (`#[contract] pub struct RegistryContract`) that tracks per-user verification levels, certified skills (with expiry), specialisations, curator permissions, and a paginated global user directory (`register_user`, `list_users`, `list_users_by_level`, `total_users`). It has its own `src/lib.rs`, is a workspace member, and compiles to WASM for deployment.
- `contracts/integration` (crate name `brain-storm-integration`) has **no `src/lib.rs` and no `#[contract]` struct at all** — only a `Cargo.toml` and `tests/integration.rs`. It is a `[dev-dependencies]`-only crate that path-depends on `brain-storm-analytics`, `brain-storm-token`, and `brain-storm-shared` (per its `Cargo.toml`) purely to deploy those three contracts inside a single Soroban test `Env` and script an end-to-end register → progress → reward flow, asserting on emitted events and final state (see `contracts/integration/README.md`).

New contributors reasonably ask why "integration" isn't just test code living inside `registry`, or why registry-style directory/lookup functionality isn't itself called "integration." This ADR records the distinction.

## Decision

Keep `registry` as an ordinary production contract crate, and keep `integration` as a **workspace-only test harness crate that is never compiled to WASM or deployed**. The two names refer to unrelated concepts (a user directory/verification contract vs. a cross-contract test harness) and should not be merged or renamed to imply a relationship.

## Rationale

**Why can't multi-contract integration tests live inside one of the contracts they test (e.g. inside `analytics` or `token`)?**
A contract crate that path-depends on sibling contract crates (even as `[dev-dependencies]`) to deploy them inside its own tests would need those siblings to depend back on it for symmetry, or would asymmetrically entangle one "primary" contract with testing responsibility for flows that aren't really about that contract. `contracts/integration/Cargo.toml` shows the actual pattern used instead: a crate with **no production code of its own**, whose only job is to `[dev-dependencies]`-depend on `brain-storm-analytics`, `brain-storm-token`, and `brain-storm-shared` and drive them together via `env.register_contract` + generated `*Client` types in `testutils` mode. This keeps every production contract's `Cargo.toml` free of any dependency on its siblings (see [ADR-006](./ADR-006-contract-per-domain-architecture.md)), while still allowing realistic, multi-contract, single-ledger test scenarios to exist somewhere in the workspace.

**Why is this useful given each contract already has its own `tests.rs`?**
Per-contract `#[cfg(test)] mod tests` (present in `analytics`, `token`, `nft`, `market`, `registry`, `royalty_distribution`, and others) verifies a single contract's logic in isolation. It cannot verify what happens when, e.g., a student's on-chain progress record in `analytics` is used to justify an admin minting BST via `token` in the same session — that requires deploying both contracts into one `Env` and asserting on the combined outcome, which is exactly what `contracts/integration/tests/integration.rs` does. The `.github/workflows/contract-integration.yml` CI job (per `contracts/integration/README.md`) additionally spins up a real local Stellar sandbox and deploys the WASM artifacts, closer to a production deployment than the in-process `testutils::Address` scenario.

**Why is `registry`'s user-directory/verification-level functionality not itself the "integration" layer?**
`registry` answers questions about a _single_ domain — "what is this user's verification level / certified skills / specialisations" — backed by its own storage. It doesn't call, and isn't called by, any other contract on-chain (confirmed: no `invoke_contract` or `#[contractclient]` usage in `contracts/registry/src/lib.rs`). Its "batch" operations (`batch_register_users`, `batch_set_verification_levels`) reduce the number of _transactions_ a caller needs, but do not integrate with other contracts. Naming or treating it as an integration layer would misrepresent what it does.

**Alternatives considered**

1. **Delete `contracts/integration` and rely solely on per-contract unit tests.** Rejected — multi-contract interaction bugs (e.g. an event topic mismatch between what `analytics` emits and what a listener expects) are exactly the class of bug unit tests in a single contract can't catch.
2. **Move `tests/integration.rs` into the root `Cargo.toml`'s workspace-level `[dev-dependencies]` without a dedicated crate.** Rejected — Cargo workspaces don't have a "workspace-level test" concept; a crate is the natural unit, and keeping it as its own crate lets it appear as its own CI job (`contract-integration.yml`) with its own sandbox lifecycle.
3. **Rename `registry` to something like `directory` to reduce naming confusion with `integration`.** Not adopted — out of scope for a documentation-only change, and the current name is otherwise accurate (it's the registry of users/skills/verification, in the same sense as a service registry). Noted here as a possible future cleanup if the naming confusion recurs.

## Consequences

### Positive

- Production contracts never take on cross-sibling dependencies for the sake of testing.
- `contracts/integration` can freely add path dependencies on any contract crate it needs to test together, without those contracts knowing or caring.
- CI can treat `contract-integration.yml` as a distinct, sandboxed job from the fast per-crate `cargo test` runs.

### Negative

- `contracts/integration` currently only exercises `analytics` + `token` + `shared` (3 of 18 production contracts). The three _actual_ on-chain cross-contract call edges documented in [ADR-006](./ADR-006-contract-per-domain-architecture.md#verified-on-chain-call-graph) — `credential_metadata → nft`, `governance → token`, `grants → token` — are **not** covered by this harness today. This is a real test-coverage gap, not a design flaw in the separation itself; a natural follow-up is extending `contracts/integration`'s `[dev-dependencies]` to cover those three pairs.
- Because `contracts/integration` has no `src/lib.rs`, `cargo doc` produces no crate documentation for it; its only documentation is `contracts/integration/README.md`.

### Neutral

- `registry` and `integration` will keep sitting next to each other alphabetically in `contracts/` and in workspace listings; the naming similarity is coincidental, not a sign of a relationship.

## References

- [contracts/registry/src/lib.rs](../../contracts/registry/src/lib.rs)
- [contracts/integration/Cargo.toml](../../contracts/integration/Cargo.toml)
- [contracts/integration/README.md](../../contracts/integration/README.md)
- [contracts/integration/tests/integration.rs](../../contracts/integration/tests/integration.rs)
- [ADR-006: Contract-Per-Domain Architecture](./ADR-006-contract-per-domain-architecture.md)
- [Issue #762](https://github.com/BrainTease/Brain-Storm/issues/762)

## Revision History

| Date       | Author                  | Change                          |
| ---------- | ----------------------- | ------------------------------- |
| 2026-07-25 | Brain-Storm maintainers | Initial proposal for issue #762 |
