# Issue #1543 — duplicate utility baseline

Branch: `fix/issue-1543` · Baseline commit: `5ae1143` · Date: 2026-11-24

## How the baseline was captured

Static analysis only (the environment is offline and `node_modules` is not installed):

- `git ls-files apps packages` → 1,350 tracked `.ts`/`.tsx` files.
- Regex scan for `export (async )?(function|const|let|var) <name>` → 853 distinct exported
  names, **50 names defined in two or more different files**.
- Second pass hashing whitespace-normalized function bodies (length > 40 chars, excluding JSX
  and trivial parameter destructuring) to distinguish identical implementations from
  genuinely different ones. This also caught one duplicate whose second copy was private.
- Framework artifacts (`export default` route components, Storybook stories, test/spec/e2e
  fixtures, mocks) are real duplicates by name but are intentionally excluded from the
  runtime-utility checker; they are still recorded below.

## Baseline duplicates (50 names)

"Identical" means byte-equal after whitespace normalization. "Different" means the same name
is used for a different contract/behavior. Entries marked "framework artifact" are route,
story or test exports, not runtime utilities.

| Name | Locations | Implementation |
| --- | --- | --- |
| `EVENT_CATEGORIES` | `apps/backend/src/analytics/event-taxonomy.ts`, `apps/frontend/src/lib/analytics.ts` | **Identical** — consolidated into `@brain-storm/utils` |
| `CORE_EVENTS` | `apps/backend/src/analytics/event-taxonomy.ts`, `apps/frontend/src/lib/analytics.ts` | **Identical** — consolidated into `@brain-storm/utils` |
| `toDate` | `apps/frontend/src/lib/date-utils.ts` (exported), `apps/frontend/src/lib/format.ts` (private) | **Identical** — consolidated (found by body-hash pass, not by the export-name scan) |
| `scrubPII` | `apps/backend/src/analytics/event-taxonomy.ts`, `apps/frontend/src/lib/analytics.ts` (private) | Near-duplicate: backend also scrubbed `privateKey`. Consolidated with the superset field list. |
| `getErrorMessage` | `apps/backend/src/test/http-test-helpers.ts`, `apps/frontend/src/lib/error-utils.ts`, `apps/frontend/src/lib/wallet/adapters/walletconnect.ts` | Different: supertest `Response` → `string`, generic `unknown` → `string`, WalletConnect error → `string \| null` |
| `InvalidateCache` | `apps/backend/src/cache/cache.decorators.ts`, `apps/backend/src/common/database/query-cache.decorator.ts` | Different: NestJS `SetMetadata` decorator vs hand-written method decorator |
| `loginSchema` | `apps/backend/src/common/validation/schemas.ts`, `packages/types/src/validation.types.ts` | Different: Joi vs Zod, different rules (`min(6)` vs `min(8)` + `rememberMe`) |
| `registerSchema` | `apps/backend/src/common/validation/schemas.ts`, `packages/types/src/validation.types.ts` | Different: Joi vs Zod, Zod adds password complexity rules |
| `recordProgressSchema` | `apps/backend/src/common/validation/schemas.ts`, `packages/types/src/validation.types.ts` | Different: Joi vs Zod |
| `getTestDataSource` | `apps/backend/src/test/http-integration-setup.ts`, `apps/backend/src/test/integration-test.setup.ts` | Different: two distinct test datasource globals; test-only |
| `apiClient` | `apps/frontend/src/lib/apiClient.ts`, `packages/mobile-app/src/api/client.ts` | Different: web `Result<T>` wrapper vs Expo/Axios client |
| `OfflineBanner` | `apps/frontend/src/components/ui/OfflineBanner.tsx`, `packages/mobile/src/cache/useNetworkStatus.ts` | Different: DOM/React component vs React Native + `expo-network` component |
| `useWallet` | `apps/frontend/src/hooks/useWallet.ts`, `apps/frontend/src/lib/wallet/WalletProvider.tsx`, `packages/mobile/src/wallet/useWallet.ts` | Different: web SDK hook, context provider, and mobile storage-backed hook |
| `SearchInput` | `apps/frontend/src/components/courses/SearchInput.tsx`, `apps/frontend/src/components/SearchBar.tsx` | Different UI components (course-only input vs debounced autocomplete search bar) |
| `NotificationPreferences` | `apps/frontend/src/app/[locale]/profile/NotificationPreferences.tsx`, `apps/frontend/src/components/notifications/NotificationPreferences.tsx` | Different: route wrapper vs reusable component |
| `config` | `apps/frontend/middleware.ts`, `apps/frontend/src/middleware.ts`, `apps/frontend/src/config/index.ts` | Framework artifact: Next.js middleware matcher exports vs app config object |
| `metadata` | `apps/frontend/src/app/[locale]/layout.tsx`, `apps/frontend/src/app/[locale]/notifications/page.tsx`, `apps/frontend/src/app/[locale]/settings/page.tsx`, `apps/frontend/src/app/layout.tsx` | Framework artifact: Next.js route metadata |
| `Default` | 7 `apps/frontend/src/components/**/*.stories.tsx` | Framework artifact: Storybook default story |
| `Empty` | `BadgeGrid.stories.tsx`, `NFTGrid.stories.tsx`, `ProgressBar.stories.tsx` | Framework artifact: Storybook story |
| `Disabled` | `Button.stories.tsx`, `Input.stories.tsx` | Framework artifact: Storybook story |
| `Primary` | `NFTMetadataBadge.stories.tsx`, `Button.stories.tsx` | Framework artifact: Storybook story |
| `Warning` | `NFTMetadataBadge.stories.tsx`, `Badge.stories.tsx` | Framework artifact: Storybook story |
| `$` | `badge-display.test.ts`, `lazy-loading.test.ts`, `skeleton-consolidation.test.ts` | Test-only Playwright fixture helper |
| `test` | `e2e/fixtures/auth-fixtures.ts`, `e2e/fixtures/determinism.ts` | Test-only Playwright fixture |
| `DashboardError` | `apps/frontend/src/app/[locale]/dashboard/error.tsx`, `apps/frontend/src/app/dashboard/error.tsx`, `apps/frontend/src/components/dashboard/DashboardError.tsx` | Framework artifact: two identical route error boundaries + a distinct dashboard component |
| `SettingsPage` | `apps/frontend/src/app/[locale]/settings/page.tsx`, `apps/frontend/src/app/settings/page.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: localized route + lazy-loaded component |
| `AuthError` | `apps/frontend/src/app/[locale]/auth/error.tsx`, `apps/frontend/src/app/auth/error.tsx` | Framework artifact: two route error boundaries (identical body) |
| `CoursesError` | `apps/frontend/src/app/[locale]/courses/error.tsx`, `apps/frontend/src/app/courses/error.tsx` | Framework artifact: identical route error boundary |
| `CredentialsError` | `apps/frontend/src/app/[locale]/credentials/error.tsx`, `apps/frontend/src/app/credentials/error.tsx` | Framework artifact: identical route error boundary |
| `GalleryError` | `apps/frontend/src/app/[locale]/gallery/error.tsx`, `apps/frontend/src/app/gallery/error.tsx` | Framework artifact: identical route error boundary |
| `GovernanceError` | `apps/frontend/src/app/[locale]/governance/error.tsx`, `apps/frontend/src/app/governance/error.tsx` | Framework artifact: identical route error boundary |
| `ProfileError` | `apps/frontend/src/app/[locale]/profile/error.tsx`, `apps/frontend/src/app/profile/error.tsx` | Framework artifact: identical route error boundary |
| `SettingsError` | `apps/frontend/src/app/[locale]/settings/error.tsx`, `apps/frontend/src/app/settings/error.tsx` | Framework artifact: identical route error boundary |
| `CoursesLoading` | `apps/frontend/src/app/[locale]/courses/loading.tsx`, `apps/frontend/src/app/courses/loading.tsx` | Framework artifact: identical route loading state |
| `CredentialsLoading` | `apps/frontend/src/app/[locale]/credentials/loading.tsx`, `apps/frontend/src/app/credentials/loading.tsx` | Framework artifact: identical route loading state |
| `DashboardLoading` | `apps/frontend/src/app/[locale]/dashboard/loading.tsx`, `apps/frontend/src/app/dashboard/loading.tsx` | Framework artifact: identical route loading state |
| `GalleryLoading` | `apps/frontend/src/app/[locale]/gallery/loading.tsx`, `apps/frontend/src/app/gallery/loading.tsx` | Framework artifact: identical route loading state |
| `ProfileLoading` | `apps/frontend/src/app/[locale]/profile/loading.tsx`, `apps/frontend/src/app/profile/loading.tsx` | Framework artifact: identical route loading state |
| `SettingsLoading` | `apps/frontend/src/app/[locale]/settings/loading.tsx`, `apps/frontend/src/app/settings/loading.tsx` | Framework artifact: identical route loading state |
| `DashboardPage` | `apps/frontend/src/app/dashboard/page.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: route + lazy-loaded component |
| `AdminDashboard` | `apps/frontend/src/components/admin/AdminDashboard.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: component + lazy wrapper |
| `ForumPage` | `apps/frontend/src/app/courses/[id]/forum/page.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: route + lazy wrapper |
| `HomePage` | `apps/frontend/src/app/[locale]/page.tsx`, `apps/frontend/src/app/page.tsx` | Framework artifact: localized route + root route |
| `LeaderboardPage` | `apps/frontend/src/app/[locale]/leaderboard/page.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: route + lazy wrapper |
| `NotificationsPage` | `apps/frontend/src/app/[locale]/notifications/page.tsx`, `apps/frontend/src/lib/dynamic-imports.tsx` | Framework artifact: route + lazy wrapper |
| `ProfilePage` | `apps/frontend/src/app/[locale]/profile/page.tsx`, `apps/frontend/src/app/profile/page.tsx` | Framework artifact: localized route + root route |
| `WalletSection` | `apps/frontend/src/app/[locale]/profile/WalletSection.tsx`, `apps/frontend/src/app/profile/WalletSection.tsx` | Framework artifact: localized duplicate route section (identical body) |
| `CourseCard` | `apps/frontend/src/components/courses/CourseCard/index.tsx`, `apps/frontend/src/components/ui/Skeleton.stories.tsx` | Framework artifact: story mock of a component |
| `VideoPlayer` | `apps/frontend/src/components/courses/VideoPlayer.tsx`, `apps/frontend/src/components/ui/Skeleton.stories.tsx` | Framework artifact: story mock of a component |
| `CourseDetailSkeleton` | `apps/frontend/src/__tests__/skeleton-consolidation.test.ts`, `apps/frontend/src/components/ui/Skeleton.tsx` | Test-only local mock vs real component |
| `CourseListSkeleton` | `apps/frontend/src/__tests__/skeleton-consolidation.test.ts`, `apps/frontend/src/components/ui/Skeleton.tsx` | Test-only local mock vs real component |
| `DashboardSkeleton` | `apps/frontend/src/__tests__/skeleton-consolidation.test.ts`, `apps/frontend/src/components/ui/Skeleton.tsx` | Test-only local mock vs real component |

## What was fixed

New package `@brain-storm/utils` (`packages/utils/src/`, kebab-case files, barrel index):

- `analytics.ts` — `EVENT_CATEGORIES`, `CORE_EVENTS`, `EventType`, `PII_FIELDS`, `scrubPII`.
- `date.ts` — `toDate`.

Consumers now import the single source of truth; the old modules re-export the moved names, so
every existing call site (including `./event-taxonomy` and `@/lib/date-utils` consumers) keeps
working:

- `apps/backend/src/analytics/event-taxonomy.ts` — re-exports taxonomy/privacy helpers.
- `apps/frontend/src/lib/analytics.ts` — imports and re-exports taxonomy/privacy helpers.
- `apps/frontend/src/lib/date-utils.ts` — imports and re-exports `toDate`.
- `apps/frontend/src/lib/format.ts` — imports `toDate` instead of redefining it.

Relative source paths (`../../../../packages/utils/src`) are used because no `@brain-storm/utils`
TypeScript path alias is proven in `apps/*/tsconfig.json`. If the integrator adds one, these four
imports can be switched to the package name without changing behavior.

The backend `common/utils/{array,date,number,object,string,pagination}.utils.ts` files each define
one `*Utils` class; there is no cross-file name duplication of those static methods. Same-name
static methods (`isEmpty`, `min`/`max`, `random`, `equals`) are deliberately different by
argument type/domain and are **not** merged.

## Justified exceptions (allowlisted)

`scripts/check-duplicate-utils.sh` reports 12 name-level duplicates in its scope after the
consolidation. All are recorded with exact file sets in `scripts/duplicate-utils-allowlist.txt`:

1. `apiClient` — web `Result<T>` wrapper vs Expo/Axios mobile-app client (platform-specific).
2. `config` — Next.js middleware matcher exports vs application config (framework-specific).
3. `getErrorMessage` — three different input/output contracts (test, generic, WalletConnect).
4. `getTestDataSource` — two distinct test datasource globals (test harness only).
5. `InvalidateCache` — NestJS metadata decorator vs hand-written method decorator (framework-specific).
6. `loginSchema`, `registerSchema`, `recordProgressSchema` — Joi (backend) vs Zod (shared types),
   with intentionally different rules.
7. `metadata` — Next.js route metadata (framework-specific).
8. `OfflineBanner` — DOM vs React Native/Expo implementation (platform-specific).
9. `SearchInput` — two UI components with different behavior/scope.
10. `useWallet` — web hook/provider vs mobile storage-backed hook (platform-specific).

`canSendEvent` also remains in both analytics modules: the backend takes an explicit
`ConsentState` argument, while the frontend reads browser-session config and uses core event
constants. Merging would change its API, so it is documented rather than moved.

Frontend `amount-utils.ts` (`toStroops`, `stroopsToXlm`, `formatAmount`, `formatXlm`) and
`packages/app/src/lib/transactions.ts` (`formatAmountHumanReadable`) are domain-specific: the
former deals with Horizon stroop/XLM conversion and placeholder handling, the latter with
asset-tagged display strings and `M`/`K` compaction. They are not merged.

## Enforcement

`scripts/check-duplicate-utils.sh` is dependency-free (`git`, `grep`, `awk`). It scans tracked
`.ts`/`.tsx` files under `apps/` and `packages/`, ignores `export default`, tests, stories, mocks
and e2e fixtures, prints duplicate names with paths, and exits 1 on any duplicate whose exact
name + file set is not in the allowlist. `--update` regenerates the allowlist. The integrator
should wire it into CI/pre-commit (e.g. `bash scripts/check-duplicate-utils.sh`).

## Integrator action required (root `package.json` — NOT edited here)

Add `"packages/utils"` to the root `workspaces` array (append after `"packages/types"`), e.g.:

```diff
   "workspaces": [
     "apps/backend",
     "apps/frontend",
     "packages/api",
     "packages/app",
     "packages/mobile",
     "packages/mobile-app",
     "packages/sdk",
-    "packages/types"
+    "packages/types",
+    "packages/utils"
   ],
```

The workspace entry above and the `lint:utils` / `quality:local` npm scripts have been added
by the integrator, and `scripts/check-duplicate-utils.sh` runs from `.husky/pre-commit` and
the `code-quality-gates.yml` convention job. Consumers currently use a relative path into
`packages/utils/src`; adding a `@brain-storm/utils` path mapping to the frontend/backend
tsconfigs is a follow-up so those imports can move to the package name.

## Verification note

Build and test commands could not be run locally: the environment is offline and dependencies
are not installed. Verification was limited to the static checker, `git diff --check`, import
grep, and file-tracking checks.
