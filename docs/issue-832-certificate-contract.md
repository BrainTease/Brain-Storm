# Issue #832 — Split large certificate contract lib.rs into focused submodules

## Status: not applicable to current codebase

Issue #832 asks to map responsibilities and split a "certificate
contract" `lib.rs` into submodules. No such contract exists in this
repository, large or otherwise.

The Soroban workspace (`Cargo.toml`) currently defines exactly three
contracts, none named `certificate`:

- `contracts/analytics/src/lib.rs` — 52 lines
- `contracts/token/src/lib.rs` — ~155 lines after the SEP-41 refactor in #830
- `contracts/shared/src/lib.rs` — 47 lines, plus `math.rs` added in #833

None of these are large enough to warrant a submodule split (the project's
own "3+ days" estimate implies something on the order of hundreds of
lines with multiple responsibilities). `git log --all --diff-filter=A --
'*certificate*'` returns no history of a certificate contract ever having
existed in this repo.

## How certificates actually work today

Per `README.md` and `apps/backend/src/stellar/stellar.service.ts`,
"certificates" are not a Soroban contract at all — they're issued via a
Horizon `manageData` operation (`mintCredentialViaHorizon`), with an
on-chain `record_progress` call to the analytics contract as a
best-effort companion write:

```
StellarService.issueCredential()
  → recordProgress()        // Soroban: contracts/analytics
  → mintCredentialViaHorizon() // Horizon manageData, not a contract
```

There's no `lib.rs` to split because there's no certificate contract
implementation — the whole "contract" is one `Operation.manageData` call
in TypeScript.

## Recommendation

- If a dedicated on-chain certificate contract is intended to replace the
  current Horizon `manageData` approach, this issue should be re-scoped
  as **"design and implement a certificate contract"**, which is a
  greenfield build, not a refactor/split.
- If the intent was actually the analytics contract, re-file by name —
  it's currently 52 lines with two methods and doesn't meet any
  reasonable bar for a module split yet.
- No code changes were made against this issue. Re-scope or close.
