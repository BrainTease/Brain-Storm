# Strict Mode Rollout — `packages/api`

Tracking the incremental enablement of TypeScript strict mode in this
package (issue #1217).

## Status

`strict: true` is **enabled** in `packages/api/tsconfig.json` as of the
PR that introduced this file. There is no staged rollout — the package
was small enough (7 source files) to flip strict in a single change.

## Coverage

| File | Strict | Notes |
|------|:------:|-------|
| `src/index.ts` | ✅ | Express entry; typed error handler |
| `src/middleware/responseInterceptor.ts` | ✅ | Response envelope |
| `src/routes/userRoutes.ts` | ✅ | Route definitions |
| `src/controllers/BaseController.ts` | ✅ | Base class |
| `src/controllers/UserController.ts` | ✅ | User endpoints |
| `src/types/response.ts` | ✅ | Envelope types |
| `src/__tests__/response-envelope.test.ts` | ✅ | Excluded from build, still strict-checked |

## Policy

- **No `@ts-ignore` or `@ts-expect-error`** are permitted to bypass strict
  errors. If a fix truly cannot be expressed in the type system, open a
  discussion first.
- New files in this package must compile under strict from day one.

## Re-check

```bash
npm run typecheck --workspace=@brain-storm/api
