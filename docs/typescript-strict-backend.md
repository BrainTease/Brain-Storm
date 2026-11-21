# TypeScript strict mode — backend

Tracking the incremental rollout of TypeScript strict mode in `apps/backend`
(issue #1533).

## Current configuration

`apps/backend/tsconfig.json` has `strict: true`. This change adds the first
extra flag on top of `strict`:

| Flag | Status |
|------|--------|
| `strict` (includes `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`) | ✅ enabled |
| `noImplicitOverride` | ✅ enabled by this change (one violation fixed in `src/common/errors/app.error.ts`) |
| `exactOptionalPropertyTypes` | ⏳ planned (+19 diagnostics on the recorded baseline) |
| `noUncheckedIndexedAccess` | ⏳ planned (+49 diagnostics) |
| `noPropertyAccessFromIndexSignature` | ⏳ planned (+105 diagnostics) |

Run the check locally with:

```bash
npm run typecheck --workspace=apps/backend
```

## Baseline recorded for this rollout

Measured with:

```bash
cd apps/backend && npx tsc --noEmit
```

| Metric | Count |
|--------|------:|
| Total diagnostics | 1414 |
| Module-resolution diagnostics (`TS2307`) | 1055 |
| Non-module-resolution diagnostics | 359 |

Enabling `noImplicitOverride` produced one new diagnostic
(`TS4115` in `app.error.ts`), which is fixed in this change; the totals above
are unchanged from the pre-change baseline.

The non-module-resolution diagnostics come from the large legacy surface of the
NestJS application. `TS2307` is excluded from the quality budget because this
snapshot of `main` is missing modules that the application imports; a missing
module is a repository/environment completeness problem rather than a
strict-mode violation.

## Incremental policy

1. `strict` and `noImplicitOverride` stay on. Do not disable them per file.
2. New and modified production files must compile under the current flags.
   `npm run quality:check -- --project backend` fails if the
   non-module-resolution diagnostic count increases.
3. Additional flags listed above are enabled only after their diagnostics have
   been removed. Each flag removal lowers the budget in the same change.
4. `@ts-expect-error` must carry a justification comment. Blanket
   `// @ts-nocheck` is not accepted.

## Known, justified exceptions

- **Unresolved modules (`TS2307`)** — excluded from the budget, tracked
  separately as repository completeness work.
- **Legacy application modules** — counted in the budget; not rewritten here.
- **`src/common/errors/error.utils.ts`** — imports error classes
  (`RateLimitError`, `BadRequestError`, …) that are not exported by
  `app.error.ts` in this snapshot. This is pre-existing and outside the scope
  of strict-mode enablement; it is part of the `TS2305` baseline.

## Verification

```bash
# full check (currently red because of the legacy baseline above)
npm run typecheck --workspace=apps/backend

# regression gate used by pre-commit / CI
npm run quality:check -- --project backend
```
