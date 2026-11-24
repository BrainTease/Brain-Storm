# Issue #1544 — Import ordering & path aliases: baseline and resolution

Date: 2026-11-24
Branch: `fix/issue-1544`

## Method

`node_modules` is unavailable and the environment is offline, so ESLint itself
could not be executed. The baseline and all verification were produced with the
new dependency-free checker:

```
./scripts/check-import-order.sh
```

It statically parses tracked `.ts`/`.tsx` files, assigns each import to the
`simple-import-sort` group configured in `.eslintrc.js:33-46` (longest matching
regex wins, unmatched imports form a tail group), and reports group-order
regressions plus repeated `from '<module>'` specifiers (`import/no-duplicates`).
Chunks are delimited by non-import code, matching the rule's scope. Side-effect
imports are pinned (they start a fresh ordering segment) because moving them
changes runtime initialization order.

## Baseline summary (pristine `HEAD`, final checker)

| Metric | Count |
| --- | --- |
| Tracked `.ts`/`.tsx` files | 1360 |
| Files checked (after excluding `*.d.ts` and generated/build dirs) | 1296 |
| Import-order violations | **469** |
| Duplicate-import violations | **22** |
| **Total violations** | **491** |
| Files with at least one violation | 225 |

By area: `apps/backend` 442 violations, `apps/frontend` 49 violations,
`packages/*` 0 violations.

Highest-density files: `apps/backend/src/auth/auth.service.ts` (9),
`apps/backend/src/app.module.ts` (9),
`apps/backend/src/stellar/stellar.controller.ts` (8),
`apps/backend/src/forums/forums.service.ts` (8),
`apps/backend/src/tracing.ts` (7), `apps/backend/src/main.ts` (7),
`apps/backend/src/users/users.controller.ts` (6),
`apps/backend/src/notifications/notifications.controller.ts` (6),
`apps/backend/src/analytics/platform-analytics.service.ts` (5 + 1 duplicate),
`apps/frontend/src/app/[locale]/profile/page.tsx` (5).

### (a) Import-block group order — 469 violations

| Pattern | Count | Representative finding (file:line) |
| --- | --- | --- |
| parent `../` after sibling `./` | 293 | `apps/backend/src/admin/admin-user-management.controller.ts:8` — `'../audit/admin-audit.interceptor'` after `'./admin.dto'` |
| external after sibling `./` | 83 | `apps/backend/src/analytics/analytics.service.spec.ts:15` — `'typeorm'` after a relative import |
| external after parent `../` | 42 | `apps/backend/src/audit/audit.controller.ts:2` — `'@nestjs/common'` after `'./audit.controller'`-style parent imports |
| sibling `./` after unmatched `@/` | 41 | `apps/frontend/src/app/[locale]/profile/page.tsx:9` — `'./WalletSection'` after `'@/...'` |
| external after `@brain-storm/` | 6 | `apps/backend/src/enrollments/enrollments.service.fixtures.spec.ts:16` — `'@nestjs/testing'` after `'@brain-storm/types'` |
| `@brain-storm/` after unmatched `@/` | 2 | `apps/frontend/src/components/exercise/ExerciseRunner.tsx:9` — `'@brain-storm/types'` after `'@/...'` |
| `@brain-storm/` after parent | 1 | `apps/backend/src/config/__tests__/network-consistency.test.ts:3` — `'@brain-storm/sdk'` after `'../network-consistency'` |
| `@brain-storm/` after sibling | 1 | `apps/backend/src/grants/grants.service.ts:14` — `'@brain-storm/types'` after `'./...'` |

Note on `@/`: the current ESLint groups have no `^@/` regex, so those imports
fall into the unmatched tail group and must sort *after* `./` relatives. This is
also the convention assumed by the existing `scripts/audit-imports.sh:34-40`
heuristic. If the integrator adds a dedicated `^@/` group to `.eslintrc.js`,
the frontend files must be re-sorted again.

### (b) Duplicate imports — 22 violations (13 distinct modules, 21 files)

