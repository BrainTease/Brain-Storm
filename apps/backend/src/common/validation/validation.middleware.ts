/**
 * Issue #806 — standardise input validation.
 *
 * The `ValidationMiddleware` that previously lived here was a no-op: its `use()`
 * method simply called `next()` without performing any validation.  All
 * validation is handled by:
 *
 *   1. The global `ValidationPipe` in `main.ts`  — class-validator DTO checks.
 *   2. The global `SanitizationPipe` in `main.ts` — HTML stripping / null-byte removal.
 *
 * `ValidationErrorFormatter` and `ValidationErrorResponse` were also removed
 * here because `GlobalExceptionFilter` (registered in `main.ts`) is the single
 * authoritative place for shaping error responses (#799).
 *
 * This file is kept as a reference so that imports do not break at compile time;
 * it re-exports nothing.
 */

export {};
