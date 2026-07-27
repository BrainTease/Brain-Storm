# #829 — Governance Contract: Proposal-Spam Vector Audit

Status: **Blocked — target contract does not exist; issue body is inconsistent with its title**

## Summary

Issue [#829](https://github.com/BrainTease/Brain-Storm/issues/829) is titled
"Audit governance contract for proposal-spam vector and add safeguards," but
its task list and acceptance criteria describe dead-code removal ("Identify
all unused/dead references via static analysis," "Confirm no runtime or test
dependency remains") — a different piece of work entirely, and one that
doesn't match the title either. This looks like a template/generation
mismatch worth flagging back to whoever filed it, separate from the "no such
contract" gap shared by #826–#828.

There is no `governance` contract in `contracts/` (only `analytics`,
`shared`, `token`), and no code anywhere references proposals, voting, or
governance.

## Two possible interpretations

### A. Proposal-spam audit (per the title)

If a governance contract existed with a `create_proposal`-style entry
point, the concern is: nothing stops an address from calling it repeatedly
to flood storage / spam voters. Standard Soroban safeguards:

1. **Investigate current implementation and gaps**
   - Does `create_proposal` charge a bond, require a minimum token balance,
     or rate-limit per-caller?
2. **Implement safeguards following existing project conventions**
   - Proposal bond (refunded/slashed based on outcome), and/or
   - Per-address cooldown (track `DataKey::LastProposal(Address) -> ledger timestamp`,
     reject if under a minimum interval), and/or
   - Minimum-stake gate using the existing `Role` pattern from
     `contracts/shared` (e.g. require `Role::Instructor`/`Role::Admin` or a
     token-balance threshold via `contracts/token`).
3. **Update affected call sites and documentation**
4. **Verify with tests**
   - Test that N rapid proposal calls from one address are rejected after
     the threshold/cooldown.

### B. Dead-code cleanup (per the task list)

If this is actually a static-analysis dead-code pass over an existing
contract:

1. Run `cargo clippy --all-targets -- -D warnings` and `cargo +nightly udeps`
   (or equivalent) across the workspace to flag unused functions/imports.
2. Confirm no removed item is a public contract entry point relied on by
   tests, clients, or other contracts (check `apps/` for SDK bindings).
3. Remove and re-run `cargo test --workspace`.

This interpretation doesn't need a `governance` contract to exist — it could
apply to `analytics`, `shared`, or `token` today.

## Acceptance criteria (as filed)

- [ ] Identify all unused/dead references via static analysis
- [ ] Confirm no runtime or test dependency remains
- [ ] Tested (unit/integration)
- [ ] Code review passed
- [ ] Related tests passing

## Recommended next step

Flag the title/body mismatch to the issue author before scoping engineering
time. If the intent is (A), it's blocked on the governance contract existing
(same gap as [#826](826-market-reentrancy-review.md) and
[#827](827-royalty-distribution-instruction-count.md)). If the intent is
(B), it's actionable now — a `cargo clippy`/`cargo udeps` pass over the
existing three contracts — but the issue should be retitled to match.
