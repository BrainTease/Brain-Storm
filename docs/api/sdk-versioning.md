# `@brain-storm/sdk` — Versioning Policy

How `packages/sdk` is versioned, what counts as a breaking change, and where changes are recorded.

- **API reference:** [`sdk-reference.md`](./sdk-reference.md)
- **Changelog:** [`packages/sdk/CHANGELOG.md`](../../packages/sdk/CHANGELOG.md)
- **HTTP API versioning (a separate contract):** [`../api-versioning.md`](../api-versioning.md)

---

## Scope of the contract

The SDK sits between two contracts, and this policy governs only the first:

1. **The TypeScript surface** — everything exported from `packages/sdk/src/index.ts`. Versioned by the semver rules below.
2. **The HTTP API** — the `/v1/*` routes the SDK calls. Versioned separately by [`api-versioning.md`](../api-versioning.md).

They move independently. The SDK can ship a major (renaming a method) without any API change, and the API can ship `/v2` without an SDK major if the SDK keeps calling `/v1`.

> **This SDK does not build, sign or submit Stellar or Soroban transactions.** Issue #766 framed the policy around transaction building; the actual surface is an HTTP client whose only Stellar touchpoint is one balance read. The rules below are written for what exists. If transaction building is ever added, the [reserved rules](#reserved-rules-for-transaction-building) apply.

**Explicitly out of scope:**

- Anything not exported from `src/index.ts` — including the resource classes `AuthClient`, `CoursesClient`, `ProgressClient`, `UsersClient`, `StellarClient` and `FetchHttpAdapter`. Their _methods_, reachable via `client.auth`, `client.courses` and so on, **are** in scope. The class names are not.
- The `dist/` build layout, `openapi.json`, and the contents of this repo's `scripts/`.
- Anything reached by deep import (`@brain-storm/sdk/dist/...`). Only the package root is public.

## Semver rules

