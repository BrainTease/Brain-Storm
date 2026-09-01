# #826 — Reentrancy-Safety Review for the Market Contract

Status: **Blocked — target contract does not exist yet**

## Summary

Issue [#826](https://github.com/BrainTease/Brain-Storm/issues/826) asks for a
reentrancy-safety review and guards on the "market contract." As of this
writing, `contracts/` contains only three Soroban contracts:

- `contracts/analytics/src/lib.rs`
- `contracts/shared/src/lib.rs`
- `contracts/token/src/lib.rs`

There is no `market` contract in the repository, and no code anywhere
references a market/marketplace/escrow flow. This doc captures the intended
scope so the work is ready to pick up once the contract exists (or so the
issue can be re-triaged if the contract lives elsewhere).

## Why this matters

Reentrancy is the classic cross-contract-call vulnerability: a callee
(e.g. a token contract invoked mid-transaction) calls back into the market
contract before its first invocation finishes, observing stale storage state
(e.g. a listing marked "sold" only after the external call). Soroban doesn't
prevent this by default — contracts must guard it explicitly.

## Scope once a market contract exists

1. **Investigate current implementation and gaps**
   - Enumerate every function that performs an external call (token
     transfers, cross-contract invocations) interleaved with storage reads/writes.
   - Flag any function where storage is written _after_ an external call
     (check-effects-interactions violation).
2. **Implement guards following existing project conventions**
   - Reentrancy guard flag in instance storage (set before external call,
     cleared after, asserted unset on entry), or
   - Reorder logic to follow checks-effects-interactions so no external call
     precedes the relevant state mutation.
3. **Update affected call sites and documentation**
   - Any client/SDK code or other contracts invoking the market contract.
4. **Verify with tests**
   - Unit tests simulating a malicious callback attempting to re-enter mid-call.
   - Regression tests for the existing (non-adversarial) market flows.

## Acceptance criteria

- [ ] Investigate current implementation and gaps
- [ ] Implement the change following existing project conventions
- [ ] Tested (unit — simulate reentrant callback; integration if cross-contract)
- [ ] Code review passed
- [ ] Related tests passing

## Recommended next step

Confirm with the issue author whether the market contract:

- hasn't been written yet (this is groundwork for a future contract), or
- lives in a different repo/branch not currently checked out here.

Priority is P1-High per the issue, but without a target contract this can't
be implemented — flag before scheduling engineering time against it.
