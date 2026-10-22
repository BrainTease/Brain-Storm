# ADR-012: Monorepo Package Boundaries and Import Rules

**Status:** Accepted

**Date:** 2026-08-26

**Author(s):** Brain-Storm Architecture Team

---

## Context

The Brain-Storm monorepo ships a TypeScript/JavaScript surface alongside the Soroban contracts described in [ADR-0001](./0001-contract-module-boundaries.md) and [ADR-006](./ADR-006-contract-per-domain-architecture.md). Those ADRs govern `contracts/`; this ADR governs the npm workspace under `packages/` and `apps/`.

Historically the JavaScript side of the repo grew in two directions at once: a *mobile* code path and a *mobile-app* code path. `packages/mobile` was extracted as a reusable React Native SDK (secure storage, offline cache, wallet, notifications), while `packages/mobile-app` was created as the Expo application that renders screens and navigation. The two were never registered in the root `package.json` `workspaces` array, so `@brain-storm/mobile` could not be resolved by `@brain-storm/mobile-app` even though the latter declared it as a dependency, and `packages/app` shipped source files with no `package.json` at all.

The consequences were concrete:

- `npm ls @brain-storm/mobile` reported an empty tree; the workspace link did not exist.
- `npm audit --workspace=packages/mobile` and `--workspace=packages/mobile-app` failed with `No workspaces found`.
- `packages/app` was invisible to npm, to TypeScript project resolution, and to dependency auditing.
- The lock file could not represent the intended dependency graph, so the installed tree and the declared tree drifted apart.

The root `package.json` `workspaces` array was the only place where npm learns the shape of the repository. A package directory that is not listed there is invisible to npm: it is not installed, not linked, not audited, and not covered by the lock file.

---

## Decision

We establish an explicit boundary model for the JavaScript monorepo. Every package directory is registered in the root `workspaces` array, every package ships a `package.json`, and imports flow in one direction only.

### 1. Package Responsibilities

| Package                | npm name                | Responsibility                                                                                     | Layer    |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `packages/types`       | `@brain-storm/types`    | Shared TypeScript types and Zod schemas. No runtime I/O, no framework dependency.                     | Layer 0  |
| `packages/sdk`         | `@brain-storm/sdk`      | Generated TypeScript client for the backend OpenAPI spec. Transport only.                            | Layer 1  |
| `packages/api`         | `@brain-storm/api`      | Express API service — response envelope and user routes.                                              | Layer 2  |
| `packages/app`         | `@brain-storm/app`      | Shared application logic: Stellar transaction parsing and payment UI components.                     | Layer 1  |
| `packages/mobile`      | `@brain-storm/mobile`   | Reusable React Native SDK: secure auth, offline cache, wallet, notifications. Library, not an app.    | Layer 1  |
| `packages/mobile-app`  | `@brain-storm/mobile-app` | Expo application: navigation, screens, app shell. Consumes `mobile` and `types`.                   | Layer 2  |

### 2. `mobile` vs `mobile-app` — The Distinction

`packages/mobile` and `packages/mobile-app` are **not** duplicates and are **not** candidates for
consolidation. The distinction is library versus application:

- **`packages/mobile` (`@brain-storm/mobile`)** contains no screens, no navigation, and no Expo app
  configuration. It exports a framework-agnostic API surface (`auth`, `cache`, `wallet`,
  `notifications`) that any React Native host can consume. It has **no** dependency on
  `@brain-storm/mobile-app`, and it must never depend on it.
- **`packages/mobile-app` (`@brain-storm/mobile-app`)** is the Expo entry point. It owns
  `App.tsx`, `app.json`, navigation graphs, and screen components, and it consumes
  `@brain-storm/mobile` as a library dependency.

The dependency edge is one-way: `mobile-app → mobile → types`. There is no cycle, and no
duplicated source of truth between the two packages. A future consolidation of the two would
require merging the library surface into the app, which is explicitly **deprecated** — it would
make the SDK unusable from any non-Expo host and would drag the whole Expo toolchain into every
consumer of the secure-storage and wallet helpers.

### 3. Import Rules

1. **No upward imports.** A package may only import from layers strictly below it. Layer 2
   packages (`api`, `mobile-app`) may import Layer 1 and Layer 0; Layer 1 packages (`sdk`, `app`,
   `mobile`) may import Layer 0; Layer 0 (`types`) imports nothing internal.