`MAJOR.MINOR.PATCH`, per [semver 2.0.0](https://semver.org/). The SDK is at `1.0.0`, so **the stability guarantees below are already in force** — there is no `0.x` grace period.

### MAJOR — breaking

Ship a major when existing consumer code must change to keep compiling or working.

| Category               | Examples                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Removals & renames** | Removing or renaming any export; removing a method from a namespace; renaming a namespace (`client.courses` → `client.catalogue`).         |
| **Required inputs**    | Adding a required field to a `*Dto`; making an existing optional field required; adding a required constructor option.                     |
| **Narrowing inputs**   | Tightening an accepted type (`string` → a string union); narrowing a numeric range the server now rejects.                                 |
| **Widening outputs**   | Adding a member to a response **union** (`level: 'beginner' \| … \| 'expert'`) — exhaustive `switch` statements downstream stop compiling. |
| **Narrowing outputs**  | Making a required response field optional; changing a field's type (`string` → `number`, including "just" `createdAt` to `Date`).          |
| **Error behaviour**    | Changing what is thrown, or the shape assigned onto the thrown `Error`; converting a throw into a returned error value.                    |
| **Auth semantics**     | Making a previously-anonymous method require a token; changing `setToken`'s effect.                                                        |
| **Peer dependencies**  | Adding, removing or narrowing a `peerDependencies` range — including removing the currently-unused `axios` peer.                           |
| **Runtime floor**      | Raising the minimum Node version or requiring a newly-global API.                                                                          |
| **Endpoint remapping** | Repointing a method at a different HTTP endpoint with different semantics.                                                                 |

Two cases deserve emphasis because they read as harmless:

- **Expanding a response enum is breaking here.** [`api-versioning.md`](../api-versioning.md) lists "expanding an enum with new values" as non-breaking for the _HTTP_ contract, and that is correct — a JSON consumer tolerates an unknown string. But a TypeScript union is checked at compile time, so adding `'expert'` to `CourseDto['level']` breaks every exhaustive `switch` downstream. **The two documents do not contradict each other; they govern different contracts.** To add a tier without a major, widen the field to `string` first (itself a major), or model it as `'beginner' | 'intermediate' | 'advanced' | (string & {})` from the outset. This is why [`UserDto.role`](./sdk-reference.md#userdto) is deliberately a plain `string`.
- **Changing a decimal string to a number is breaking and lossy.** `StellarBalanceResponse.balances[].balance` is a string to preserve Stellar's 7-digit precision. Never "fix" it to `number`.

### MINOR — additive

Ship a minor when consumers can upgrade without touching their code.

- A new export (type, interface, class, function).
- A new method on an existing namespace, or a new namespace on `BrainStormClient`.
- A new **optional** field on a request `*Dto`, or a new optional constructor option — such as making [`HttpAdapter`](./sdk-reference.md#httpadapter) injectable.
- A new **optional** field on a response type.
- Loosening an accepted input type (a string union → `string`).
- Deprecating something with `@deprecated` while it keeps working.
- Exporting a name that was previously internal — e.g. the resource client classes.

### PATCH — neither

- Bug fixes that restore documented behaviour.
- TSDoc, README and reference-doc edits.
- Internal refactors with no surface change — including fixing the broken `npm run generate` script.
- Dependency bumps that do not alter `peerDependencies`.

### The judgement call

When a change sits on a boundary, **ask whether a consumer's unchanged code could stop compiling or start behaving differently.** If yes, it is breaking, regardless of how small it looks. When still unsure, treat it as breaking — a needless major costs a version number; a missed one costs downstream trust.

## Deprecation before removal

Removals are majors, but a major is not a licence to remove without warning.

1. Mark the export with TSDoc `@deprecated`, naming the replacement:
   ```typescript
   /** @deprecated Use {@link BrainStormClient.courses}`.list` instead. Removed in 3.0.0. */
   ```
2. Note it in `CHANGELOG.md` under `### Deprecated`, with the target removal version.
3. Keep it working for **at least one minor release** so consumers get a compiler warning before a compile error.
4. Remove it in the next major, listed under `### ⚠ BREAKING CHANGES`.

This mirrors the HTTP API's [deprecation timeline](../api-versioning.md#deprecation-timeline). Where an SDK deprecation is driven by an API sunset, the SDK's removal must not land before the API's ≥ 90-day parallel-support window closes.

## Where changes are recorded

### Location

**`packages/sdk/CHANGELOG.md`** — one changelog per package, adjacent to the code. Not the root changelog: the SDK versions independently of the monorepo.

### Format

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) headings, with release-please's `### ⚠ BREAKING CHANGES` section so the two conventions coexist:

```markdown
## [2.0.0] - 2026-08-01

### ⚠ BREAKING CHANGES

- **courses:** `list()` now returns `CourseListResponse` rather than `CourseDto[]`.
  Migrate by reading `.data`: `(await client.courses.list()).data`

### Added

- **stellar:** `getAccount()` for full account details ([#123](…))

### Deprecated

- **courses:** `getAll()` — use `list()`. Removed in 3.0.0.

### Fixed

- `setToken()` no longer drops custom headers passed via `options` ([#456](…))
```

Every breaking entry **must** state the migration, not just the change. A reader upgrading should never need to open the diff.

### Commit convention

The repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint (`.commitlintrc`). Scope SDK commits with `sdk`:

| Commit                                              | Bump  |
| --------------------------------------------------- | ----- |
| `fix(sdk): …`                                       | PATCH |
| `feat(sdk): …`                                      | MINOR |
| `feat(sdk)!: …` or a `BREAKING CHANGE:` footer      | MAJOR |
| `docs(sdk): …`, `refactor(sdk): …`, `chore(sdk): …` | none  |

### Automation status

⚠️ **Not yet automated.** `release-please-config.json` currently configures a single package — the repo root (`"."`, `package-name: brain-storm`) — with `extra-files` for the backend and frontend `package.json`. `packages/sdk` is not listed, so **no release PR or changelog is generated for it today**; `CHANGELOG.md` must be maintained by hand.

To automate it, add to `release-please-config.json`:

```json
"packages/sdk": {
  "release-type": "node",
  "package-name": "@brain-storm/sdk",
  "component": "sdk",
  "changelog-path": "CHANGELOG.md"
}
```

and seed `.release-please-manifest.json` with `"packages/sdk": "1.0.0"`.

This is **deliberately not applied in this PR.** It changes CI behaviour — release-please would begin opening a second release PR per cycle — and that is a maintainer decision, not a documentation one. Tracked as a follow-up. Until then, treat the manual changelog as the release gate.

## Keeping the surface honest

The SDK's `package.json` describes it as "auto-generated from OpenAPI spec", and `packages/sdk/README.md` used to say the same. **It is not.** `scripts/generate-sdk.sh` exports `openapi.json` from the backend and copies it into the package — it never touches `src/index.ts`, which is hand-written.

So the SDK can silently drift from the API it claims to wrap: a backend field rename ships, the SDK's `*Dto` keeps the old name, and consumers get types that compile but do not match the wire.

Until generation is real, drift is caught by review. **When changing the SDK surface:**

1. Diff the affected `*Dto` against the backend DTO in `apps/backend/src/**/dto/`.
2. Re-run the downstream cross-check from [the reference](./sdk-reference.md#downstream-usage-cross-check) and confirm every consumed export is still documented.
3. Update [`sdk-reference.md`](./sdk-reference.md) in the same PR — the reference is derived from TSDoc, so both move together.
4. Add the `CHANGELOG.md` entry, with a migration note if breaking.
5. Classify the bump using the rules above and state it in the PR description.

**When changing a backend DTO,** check whether the SDK mirrors it. If so, the SDK change is part of the same work.

## Reserved rules for transaction building

Not applicable today — recorded so the policy does not have to be renegotiated under pressure if the SDK gains Stellar/Soroban transaction building.

If it does, these count as **MAJOR**:

- Changing the XDR envelope a builder produces, including operation order.
- Changing default fees, timebounds, memo handling, or the base reserve assumed.
- Changing the network passphrase or the default network (testnet ↔ mainnet).
- Changing which account is assumed to be the source, or the signing flow.
- Changing a Soroban contract's method signature, argument encoding, or the deployed contract address a helper targets.
- Changing simulation-before-submit behaviour, or retry/timeout semantics for submission.

Rationale: a transaction that builds successfully but submits differently is worse than one that fails to compile. Anything that alters bytes on the wire, or what a user is asked to sign, is breaking even when the TypeScript signature is untouched.

## See also

- [`sdk-reference.md`](./sdk-reference.md) — the documented surface, and its [known gaps](./sdk-reference.md#known-gaps)
- [`../api-versioning.md`](../api-versioning.md) — HTTP API versioning, deprecation timeline, communication process
- [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) — commit conventions
