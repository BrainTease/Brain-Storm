# Issue #1545 — Naming conventions & file structure baseline

## Rule

`filenames/match-regex` declared in the repository-root `.eslintrc.js`:

```js
'filenames/match-regex': [
  'error',
  '^[a-z0-9]+(-[a-z0-9]+)*(?:\\.(?:test|spec|d))?$',
  true,
]
```

- The third option (`true`) checks the filename **without** its final
  extension, so `user-controller.ts` is checked as `user-controller`.
- The regex requires all-lowercase kebab-case names and permits the optional
  `.test`, `.spec` or `.d` suffix (e.g. `response-envelope.test.ts`).
  `index` files are valid (they match `[a-z0-9]+`).

## Scope of the scan

Files were enumerated with `git ls-files '*.ts' '*.tsx'`. Build output and
generated files are excluded: `node_modules/`, `dist/`, `build/`, `.next/`,
`coverage/`, `lib/`, `out/`, `*.min.js` and `*.d.ts`.

- **1,360** tracked `.ts`/`.tsx` files exist in the repository.
- `apps/frontend` and `apps/backend` are independent ESLint roots
  (`root: true`). They define their own `filenames/match-regex` rule and
  explicitly disable it for framework files (`src/app/**`, `src/pages/**`,
  `*.config.*`, `next-env.d.ts`, `**/index.ts`). Those application trees are
  therefore **not governed by the root rule** and are out of scope here.
- The root rule governs the source files that inherit it: the `packages/**`
  tree. **69** tracked `.ts`/`.tsx` files were scanned there.

The executable check (`scripts/check-naming.sh`) uses the same scope and the
same exception set described below; it is a dependency-free stand-in for the
ESLint rule so it can run from pre-commit/CI without `node_modules`.

## Baseline result

Of the 69 governed files, **41** filenames did not match the regex:

- **4 fixable** — non-idiomatic, manually authored implementation files in
  `packages/api/src`. These were renamed to kebab-case (see below).
- **37 justified exceptions** — names dictated by an external convention
  (config files, React/Expo component names, the shared `*.types.ts`
  convention, and camelCase mobile-SDK modules). They are grandfathered and
  skipped by the check. They must not be renamed because the surrounding
  toolchain or framework expects those names.

After the fixes, **0** fixable violations remain. The 37 exceptions below are
the complete, documented exception set; any *new* non-conforming file is a
violation.

### Fixable violations (renamed in this change)

| Old path | New path | Reason |
|----------|----------|--------|
| `packages/api/src/controllers/BaseController.ts` | `packages/api/src/controllers/base-controller.ts` | PascalCase implementation file |
| `packages/api/src/controllers/UserController.ts` | `packages/api/src/controllers/user-controller.ts` | PascalCase implementation file |
| `packages/api/src/routes/userRoutes.ts` | `packages/api/src/routes/user-routes.ts` | camelCase implementation file |
| `packages/api/src/middleware/responseInterceptor.ts` | `packages/api/src/middleware/response-interceptor.ts` | camelCase implementation file |

Module contents were kept unchanged; only file paths and the import specifiers
that reference them were updated. Class/function/variable identifiers
(`BaseController`, `UserController`, `responseInterceptor`, `userRoutes`) are
deliberately preserved.

### Justified exceptions (37, skipped by the check)

**Config files (1)** — the ESLint configs turn the rule off for `*.config.*`;
these are toolchain entry points, not source modules.

- `packages/api/vitest.config.ts`

**React / Expo component and screen names (5)** — `*.tsx` UI files whose
PascalCase names are the component name and, for `App.tsx`, the Expo entry
point.

- `packages/app/src/components/Payment/TransactionSummary.tsx`
- `packages/mobile-app/App.tsx`
- `packages/mobile-app/src/screens/CourseDetailScreen.tsx`
- `packages/mobile-app/src/screens/DiscoveryScreen.tsx`
- `packages/mobile-app/src/screens/ProfileScreen.tsx`

**`packages/types` dotted type-suffix convention (19)** — shared type
artifacts are published with a `.types.ts` (and `.types.test.ts`) suffix; the
regex only allows `.test`/`.spec`/`.d` suffixes, so these are intentionally
exempt.

- `packages/types/src/api.types.ts`
- `packages/types/src/auth.types.ts`
- `packages/types/src/common.types.ts`
- `packages/types/src/course.types.ts`
- `packages/types/src/dispute.types.ts`
- `packages/types/src/domain.types.test.ts`
- `packages/types/src/enrollment.types.ts`
- `packages/types/src/error.types.test.ts`
- `packages/types/src/error.types.ts`
- `packages/types/src/exercise.types.ts`
- `packages/types/src/grant.types.ts`
- `packages/types/src/listing.types.ts`
- `packages/types/src/notification.types.ts`
- `packages/types/src/progress.types.ts`
- `packages/types/src/quiz.types.ts`
- `packages/types/src/stellar.types.ts`
- `packages/types/src/user.types.ts`
- `packages/types/src/validation.types.test.ts`
- `packages/types/src/validation.types.ts`

**Mobile SDK camelCase modules (12)** — the reusable `packages/mobile` SDK
(and its Jest tests) uses camelCase for hooks (`use*`), services
(`*Service`) and helpers. Renaming them would break established public
import paths.

- `packages/mobile/src/__tests__/wallet/useWallet.test.ts`
- `packages/mobile/src/__tests__/wallet/walletService.test.ts`
- `packages/mobile/src/auth/biometricAuth.ts`
- `packages/mobile/src/auth/secureStorage.ts`
- `packages/mobile/src/auth/sessionManager.ts`
- `packages/mobile/src/cache/actionQueue.ts`
- `packages/mobile/src/cache/offlineCache.ts`
- `packages/mobile/src/cache/useNetworkStatus.ts`
- `packages/mobile/src/notifications/deepLinks.ts`
- `packages/mobile/src/notifications/pushService.ts`
- `packages/mobile/src/wallet/useWallet.ts`
- `packages/mobile/src/wallet/walletService.ts`

## Enforcement

`scripts/check-naming.sh` reproduces the regex check with POSIX tools and
`git ls-files`, prints every violation, and exits `1` if any are found. It
skips exactly the documented exceptions listed above. Run it locally or from
pre-commit/CI; no npm dependencies are required.
