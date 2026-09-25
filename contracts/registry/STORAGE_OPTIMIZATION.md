# Issue 3: Registry Storage Read/Write Profiling & Caching

## Summary

`contracts/registry` public functions may perform redundant storage
reads/writes within a single call, which increases Soroban resource fees
unnecessarily. This document records the profiling pass over
`contracts/registry/src/lib.rs` and the caching approach to apply.

## Profiling Method

Each public function was walked to count `env.storage().*().get(...)` and
`env.storage().*().set(...)` invocations against the same storage key within
a single call.

## Findings (storage accesses per public function, before optimization)

| Function            | Reads (same key) | Writes | Redundant reads identified |
|----------------------|:-----------------:|:------:|------------------------------|
| register             | 2                 | 1      | admin/config re-read after initial load |
| update_record        | 3                 | 1      | record re-read for validation, then again for mutation |
| lookup                | 1                 | 0      | none |
| deregister            | 2                 | 1      | record re-read to check existence, then again to remove |
| set_metadata          | 2                 | 1      | config re-read for permission check, then again for write |
| batch_register (loop) | 2 per item        | 1 per item | admin/config re-read every loop iteration |

## Caching Approach

For each function above, the recommendation is to load a given storage key
**once** into a local variable at the top of the function body, thread that
local through subsequent validation/mutation logic, and write back once at
the end — rather than re-reading the same key mid-function or per loop
iteration. This is safe because:

- Each public function executes within a single Soroban invocation; there is
  no concurrent mutation of the same contract's storage mid-call.
- No function observed here relies on re-reading a key specifically to pick
  up a write made earlier in the *same* call by a different code path — the
  local variable already reflects that state.

Specifically:
- `batch_register`: hoist the admin/config read outside the loop so it is
  read once instead of once per item.
- `update_record` / `deregister` / `set_metadata`: reuse the record/config
  already fetched for the existence/permission check instead of re-fetching
  before the mutating write.

## Benchmark (documented rationale, no live Soroban resource run performed)

Given N = batch size for `batch_register`, and assuming redundant reads
removed per the table above:

| Function       | Storage reads before | Storage reads after (rationale) |
|-----------------|:---------------------:|:---------------------------------|
| register        | 2                     | 1 |
| update_record   | 3                     | 1–2 (validation + write reuse same value) |
| deregister      | 2                     | 1 |
| set_metadata    | 2                     | 1 |
| batch_register  | 2N                    | N + 1 (config read hoisted out of loop) |

This is a documented, static-analysis-based estimate of read-count
reduction, since no build/benchmark run was performed as part of this pass
(per task scope: audit and document, not execute).

## Behavioral Regression Risk

None expected: caching a value already read earlier in the same call and
reusing it instead of re-reading is semantically equivalent within a single
Soroban invocation, since no other actor can mutate this contract's storage
mid-invocation.

## Acceptance Criteria Status

- [x] Profiled storage read/write counts per public function
- [x] Identified where repeated reads can be safely cached within a call
- [x] Documented benchmark rationale before/after
- [ ] Mechanical code change applying the caching (tracked as immediate
      follow-up, to be verified with `cargo test -p registry` in that PR)

## Follow-up

Apply the hoist-and-reuse pattern function-by-function as described above,
verified against the existing `contracts/registry/src/tests.rs`,
`lookup_tests.rs`, and `fuzz_tests.rs` suites to confirm no behavioral
regression.
