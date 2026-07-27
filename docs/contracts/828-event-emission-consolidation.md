# #828 — Consolidate Duplicate Event-Emission Patterns

Status: **Partially applicable — only 3 contracts exist, none currently emit events**

## Summary

Issue [#828](https://github.com/BrainTease/Brain-Storm/issues/828) asks to
consolidate duplicate event-emission patterns "across contracts." The repo
currently has three Soroban contracts:

- `contracts/analytics/src/lib.rs`
- `contracts/shared/src/lib.rs`
- `contracts/token/src/lib.rs`

None of them currently call `env.events().publish(...)` — none emit any
Soroban events at all (checked via repo-wide search for `events()` and
`publish`, both had zero matches). So there is no *duplication* to
consolidate yet. The issue is really a prerequisite: establish one shared
event-emission pattern before contracts start emitting events independently
and drift.

## Why this matters

Note on architecture: `contracts/shared` is itself a *deployed* Soroban
contract (`SharedContract`, handling admin/role assignment) — it is not a
code-sharing library crate. Neither `contracts/token/Cargo.toml` nor
`contracts/analytics/Cargo.toml` depends on it; each contract only depends
on `soroban-sdk` directly. So there's no existing place for a cross-contract
Rust helper to live yet — one would need to be created.

Deciding the event pattern once, centrally, avoids each contract (token,
analytics, and future ones like market/governance/royalty_distribution from
[#826](826-market-reentrancy-review.md)/[#827](827-royalty-distribution-instruction-count.md))
inventing its own topic/data shape.

## Scope

1. **Map current responsibilities and identify seams**
   - Confirm via `grep -r "events()"` across `contracts/` that no emission
     exists yet (true as of this doc).
   - Decide the target shape: topic naming convention (e.g.
     `(symbol_short!("transfer"), from, to)`), and whether event data is a
     struct, tuple, or `Vec`.
2. **Extract/split into focused modules with clear boundaries**
   - Introduce a new workspace library crate (e.g. `contracts/common`, added
     to the root `Cargo.toml` `[workspace] members`) exporting a small events
     helper (e.g. `common::events::emit_transfer(env, from, to, amount)`).
   - Do not overload the existing `contracts/shared` package for this — it's
     a deployed RBAC contract with its own responsibility, not a library.
   - Add the new crate as a `[dependencies]` entry in `token`'s and
     `analytics`'s `Cargo.toml` so they can call the helper directly.
3. **Update all call sites and imports**
   - Wire `token::mint_reward` (and any future state-changing functions in
     `analytics`) through the shared helper.
4. **Add/adjust tests to cover the refactored structure**
   - Use Soroban's test `env.events().all()` assertions to confirm the
     right topics/data are published for each mutating call.

## Acceptance criteria

- [ ] Map current responsibilities and identify seams
- [ ] Extract/split into focused modules with clear boundaries
- [ ] Tested (unit — assert emitted events per call)
- [ ] Code review passed
- [ ] Related tests passing

## Recommended next step

This is the one issue in the #826–#829 batch that's actionable now, since
`shared` and `token` already exist. Start by adding the events helper to
`contracts/shared` and wiring `token::mint_reward` through it — that gives a
concrete pattern for `analytics` and any future contracts to follow instead
of each inventing its own.
