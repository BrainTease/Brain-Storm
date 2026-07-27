# Issue #831 — Reduce redundant storage reads in reputation contract

## Status: not applicable to current codebase

Issue #831 asks to investigate and reduce redundant storage reads in a
"reputation contract." No such contract exists in this repository.

The Soroban workspace (`Cargo.toml`) currently defines exactly three
contracts:

- `contracts/analytics` — on-chain course progress tracking
- `contracts/token` — reward token, refactored for SEP-41 alignment in #830
- `contracts/shared` — RBAC roles and shared utilities, including the
  overflow-safe math helpers added in `math.rs` for #833

There is no `reputation` module anywhere in the current source tree or in
git history (`git log --all --diff-filter=A -- '*reputation*'` returns
nothing). This issue appears to have been scoped against a contract that
either was never built or lives outside this repo.

## Closest existing analogue

`contracts/analytics` is the only contract that resembles a
"reputation"-style module — it stores a per-student, per-course
`ProgressRecord` and looks it up by `DataKey::Progress(student, course_id)`.
It's small (52 lines) and already minimal:

- `record_progress` does a single write, no reads.
- `get_progress` does a single read.

There's no redundant-read pattern to remove there today — both entry
points already touch storage exactly once.

## Recommendation

- If a reputation contract is planned, scope this issue as **"design and
  implement a reputation contract"** rather than a refactor, since there's
  no existing implementation to optimize. That's a materially different
  (and larger) piece of work than what's described.
- If "reputation" was meant to refer to `contracts/analytics`, re-file
  against that contract by name — as it stands there's no redundant-read
  issue to fix there.
- No code changes were made against this issue. Re-scope or close.
