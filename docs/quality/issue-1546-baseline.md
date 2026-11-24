# Issue #1546 baseline: commit-lint and PR template

Static-analysis baseline recorded for issue #1546. `node_modules` is unavailable and
the environment is offline, so no npm install, lint, or test run was performed.
Findings are derived from `git log --format=%s -300`, the checked-in config/hooks,
and the repo's actual quality tooling.

## What already exists

- `.commitlintrc.json` extends `@commitlint/config-conventional` and sets strict
  (severity 2) `type-enum`, `type-case`, `type-empty`, `subject-case`,
  `subject-empty`, `subject-full-stop`, `scope-enum`, and `scope-case` rules.
  The scope enum held 44 entries, grouped informally with blank lines rather
  than sorted.
- `.github/pull_request_template.md` has Description, Type of Change, Related
  Issues, Testing, Documentation, Breaking Changes, Checklist, Screenshots, and
  Additional Context sections.
- `.husky/commit-msg` sources `husky.sh` and runs
  `npx --no -- commitlint --edit ${1}` (local binary, no network install).
- `.github/workflows/conventional-commits.yml` validates the PR title and, in a
  second job, the commit range.
- Real quality tooling the template/hook must reflect: `npm run lint`,
  `npm run typecheck`, `npm run test`, `npm run test:coverage:*` (85% floor in
  `code-quality-gates.yml`), ESLint `filenames/match-regex` (kebab-case naming),
  `simple-import-sort/imports` + `import/no-duplicates` (import ordering),
  `complexity` max 15 plus `scripts/check-complexity.sh`, `gitleaks` in
  `.husky/pre-commit` and `secret-scanning.yml`, and `lint-staged` /
  `scripts/quality-budget.mjs --staged` on staged files.

## Concrete gaps and violations found

1. **Missing scopes (blocking).** 13 scopes actually used in the last 300
   commits were absent from `scope-enum`, so those commits fail commitlint
   today: `config` (3), `e2e`, `errors`, `governance`, `lint`, `logging`,
   `quality`, `scripts`, `shared`, `test`, `tests` (4), `token`, and
   `workspace`. Example subjects: `refactor(config): ...`,
   `refactor(e2e): ...`, `fix(quality): ...`, `chore(workspace): ...`.
2. **Scope enum not sorted.** Entries were grouped by theme with blank lines
   and no alphabetical order, making additions error-prone and diff-noisy.
3. **PR checklist too generic.** "Follows the project's style guidelines" and
   "generates no new warnings" do not name any checkable gate. The template
   omitted conventional titles, commitlint, lint/typecheck, naming conventions,
   import ordering, complexity, coverage, and the secret scan.
4. **Unquoted hook argument.** `--edit ${1}` is subject to word splitting and
   globbing; a path containing spaces (or a missing argument) is mis-parsed.
5. **No self-contained static enforcement.** Nothing verified that the config,
   template, and hook stay in sync without installing dependencies.
6. **CI commit checks are advisory.** Both commit-message steps in
   `conventional-commits.yml` use `continue-on-error: true`, so only the PR
   title is blocking. Also, the workflow installs commitlint with
   `npm install --save-dev`, which can mutate `package.json`/lock in CI.
   Left unchanged here (see justified exceptions).

## Fixes applied

- Added the 13 real scopes to `scope-enum` and sorted the full 57-entry list
  (empty scope first, lowercase kebab-case). All rules remain severity 2.
- Replaced the vague checklist with explicit, checkable items for conventional
  title, commitlint, lint/typecheck, unit tests, naming, import order,
  complexity, coverage, and secret scan.
- Hardened `.husky/commit-msg` to `"${1}"`, keeping `npx --no` and all other
  behavior unchanged.
- Added executable `scripts/check-commit-and-pr.sh`, which needs no npm
  packages and validates JSON parsing, required rules, scope hygiene, required
  checklist markers, and the hook's commitlint invocation. The integrator owns
  wiring it into pre-commit/CI.

## Justified exceptions (not "fixed")

- **Issue-number pseudo-scopes.** `#1168` and `#1354`–`#1357` appear as scopes
  in subjects such as `test(#1357): ...` and `fix(#1168): ...`. These are issue
  references, not domains; adding them would make the enum unbounded and
  enshrine a mistake, so they are deliberately excluded.
- **Near-duplicate scopes.** `test`/`tests`, `token`/`contracts-token`, and
  `governance`/`contracts-governance` overlap. Both spellings are kept so valid
  history remains lintable; consolidation is a naming follow-up, not a
  commitlint change here.
- **Legacy non-conventional subjects.** Merge commits, `simple: batch fix 4
  issues`, and capitalized `Fix: ...` predate enforcement. Rewriting shared
  history is out of scope for this issue.
- **`continue-on-error: true` in `conventional-commits.yml`** and its
  `npm install --save-dev` step are pre-existing CI behavior. CI wiring belongs
  to the integrator; this baseline records it rather than changing the workflow.
- **Local gitleaks is optional** by design in `.husky/pre-commit` (warns and
  skips if the binary is absent); CI `secret-scanning.yml` is the blocking gate.
- **Build/tests not run** — offline with no `node_modules`; verification was
  limited to `git diff --check`, JSON parsing, and the new static script.
