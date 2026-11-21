# TypeScript strict mode — frontend

Tracking the incremental rollout of TypeScript strict mode in `apps/frontend`
(issue #1534).

## Current configuration

`apps/frontend/tsconfig.json` enables the full `strict` family plus two extra
checks:

| Flag | Status |
|------|--------|
| `strict` (includes `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`) | ✅ enabled |
| `noUncheckedIndexedAccess` | ✅ enabled |
| `noImplicitOverride` | ✅ enabled |
| `exactOptionalPropertyTypes` | ⏳ planned |
| `noUnusedLocals` / `noUnusedParameters` | ⏳ planned (tracked by the ESLint `no-unused-vars` budget) |
| `noPropertyAccessFromIndexSignature` | ⏳ planned |

Run the check locally with:

```bash
npm run typecheck --workspace=apps/frontend
```

## Baseline recorded for this rollout

Measured on the branch that introduced this document with:

```bash
cd apps/frontend && npx tsc --noEmit
```

| Metric | Count |
|--------|------:|
| Total diagnostics | 476 |
| Module-resolution diagnostics (`TS2307`) | 30 |
| Non-module-resolution diagnostics | 446 |

The baseline is dominated by two groups:

- **Legacy test and e2e files** (`src/__tests__`, `tests/`, `e2e/`): tests were
  written before `noUncheckedIndexedAccess` was turned on and index into
  arrays/fixtures without guards.
- **Files whose imports are unresolved in this snapshot** (`TS2307`). These are
  cancelled out of the quality budget: a missing module is an environment or
  repository-completeness problem, not a strict-mode violation.

## Incremental policy

1. `strict` and `noUncheckedIndexedAccess` stay on. Do not turn them off to
   make a file compile.
2. New and modified production files must compile under the current flags.
   The quality budget in `scripts/quality-budget.json` fails when the
   non-module-resolution diagnostic count grows.
3. Prefer a real narrowing (`if (!value) return;`, optional chaining with a
   fallback, a type guard) over `!` or `as`. `@ts-expect-error` needs a comment
   explaining why the type system cannot express the case.
4. When a legacy area is cleaned up, lower its budget in the same commit. This
   is the ratchet: budgets may only move down unless a reviewed exception is
   documented here.

## Known, justified exceptions

- **Unresolved modules (`TS2307`)** — the snapshot on `main` is missing a
  number of modules that the application imports. They are excluded from the
  budget and must be fixed separately; they are not strict-mode failures.
- **Legacy tests and e2e specs** — they are counted in the budget but are not
  required to be refactored in this change (dozens of `noUncheckedIndexedAccess`
  sites, no behavioural coverage gain from editing them all at once).
- **Corrupted files repaired by this change** — `src/lib/dashboard/types.ts`
  contained pasted assistant prose, and `src/components/layout/Navbar.tsx`,
  `src/components/forms/Form.tsx` and `src/components/ui/ErrorBoundary.tsx`
  contained trailing tool-call markers / a half-applied refactor. They were
  repaired to their intended implementations before the baseline was taken.

## Verification

```bash
# full check (currently red because of the legacy baseline above)
npm run typecheck --workspace=apps/frontend

# regression gate used by pre-commit / CI
npm run quality:check -- --project frontend
```
