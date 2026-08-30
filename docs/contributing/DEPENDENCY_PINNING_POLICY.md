# Dependency Pinning Policy

This repository enforces a conservative dependency policy for security-sensitive and tooling dependencies. The goal is to avoid undeclared drift, broken transitive resolutions, and sudden supply-chain breakage across the monorepo.

## Scope

This policy applies to:
- runtime libraries with security and wallet/chain implications
- build and lint tooling used by CI and local validation
- transitive dependencies that are known to cause version skew or peer conflicts

## Rules

1. Prefer explicit versions in workspace package manifests over floating ranges for security-sensitive packages.
2. Keep direct dependency versions aligned across the monorepo when they serve the same role.
3. Avoid unpinned transitive resolutions by updating lockfiles intentionally and verifying with the relevant workspace test/lint command.
4. Re-run dependency installation with the repo's supported install path when a lockfile or peer conflict changes.

## Required pinned/tooling baseline

The following direct dependencies are expected to remain explicit in the relevant package manifests:

- `@stellar/stellar-sdk`: `^12.0.0`
- `eslint`: `^8.56.0`
- `@typescript-eslint/eslint-plugin`: `^6.0.0`
- `@typescript-eslint/parser`: `^6.0.0`
- `eslint-plugin-import`: `^2.32.0`
- `eslint-import-resolver-typescript`: `^3.10.1`
- `next`: `14.2.0`
- `react`: `^18.3.0`
- `react-dom`: `^18.3.0`
- `typescript`: `^5.4.0`

## Review expectations

Before merging dependency updates:
- inspect the dependency diff for peer or transitive changes,
- verify the relevant lint/test commands still pass,
- confirm no broad auto-fix churn is introduced,
- document the reason for the update in the PR description.

## Exception process

If a temporary floating range is required for a known compatibility issue, document the reason in the PR and keep the scope to the minimal affected workspace.
