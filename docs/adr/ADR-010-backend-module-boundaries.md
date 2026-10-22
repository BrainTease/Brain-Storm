# ADR-010: Backend Module Boundaries for `apps/backend`

**Status:** Proposed

**Date:** 2026-10-16

**Author(s):** Brain-Storm Architecture Team

---

## Context

`apps/backend` is a NestJS application with more than 60 feature directories under `src/`. Several of them depend on each other directly:

- `courses` imports from `auth`, `enrollments`, `users`, `notifications`, `common`, and `cache`.
- `analytics` imports from `courses`, `auth`, `enrollments`, `users`, and `cache`.
- `stellar` imports from `common`, `auth`, `users`, and `notifications`.
- `notifications` imports from `common` and `auth`.
- `auth` imports from `users` and `common`.

There is no written rule for which of these edges are allowed. Without one, refactors have no target, and new code tends to reach into whichever module is closest. Cycles and deep feature-to-feature coupling make it hard to extract a module into its own service later.

This ADR records the intended dependency rules so that refactors and code review have a fixed reference. It does not require any code change on its own.

---

## Decision

Backend modules fall into two layers.

**Shared layer** (may be imported by any feature module, and must not import feature modules):

- `common` (DTOs, pipes, guards, utilities)
- `config`
- `database` (data source, migrations plumbing)
- `cache`
- `metrics`, `tracing`, `health`

**Feature layer** (every other directory under `src/`):

1. A feature module may import from the shared layer freely.
2. A feature module may depend on `auth` and `users` for identity and profile lookups.
3. A feature module may depend on at most one other feature module for domain data, and that edge must be listed in the allowed-dependency table below.
4. Feature modules must not import another module's `*.entity.ts` directly for writes. Writes go through that module's service.
5. Import cycles between feature modules are not allowed. If two modules need each other, move the shared piece into a new feature module or into the shared layer.
6. `notifications` is a sink. It may be called by other features, but it must not import their services.

### Allowed feature-to-feature dependencies

| Module          | May depend on                                              |
| --------------- | ---------------------------------------------------------- |
| `auth`          | `users`                                                    |
| `users`         | none (feature)                                             |
| `notifications` | `auth`                                                     |
| `enrollments`   | `courses`, `users`                                         |
| `courses`       | `auth`, `enrollments`, `users`, `notifications`            |
| `analytics`     | `courses`, `enrollments`, `users`, `auth`                  |
| `stellar`       | `auth`, `users`, `notifications`                           |

Any other feature-to-feature import is a violation of this ADR.

---

## Rationale

- **Explicit table over implicit convention.** Reviewers can check an import against a table rather than reconstruct intent from the code.
- **`auth` and `users` as the identity base.** Nearly every feature needs the current user, so making identity a permitted dependency keeps the rule simple. Both are limited to one direction to avoid a cycle.
- **`notifications` as a sink.** Notifications are triggered by many features. Keeping it dependency-free from the features that call it prevents the most common cycle.
- **Alternatives considered:**
  - *Event bus for every cross-module call.* Rejected for now. It adds latency and debugging cost, and the team has not yet needed it for these edges. It remains an option for the `analytics` edges if they grow.
  - *Allow any import and rely on review.* Rejected because the existing `courses` and `analytics` coupling already shows this does not hold.

### Trade-offs accepted

- The table will be wrong when a new feature is added. The ADR must be updated in the same PR.
- Some current code will not match the table. Those cases are listed under Implementation Notes and are not fixed by this ADR.

---

## Consequences

### Positive

- Refactors have an agreed target for each module.
- Cycle detection and module extraction become mechanical.

### Negative

- Adding a new cross-module dependency requires an ADR update, which adds process overhead.

### Neutral

- No runtime behavior changes.

---

## Implementation Notes

- **Files affected:** `apps/backend/src/**/*.module.ts` and feature service imports. No code is changed by this ADR.
- **Audit of existing imports:** Not yet complete. The import counts used in the Context section came from a grep of `src/<module>` for `../<module>` paths. Violations found by a full review should be logged as follow-up issues, as the acceptance criteria for #1258 requires.
- **Enforcement:** Manual review for now. A lint rule (`no-restricted-imports` with the table) is a possible follow-up.
- **Rollback:** Not applicable. This ADR is documentation only.

---

## References

- [ADR-002: Use NestJS over Express](./ADR-002-nestjs-over-express.md)
- [ADR-GUIDE](./ADR-GUIDE.md)
- [apps/backend README](../../apps/backend/README.md)
- GitHub issue #1258

---

## Revision History

| Date       | Author                 | Change           |
| ---------- | ---------------------- | ---------------- |
| 2026-10-16 | Brain-Storm Architecture Team | Initial proposal |
