# Quality gates: ESLint and TypeScript budgets

This repository enforces `@typescript-eslint/no-unused-vars` and
`@typescript-eslint/no-explicit-any` as errors in all three ESLint configs:

- `.eslintrc.js` (repository root)
- `apps/frontend/.eslintrc.js`
- `apps/backend/.eslintrc.js`

The rules already existed, but the repository could not be linted reliably
because several plugins referenced by the root config were not declared as
dependencies, and the frontend config pointed `import/no-unused-modules` at
paths that do not exist in an App Router project. Both problems are fixed in
this change.

## Running the checks

```bash
# ESLint across every workspace that defines a lint script
npm run lint

# Per application
npm run lint:frontend
npm run lint:backend

# TypeScript
npm run typecheck
npm run typecheck:frontend
npm run typecheck:backend

# Ratchet (see below), all projects, one project, or only staged projects
npm run quality:check
npm run quality:check -- --project frontend
npm run quality:staged
```

## The ratchet

`scripts/quality-budget.mjs` runs TypeScript and ESLint and compares the
results with `scripts/quality-budget.json`.

- The budget may only go down. A commit or PR that increases a tracked count
  fails the check.
- After removing violations, run `npm run quality:update` and include the
  lowered budget in the same commit. This is how the rollout ratchets forward.
- `TS2307` (cannot find module) diagnostics are reported but excluded: they
  describe modules missing from this snapshot of `main`, not strict-mode or
  lint violations.
- The pre-commit hook runs `--staged`, so only the app(s) touched by the commit
  are checked. The hook is skipped for commits that stage no app TypeScript
  files.

## Recorded baseline (2026-11-21)

| Project | TS diagnostics counted | TS2307 (excluded) | `no-explicit-any` | `no-unused-vars` |
|---------|-----------------------:|------------------:|------------------:|-----------------:|
| Frontend | 446 | 30 | 71 | 78 |
| Backend | 359 | 1055 | 708 | 124 |

`no-explicit-any` and `no-unused-vars` counts are for `src/` only, matching the
lint scripts in each application.

## Exception policy

- Do not disable the two rules globally, per directory, or with a blanket
  `/* eslint-disable */` to make a change pass. The budget is the mechanism for
  legacy debt.
- A local `// eslint-disable-next-line <rule> -- <reason>` is acceptable only
  when the value genuinely cannot be typed (for example, a third-party API
  boundary). The reason is mandatory and is checked by
  `__tests__/quality/eslint-disables.test.ts`.
- New and modified production code is expected to be free of both violations.
- The `filenames/match-regex` violation on files such as
  `src/common/errors/app.error.ts` is a pre-existing naming-convention debt and
  is not part of the tracked budget. Renaming those modules is a separate
  change.
