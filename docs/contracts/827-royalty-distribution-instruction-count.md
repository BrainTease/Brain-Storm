# #827 — Reduce Instruction Count in `royalty_distribution`

Status: **Blocked — target contract does not exist yet**

## Summary

Issue [#827](https://github.com/BrainTease/Brain-Storm/issues/827) asks for a
refactor of the `royalty_distribution` contract to reduce its Soroban
instruction count (gas/CPU budget). No such contract currently exists in
`contracts/` — the repo has `analytics`, `shared`, and `token` only, and
nothing in the codebase references "royalty" in any form.

## Why this matters

Soroban meters execution by CPU instructions; contracts that iterate over
unbounded collections (e.g. paying out royalties to every holder in a loop)
or perform redundant storage reads/writes risk hitting the per-transaction
instruction limit as usage grows. Catching this early — before the contract
is live — is cheaper than refactoring a deployed, stateful contract later.

## Scope once a royalty_distribution contract exists

1. **Map current responsibilities and identify seams**
   - Identify any O(n) loops over recipients/holders — the most common
     instruction-count blowup in distribution contracts.
   - Identify redundant `env.storage()` reads inside loops (each storage
     access has a fixed instruction cost; hoist reads outside loops where
     possible).
2. **Extract/split into focused modules with clear boundaries**
   - Separate distribution _calculation_ (pure, off-chain-verifiable math)
     from distribution _execution_ (storage writes, transfers).
   - Consider a pull-based payout pattern (recipients withdraw their own
     share) instead of a push-based loop, which is the standard fix for
     unbounded-iteration gas blowup.
3. **Update all call sites and imports**
4. **Add/adjust tests to cover the refactored structure**
   - Include a test with a large recipient count to confirm instruction
     usage stays bounded (Soroban test harness reports budget consumption).

## Acceptance criteria

- [ ] Map current responsibilities and identify seams
- [ ] Extract/split into focused modules with clear boundaries
- [ ] Tested (unit — instruction budget assertions; integration for payout correctness)
- [ ] Code review passed
- [ ] Related tests passing

## Recommended next step

Confirm with the issue author whether `royalty_distribution` is planned but
unbuilt, or exists in a different repo/branch. Priority is P1-High per the
issue, but there's nothing to refactor here yet — this doc exists so the
push-based-vs-pull-based design decision is made _before_ the contract is
first written, not after.
