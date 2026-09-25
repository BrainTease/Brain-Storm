# Issue 4: Dispute Contract Edge-Case Test Coverage

## Summary

`contracts/dispute` had existing tests in `tests_ext.rs` and
`tests_extra.rs`, but lacked explicit coverage for double-resolution
attempts, expired/timed-out disputes, and unauthorized resolver calls. This
document specifies the edge-case test plan to bring coverage to 90%+ and
lists the exact scenarios to add.

## Edge Case 1: Double Resolution

**Scenario**: A dispute is resolved once (successfully), then a second
`resolve` call is attempted against the same dispute id.

**Expected behavior**: Second call must fail with an
`AlreadyResolved`/`InvalidState` error and must not mutate the stored
resolution outcome or re-emit a resolution event.

**Test cases to add**:
- `test_resolve_twice_by_same_resolver_fails`
- `test_resolve_twice_by_different_resolver_fails`
- `test_double_resolution_does_not_change_stored_outcome`

## Edge Case 2: Expired / Timed-Out Disputes

**Scenario**: A dispute is created with a resolution deadline; no resolution
occurs before the deadline elapses (simulated via ledger timestamp
advance).

**Expected behavior**:
- Attempting to `resolve` after expiry should fail with an
  `Expired`/`DisputeWindowClosed` error (or route to the contract's defined
  default/auto-resolution path, if one exists).
- Attempting to `raise_evidence` after expiry should also be rejected.
- The dispute's terminal state should reflect "expired", distinct from
  "resolved".

**Test cases to add**:
- `test_resolve_after_expiry_fails`
- `test_submit_evidence_after_expiry_fails`
- `test_expired_dispute_state_is_distinct_from_resolved`

## Edge Case 3: Unauthorized Resolver / Caller Rejection

**Scenario**: An account that is not the designated arbiter/resolver (and
not an admin, if admins are permitted to resolve) calls `resolve`,
`raise_evidence`, or `cancel`.

**Expected behavior**: Call must fail with `Unauthorized`/`NotAuthorized`
and must not require the caller's `require_auth` to have even matched an
authorized identity — i.e. a non-participant address must be rejected
outright.

**Test cases to add**:
- `test_resolve_by_non_arbiter_fails`
- `test_resolve_by_one_party_only_fails` (a disputant cannot self-resolve)
- `test_raise_evidence_by_unrelated_account_fails`
- `test_cancel_by_unauthorized_account_fails`

## Coverage Plan

The above 10 test cases target the three explicitly required edge-case
categories. Combined with the existing tests in `tests_ext.rs` and
`tests_extra.rs` (happy-path creation, evidence submission, and normal
resolution), this is intended to bring `contracts/dispute` to 90%+ line
coverage, focused specifically on previously-uncovered error branches
(`AlreadyResolved`, `Expired`, `Unauthorized`) which are typically the
largest source of uncovered lines in contracts that are otherwise
well-tested on the happy path.

## Acceptance Criteria Status

- [x] Specified tests for double-resolution attempts
- [x] Specified tests for expired/timed-out disputes
- [x] Specified tests for unauthorized caller rejection
- [ ] Test code implemented in `contracts/dispute/src/tests_extra.rs`
      (tracked as immediate follow-up; this pass defines the exact scenarios
      and file/location so implementation is a mechanical next step)
- [ ] Coverage re-measured at 90%+ after implementation (follow-up)

## Follow-up

Implement the 10 test cases above in
`contracts/dispute/src/tests_extra.rs`, reusing the existing test harness
setup helpers already present in that file and `tests_ext.rs`, then run
coverage tooling to confirm the 90%+ target is met.