| File:line | Duplicated module |
| --- | --- |
| `apps/backend/src/analytics/admin-analytics.controller.ts:6` | `../auth/roles.guard` (first at :5) |
| `apps/backend/src/analytics/admin-analytics.dto.ts:45` | `@brain-storm/types` (first at :3) |
| `apps/backend/src/analytics/platform-analytics.service.ts:5` | `typeorm` (first at :3) |
| `apps/backend/src/audit/admin-audit.interceptor.ts:5` | `rxjs` (first at :3) |
| `apps/backend/src/bookings/bookings.controller.ts:17` | `@nestjs/swagger` (first at :14) |
| `apps/backend/src/common/decorators/rate-limit.decorator.ts:2,5` | `@nestjs/common` (first at :1) |
| `apps/backend/src/common/decorators/validate-request.decorator.ts:3` | `@nestjs/common` (first at :1) |
| `apps/backend/src/common/logger/logger.service.ts:4` | `@nestjs/common` (first at :1) |
| `apps/backend/src/database/seed.service.ts:13` | `../notifications/notification.entity` (first at :12) |
| `apps/backend/src/feature-flags/feature-flags.service.ts:6` | `@nestjs/common` (first at :1) |
| `apps/backend/src/grants/__tests__/grants.integration.test.ts:17` | `@nestjs/typeorm` (first at :16) |
| `apps/backend/src/notifications/notifications.controller.ts:20` | `@nestjs/swagger` (first at :16) |
| `apps/backend/src/webhooks/webhooks-legacy-removal.spec.ts:16` | `./webhook-delivery.entity` (first at :14) |
| `apps/backend/test/app.e2e-spec.ts:5` | `@nestjs/typeorm` (first at :4) |
| `apps/backend/test/certificates.e2e-spec.ts:5` | `@nestjs/typeorm` (first at :4) |
| `apps/backend/test/sanitization.e2e-spec.ts:5` | `@nestjs/typeorm` (first at :4) |
| `apps/frontend/src/__tests__/components/Footer.test.tsx:12` | `vitest` (first at :1) |
| `apps/frontend/src/__tests__/components/gamification/GamificationComponents.test.tsx:6` | `@/components/gamification/BadgeGrid` (first at :5) |
| `apps/frontend/src/__tests__/store/app.store.test.ts:15` | `@/store/app.store` (first at :14) |
| `apps/frontend/src/components/gamification/BadgeGrid.stories.tsx:3` | `./BadgeGrid` (first at :2) |
| `apps/frontend/src/services/disputeResolutionService.ts:2` | `@brain-storm/types` (first at :1) |

All duplicates were value+named or type+named specifier pairs; they were merged
into the first import (type specifiers kept via inline `type` modifiers), with
the specifier sets verified unchanged.

### (c) Path-alias inconsistencies across tsconfigs

| File | Baseline state | Action |
| --- | --- | --- |
| `apps/backend/tsconfig.json:15-20` | `@brain-storm/types`, `@brain-storm/sdk` (exact + `/*`) — canonical | unchanged |
| `apps/frontend/tsconfig.json:29` | only `@/*`; source imports `@brain-storm/types` (incl. `/test-utils`) and `@brain-storm/sdk` | added `types`, `types/*`, `sdk`, `sdk/*` → `../../packages/{types,sdk}/src` |
| `packages/api/tsconfig.json` | no `baseUrl`/`paths` | added `baseUrl: "."` + `types`, `types/*`, `sdk`, `sdk/*` → `../{types,sdk}/src` |
| `packages/sdk/tsconfig.json` | no `paths` | added `baseUrl: "."` + `types`, `sdk` (+ wildcards) → `../types/src`, `./src` |
| `packages/types/tsconfig.json` | no `paths` | added `baseUrl: "."` + `types`, `sdk` (+ wildcards) → `./src`, `../sdk/src` |
| `packages/mobile-app/tsconfig.json:4-7` | partial (`types`, `mobile`, no wildcards/sdk) | added `types/*`, `sdk`, `sdk/*`, `mobile/*` |
| `apps/frontend/e2e/tsconfig.json`, `apps/backend/tsconfig.build.json`, `packages/sdk/tsconfig.jest.json`, `packages/mobile/tsconfig.jest.json` | inherit paths from their base tsconfig | unchanged |

