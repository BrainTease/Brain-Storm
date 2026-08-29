# Changelog

All notable changes to `@brain-storm/sdk` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with
release-please's `### ⚠ BREAKING CHANGES` heading so both conventions coexist.
This package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
as scoped by [`docs/api/sdk-versioning.md`](../../docs/api/sdk-versioning.md).

> **Maintained by hand.** `packages/sdk` is not yet registered in
> `release-please-config.json`, so no release PR or changelog entry is generated
> for it automatically. Add your entry under `## [Unreleased]` in the same PR as
> the change. See
> [Automation status](../../docs/api/sdk-versioning.md#automation-status).

Every breaking entry must state the **migration**, not only the change.

## [Unreleased]

### Added

- Unit test infrastructure (`jest.config.js`, `tsconfig.jest.json`, `jest`/`ts-jest`
  devDependencies) and a full test suite (`src/index.test.ts`) covering
  `BrainStormClient`'s HTTP adapter behaviour and all five resource clients
  (`auth`, `courses`, `progress`, `users`, `stellar`) against a mocked global
  `fetch`. Run with `npm test` / `npm run test:coverage` from `packages/sdk`.
- Full TSDoc on every public export in `src/index.ts`, covering intended usage,
  optional-field semantics, thrown errors, and the precision constraint on
  Stellar balance strings.
- [`docs/api/sdk-reference.md`](../../docs/api/sdk-reference.md) — complete
  reference for the public surface, including which names are internal and a
  reproducible downstream-usage cross-check.
- [`docs/api/sdk-versioning.md`](../../docs/api/sdk-versioning.md) — semver
  policy, deprecation process, changelog location and format, and reserved rules
  should the SDK ever gain Stellar/Soroban transaction building.
- This changelog.

### Fixed

- `CoursesClient.list` (`client.courses.list`) now actually drops `undefined`
  fields when building the query string, matching its own doc comment.
  Previously `new URLSearchParams(params)` stringified an `undefined` value
  literally (e.g. `limit: undefined` produced `?limit=undefined` in the
  request URL) instead of omitting the field. Found while writing unit tests
  for this PR; fixed by filtering `undefined` entries out of `params` before
  constructing `URLSearchParams`. Non-breaking (brings behaviour in line with
  the documented contract).

### Changed

- `README.md` rewritten: documents the real export surface, links the reference
  and policy, and corrects the claim that `src/index.ts` is generated from the
  OpenAPI spec — `scripts/generate-sdk.sh` only exports and copies
  `openapi.json`, so the client is hand-maintained.

Documentation only — no change to the exported surface or to runtime behaviour.

## [1.0.0]

Initial release.

### Added

- `BrainStormClient` with the `auth`, `courses`, `progress`, `users` and
  `stellar` namespaces, and `setToken` for bearer authentication.
- Request/response types: `LoginDto`, `RegisterDto`, `AuthResponse`,
  `CourseDto`, `CreateCourseDto`, `UpdateCourseDto`, `CourseListResponse`,
  `CourseQueryParams`, `RecordProgressDto`, `ProgressDto`, `UserDto`,
  `UpdateUserDto`, `StellarBalanceResponse`, `ApiError`.
- `HttpAdapter` transport interface and `BrainStormClientOptions`.
- A `fetch`-based internal transport, requiring a global `fetch`
  (browser, Node 18+, or React Native).
