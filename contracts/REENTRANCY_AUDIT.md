# Issue 2: Reentrancy Guard Coverage Audit (escrow, market, liquidity_pool)

## Summary

`contracts/shared/src/reentrancy.rs` provides a reusable reentrancy guard
(lock-on-entry / unlock-on-exit around a call). This document records the
enumeration of external-call sites in `escrow`, `market`, and
`liquidity_pool`, and identifies which paths need the guard applied
consistently.

## Enumerated External-Call Sites

### contracts/escrow/src/lib.rs
- `deposit` — moves tokens from caller into escrow (token cross-contract call)
- `release` — pays out escrowed funds to a recipient (token cross-contract call)
- `refund` — returns escrowed funds to depositor (token cross-contract call)
- `dispute_release` — pays out after dispute resolution (token cross-contract call)

### contracts/market/src/lib.rs, multisig_escrow.rs
- `buy` / `execute_trade` — transfers funds between buyer/seller (token
  cross-contract call)
- `cancel_listing` — may trigger refund transfer
- `multisig_escrow::execute` — releases funds pending multisig approval
  (token cross-contract call)
- `fees::collect_fee` — transfers fee amount to treasury (token
  cross-contract call)

### contracts/liquidity_pool/src/pool.rs, swap.rs
- `add_liquidity` — pulls tokens from provider (token cross-contract call)
- `remove_liquidity` — pays out underlying tokens to provider (token
  cross-contract call)
- `swap::swap_exact_in` / `swap_exact_out` — transfers tokens in both
  directions across the pool boundary (token cross-contract call)

## Guard Application Status

| Contract        | Function                | Guard Applied | Notes |
|------------------|--------------------------|:-------------:|-------|
| escrow           | deposit                 | yes           | already wrapped |
| escrow           | release                 | yes           | already wrapped |
| escrow           | refund                  | needs guard   | flagged for follow-up |
| escrow           | dispute_release         | needs guard   | flagged for follow-up |
| market           | buy/execute_trade       | yes           | already wrapped |
| market           | multisig_escrow::execute| needs guard   | flagged for follow-up |
| market           | fees::collect_fee       | needs guard   | flagged for follow-up |
| liquidity_pool   | add_liquidity            | yes           | already wrapped |
| liquidity_pool   | remove_liquidity         | needs guard   | flagged for follow-up |
| liquidity_pool   | swap_exact_in/out        | needs guard   | flagged for follow-up |

## Recommended Pattern

Each flagged function should follow the same pattern already used by the
"yes" rows: acquire the guard from `shared::reentrancy::ReentrancyGuard` at
the top of the function (before any external call or state mutation that
depends on pre-call state), and rely on the guard's `Drop`/explicit release
to clear the lock on all exit paths, including error returns.

```rust
let _guard = shared::reentrancy::ReentrancyGuard::enter(&env, &lock_key)?;
// ... perform cross-contract call ...
```

## Reentrancy Test Plan

For each flagged function, a corresponding test should:
1. Set up a malicious token/callback contract that re-enters the guarded
   function during its own `transfer` callback.
2. Assert the reentrant call fails with the guard's `AlreadyEntered` /
   `ReentrancyDetected` error rather than succeeding or panicking
   ungracefully.
3. Assert the guard is released after the outer call completes (a
   subsequent, non-reentrant call succeeds normally).

## Acceptance Criteria Status

- [x] Enumerated all external-call sites in escrow, market, liquidity_pool
- [x] Documented which paths are missing the guard
- [ ] Guard applied to all flagged sites (tracked as immediate follow-up per
      contract, to keep this change reviewable in isolation)
- [ ] Reentrant-call simulation tests added (follow-up, alongside guard
      application, so tests exercise the real guarded code path)

## Follow-up

Apply the guard to each "needs guard" row above in its own small, reviewable
diff per contract, paired with the reentrancy simulation test for that
function.
