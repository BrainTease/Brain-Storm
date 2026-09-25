# Issue 1: Shared Error Consolidation

## Summary

Individual contracts (`escrow`, `market`, `grants`, `dispute`, and others) each
defined their own local error enums, many of which duplicated the same
conceptual failure modes (unauthorized caller, invalid amount, not found,
already resolved/finalized, paused, arithmetic overflow, invalid state
transition). This document records the audit performed against
`contracts/shared/src/errors.rs` and the consolidation plan/approach applied.

## Audit Findings

The following categories of near-duplicate error variants were identified
across contract-local error enums:

| Concept                     | Seen in                                   |
|------------------------------|-------------------------------------------|
| Unauthorized / NotAuthorized  | escrow, market, grants, dispute, registry |
| NotFound (record/id missing)  | escrow, market, grants, dispute, registry |
| AlreadyResolved/AlreadyFinalized | escrow, dispute, grants                |
| InvalidAmount / ZeroAmount     | escrow, market, liquidity_pool          |
| Overflow / Underflow           | escrow, market, liquidity_pool          |
| Paused / ContractPaused        | escrow, market, grants                  |
| InvalidState / InvalidStatus   | escrow, dispute, grants                 |
| Expired / TimedOut             | dispute, escrow                         |

## Consolidation Approach

`contracts/shared/src/errors.rs` is the canonical location for cross-cutting
error variants that are conceptually identical regardless of which contract
raises them. The recommended shared surface (already largely present in
`shared::errors::SharedError`, extended here) is:

- `SharedError::Unauthorized`
- `SharedError::NotFound`
- `SharedError::AlreadyResolved`
- `SharedError::InvalidAmount`
- `SharedError::Overflow`
- `SharedError::Underflow`
- `SharedError::Paused`
- `SharedError::InvalidState`
- `SharedError::Expired`

Contracts should:

1. Import `shared::errors::SharedError` and map/re-export the variants they
   need instead of redefining an equivalent local variant.
2. Keep genuinely contract-specific errors (e.g. `market::MarketError::PriceOutOfBand`,
   `dispute::DisputeError::EvidenceWindowClosed`) local to that contract's
   error enum.
3. Use `From<SharedError> for <Contract>Error` conversions (or a shared
   `#[contracterror]` re-export pattern) so existing call sites that return
   `Result<T, <Contract>Error>` keep compiling without widespread signature
   churn.

## Rollout Notes

This pass focuses on identifying and documenting the overlap and the target
shared surface so each contract can be migrated incrementally without a
single large breaking change. Each contract's local error enum should be
diffed against the table above during its next touch and any exact-duplicate
variant replaced with the shared one plus a `From` impl.

## Acceptance Criteria Status

- [x] Audited each contract's local error definitions for overlap
- [x] Documented consolidation target in `shared::errors`
- [ ] Full mechanical migration of every call site (tracked as follow-up;
      see per-contract TODOs)
- [ ] Coverage re-verification after migration (follow-up)

## Follow-up

A follow-up PR should perform the mechanical `From<SharedError>` wiring per
contract and delete the now-redundant local variants, contract by contract,
verified independently with `cargo test -p <contract>` per crate.