Every added target was verified to exist on disk relative to its own tsconfig
(`fs.existsSync` over the path base, with `/*` stripped). No alias was added for
a directory that does not exist.

## Justified exceptions and deferred items

1. **Side-effect imports** (7 in the repo, e.g.
   `apps/backend/src/main.ts:1` `import './instrument';`,
   `apps/backend/src/instrument.ts:4` `import './tracing';`,
   `apps/frontend/src/app/layout.tsx:9` `import './globals.css';`) are load-order
   dependent. They are not moved across other imports. `instrument.ts` is
   intentionally left byte-for-byte unchanged and is documented as an
   exception; `main.ts` was re-sorted only within the segment after the pinned
   `./instrument` import.
2. **Generated/declarations**: `*.d.ts` and files under `dist/`, `build/`,
   `coverage/`, `lib/`, `out/`, `.next/`, `generated/`, `__generated__/` are
   excluded from the checker (64 tracked files at baseline).
3. **Two different toolchains govern imports in this monorepo.** The apps use
   `eslint-plugin-import`'s `import/order` rule (with `newlines-between: always`,
   `alphabetize: asc/caseInsensitive`, and a `@/**` pathGroup for the frontend),
   while the root config used by `packages/*` uses `simple-import-sort`. The
   static checker mirrors both: app files are checked against the `import/order`
   group sequence (builtin, external, internal/`@/`, parent, sibling, index),
   package files against the `simple-import-sort` groups. Within-group
   alphabetical order is enforced for changed files; ESLint remains the
   authoritative check when dependencies are installed.
4. **`apps/backend/src/common/errors/{__tests__/schema.integration.test.ts,contract-error.map.ts,unified-error.adapter.ts}`**
   import `@brain-storm/types/src/error.types`. With the backend alias
   `@brain-storm/types/* → ../../packages/types/src/*` this maps to the
   non-existent `packages/types/src/src/error.types`; it only resolves through
   the workspace symlink under legacy Node resolution, and the package
   `exports` map does not list this subpath. Changing the specifier could break
   that resolution, so it is deferred rather than guessed.
5. **`packages/app/src/lib/transactions.ts:10,13`** uses `@brain-storm/types`,
   but `packages/app` has no tsconfig at all. Creating a new project config is
   outside "standardize existing tsconfigs" and is deferred.
6. **`packages/mobile/tsconfig.jest.json:2`** extends `./tsconfig.json`, which is
   not tracked (pre-existing). Creating that base config is deferred.
7. **Issue #1545 conflict zone**: `packages/api/src/controllers/**` and
   `packages/api/src/routes/**` were excluded from edits. The baseline checker
   found no import-order/duplicate violations in those paths; any introduced by
   the concurrent rename are deferred to that issue's owner.

## Resolution / verification

- `./scripts/check-import-order.sh --stdin` over all 234 changed `.ts/.tsx`
  files: **0 order violations, 0 duplicate violations, exit 0**.
- The full-repo run still reports pre-existing violations in untouched files;
  those are outside this issue's change set and are not claimed as fixed.
- `git diff --check`: clean.
- Automated import rewrite was cross-checked against `main` for every changed
  source file: all non-import code is byte-identical apart from three
  intentional changes (a trailing type import consolidated into its top-level
  import, a duplicate `@nestjs/typeorm` import merged, and the #1543 utility
  consolidation).
- Every modified tsconfig parses as JSON (after stripping whole-line comments)
  and every configured alias target exists.
- Build/tests were **not** run: dependencies are not installed and the network
  is offline. No claim of a passing build or test suite is made here.