2. **No cross-application imports.** `apps/*` and `packages/*` are separate trees. A package must
   not import from `apps/`, and `apps/backend` must not import from `apps/frontend`.
3. **Sibling packages do not import each other** unless the dependency is declared in the
   importing package's `package.json` and points along the layer order above.
4. **Contracts are never imported by TypeScript.** The TypeScript tree talks to Soroban through
   the SDK and generated bindings, never by reading Rust sources.
5. **`packages/types` stays dependency-free** apart from `zod`, so it can be consumed by every
   other package without pulling a dependency graph.

These rules are enforced mechanically by `import/no-restricted-paths` in the root ESLint
configuration (see [ADR-012 Enforcement](#4-boundary-enforcement)).

### 4. Boundary Enforcement

The root `.eslintrc.js` applies `import/no-restricted-paths` to the workspace. It rejects:

- any import from `apps/**` inside `packages/**`;
- any import from `apps/backend/**` or `apps/frontend/**` into the other application;
- any import of `packages/mobile-app/**` from `packages/mobile/**` or any other package.

The rule set is the executable form of this ADR; a change that violates the import rules fails
lint before it reaches review.

### 5. Workspace Registration and Lock File

Every package directory listed in Section 1 is registered in the root `package.json` `workspaces`
array, and every one of them ships a `package.json`. This is what makes `npm audit
--workspace=packages/mobile`, `npm ls`, and the lock file agree with the declared dependency
graph.

The lock file is regenerated whenever the workspace membership or a package manifest changes, so
the committed lock file always describes the installed tree. A lock file that does not mention a
registered workspace is treated as drift and must be regenerated rather than hand-edited.

---

## Consequences

### Positive

- **Installable dependency graph.** `packages/mobile-app` resolves `@brain-storm/mobile` to the
  local workspace, so the two packages are linked instead of silently missing.
- **Auditable packages.** `npm audit --workspace=packages/mobile` and
  `--workspace=packages/mobile-app` now run, which is what surfaced the `packages/app` gap.
- **One source of truth.** The workspace array is the single declaration of repository shape;
  npm, TypeScript, and the lock file all derive from it.
- **Enforced, not merely documented.** The import rules fail the build rather than relying on
  reviewer diligence.

### Negative and Trade-offs

- **Expo stays out of the SDK.** `packages/mobile` cannot use Expo-specific modules that are not
  published as standalone packages, which constrains some notifications and secure-storage APIs.
- **Two mobile packages to maintain.** The library/app split means a mobile change is often
  delivered as a pair of coordinated edits.
- **Workspace-wide installs.** Adding a package to the workspace array changes the hoisting
  layout of the whole repository, so lock file churn is larger than for a standalone package.
- **Lint cost.** Boundary enforcement runs on every lint pass and adds a small amount of
  resolution work across the monorepo.

---

## Alternatives Considered

| Alternative                                     | Evaluation                                                                         | Why Rejected                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Merge `mobile` into `mobile-app`**           | One mobile package instead of two.                                                  | **Deprecated.** Destroys the reusable SDK for non-Expo hosts and forces the Expo toolchain on every consumer. |
| **Keep both packages out of the workspace**     | No manifest or lock file churn.                                                     | The packages stay unresolvable, unauditable, and invisible — the drift this ADR removes.  |
| **A single `packages/client` for all clients**  | One shared client package for web, mobile, and backend.                             | The web and mobile runtimes have incompatible dependency trees (DOM vs React Native); a merged package would drag both into every consumer. |
| **Nx for workspace orchestration**             | Better caching and task graph than raw npm workspaces.                              | Adds a toolchain and a second source of truth for the package graph without addressing the import rules. npm workspaces plus ESLint boundary rules cover the problem at a fraction of the cost. |
| **Enforce boundaries in review only**          | No lint configuration to maintain.                                                  | Documentation that is not machine-checked regresses silently; the import rules must fail the build. |

---

## References

- [ADR-0001: Soroban Contract Module Boundaries](./0001-contract-module-boundaries.md)
- [ADR-006: Contract-Per-Domain Architecture](./ADR-006-contract-per-domain-architecture.md)
- [ADR-010: Backend Module Boundaries](./ADR-010-backend-module-boundaries.md)
- [docs/adr/README.md](./README.md)
