# Backend Changelog

## Unreleased

### Standardize API response envelope and Swagger decorators (#57)

- Added `@ApiProperty` / `@ApiPropertyOptional` decorators to every public
  field of `ApiResponseDto` and the nested `PaginationMeta` class so the
  generated OpenAPI spec fully describes the response envelope.
- No structural change to the envelope shape — this is non-breaking.

### Add graceful shutdown, health and readiness checks (#58)

- `GracefulShutdownService` already implemented; fixed the unit test
  (`graceful-shutdown.service.spec.ts`) which constructed the service without
  the required `ConfigService` dependency.
- Added tests covering `drainTimeoutMs` configuration, `onModuleDestroy`,
  and `registerCleanup`.

### Make retries/timeouts for external calls configurable (#59)

- Added `src/common/http/fetch-with-retry.ts` — a shared helper that wraps
  `fetch` with a per-request `AbortSignal` timeout and exponential-backoff
  retries for transient errors (network errors and 429/5xx responses).
- Three new env vars (validated in `validation.schema.ts`, mapped in
  `configuration.ts`) control the shared defaults:
  - `EXTERNAL_HTTP_TIMEOUT_MS` (default `10000`)
  - `EXTERNAL_HTTP_MAX_RETRIES` (default `3`)
  - `EXTERNAL_HTTP_RETRY_BASE_DELAY_MS` (default `1000`)
- **Callers updated**: `SynapsKycProvider`, `PushNotificationService`, and
  `WebhooksService` now read these values via `ConfigService` instead of
  hard-coding them.
- `SorobanRpcClientService` reads `externalHttp.maxRetries` and
  `externalHttp.retryBaseDelayMs` from `ConfigService` instead of using
  the module-level `MAX_RETRIES`/`BASE_DELAY_MS` constants.

**No breaking API change.** All defaults match the previous hard-coded
values so existing deployments without the new env vars behave identically.

### Route file split by resource (#973)

- Split `AdminController` into `AdminUserManagementController`
  (`/v1/admin/users/*`) and `DisputesController` (`/v1/admin/disputes/*`) so
  each resource owns a focused route file.
- Moved shared middleware (`cache-headers`, `idempotency`, `security`,
  `shutdown`) out of `common/middleware` and `health/` into a dedicated
  `src/middleware/` module with a barrel `index.ts`.

### Standardized error-response shape (#974)

- `GlobalExceptionFilter` is now the single source of the error envelope and
  always returns `{ code, message, details }` (`details` defaults to `{}`
  instead of being omitted), alongside the existing `statusCode`/`timestamp`/
  `path` fields kept for backwards compatibility.
- Removed the redundant `HttpExceptionFilter`, `ValidationExceptionFilter`,
  and `error-handling.middleware.ts` — they duplicated `GlobalExceptionFilter`
  with inconsistent shapes.

### Database access layer extraction (#976)

- Routed `CoursesService` and `UsersService` through the existing
  `CoursesRepository` / `UsersRepository` interfaces instead of injecting
  TypeORM `Repository` directly.
- `PublicCredentialVerificationController` no longer injects a TypeORM
  `Repository` or builds queries itself — it now calls the new
  `CredentialsRepository.findByIdWithRelations` /
  `findByTxHashWithRelations` methods, removing the last raw query from a
  route handler.

### Auth endpoint audit (#975)

Audited `apps/backend/src/auth` for legacy `/auth/*` endpoints described as
"superseded by wallet-signature authentication" so they could be removed.

**Outcome: no endpoints were removed.** The audit found that email/password
auth (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`,
`/auth/verify`, `/auth/resend-verification`, `/auth/forgot-password`,
`/auth/reset-password`, `/auth/mfa/*`) is not legacy — it is documented as a
first-class, still-supported flow that coexists with SEP-0010 Stellar
wallet-signature auth (see `docs/stellar-auth.md`, which states the JWT
issued by wallet-signature login "is identical to the one issued by the
email/password login flow" and that a wallet-only user can "later link an
email/password via the profile settings"). A repo-wide search also found
active, current callers of every one of these routes in
`apps/frontend` (login/registration pages, password-reset flow, MFA
settings, and the Playwright/Pact test suites).

No route, controller, or middleware in `apps/backend/src/auth` was found to
be dead, unreferenced, or marked deprecated. Removing any of the
email/password endpoints would break live authentication for existing
frontend clients, contradicting both the code and the documented auth
architecture.

If there is a specific endpoint or client integration that should be
retired, please point to it (or the log/audit data showing zero traffic)
and it can be removed in a follow-up with a proper client migration path,
mirroring the versioned-removal pattern already documented in
`docs/api-versioning.md`.
