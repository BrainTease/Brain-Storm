# Backend API Reference

Auto-generated reference of every active REST route exposed by `apps/backend` (NestJS). Generated for [issue #764](https://github.com/BrainTease/Brain-Storm/issues/764).

This is a **generated index**, not the source of truth for request/response bodies. `apps/backend` already uses `@nestjs/swagger` decorators throughout its controllers and DTOs to produce a full OpenAPI 3.0 spec at runtime — that spec, not this file, has the authoritative request/response JSON schemas and error response shapes for every route. This file exists to answer "what routes exist and what do they need for auth," at a glance, without running the backend.

## How this was generated

The table below was produced by mechanically parsing every `*.controller.ts` file under `apps/backend/src` for `@Controller(...)`, `@Get/@Post/@Put/@Patch/@Delete(...)`, `@UseGuards(...)`, `@Public()`, and `@Roles(...)` decorators — not hand-transcribed — so it can be regenerated and diffed against the router whenever controllers change. As of this writing it covers **314 routes across 57 controllers in 43 domains**, matching `find apps/backend/src -iname '*.controller.ts' | wc -l` (57) at the time of writing. No `@deprecated`/`@ApiExcludeEndpoint` markers were found in any controller, so every route listed here is active.

To regenerate this table yourself (no NestJS build or database required):

```bash
python3 scripts/list-api-routes.py
```

This prints the same markdown grouped by domain to stdout (route count/domain count/controller count to stderr) — diff it against the table below to check for drift. Pass `--json` for the raw structured data if you're scripting against it.

## Regenerating the Full OpenAPI Spec

The commands below produce the full request/response JSON schemas and error codes for every route.

`apps/backend` already exports a complete OpenAPI 3.0 document from its Swagger decorators. This is the CI-independent, documented way to regenerate it locally, per the `Makefile`:

```bash
make export-openapi
```

which runs:

```bash
npm run build --workspace=apps/backend
cd apps/backend && EXPORT_OPENAPI=true node dist/main --export-openapi
mkdir -p docs/api/dist
cp apps/backend/openapi.json docs/api/dist/openapi.json
cp docs/api/swagger-ui.html docs/api/dist/index.html
```

This requires the backend to be able to bootstrap (a reachable PostgreSQL instance per your `.env` — see [docs/development-setup.md](../development-setup.md)), since `main.ts` boots the full Nest application before serializing its route/DTO metadata to `openapi.json`. Open `docs/api/dist/index.html` in a browser to view it via Swagger UI, or run the backend normally and visit `http://localhost:3000/api/docs`.

See also [docs/api/DEPLOYMENT.md](./DEPLOYMENT.md) for publishing the generated spec to GitHub Pages.

## Route index

Grouped by top-level domain (the first path segment under `apps/backend/src/`). "Auth" reflects the effective guards active on each route (class-level guards merged with method-level overrides); `—` means no guard decorator was found (verify against the controller before assuming a route is unauthenticated — some domains gate access inside the handler body rather than via a guard decorator).

### access-control (7 routes)

**`AccessControlController`** — `apps/backend/src/access-control/access-control.controller.ts`

| Method | Path                                                      | Auth | Handler               |
| ------ | --------------------------------------------------------- | ---- | --------------------- |
| POST   | `/v1/access-control/grant`                                | JWT  | `grantAccess`         |
| POST   | `/v1/access-control/check`                                | JWT  | `checkAccess`         |
| DELETE | `/v1/access-control/:courseId/users/:userId`              | JWT  | `revokeAccess`        |
| POST   | `/v1/access-control/:courseId/users/:userId/subscription` | JWT  | `updateSubscription`  |
| GET    | `/v1/access-control/:courseId/logs`                       | JWT  | `getAccessLogs`       |
| GET    | `/v1/access-control/:courseId/users/:userId`              | JWT  | `getAccessControl`    |
| GET    | `/v1/access-control/:courseId/users`                      | JWT  | `getCourseAccessList` |

### admin (7 routes)

**`AdminController`** — `apps/backend/src/admin/admin.controller.ts`

| Method | Path                             | Auth                                                  | Handler          |
| ------ | -------------------------------- | ----------------------------------------------------- | ---------------- |
| PATCH  | `/v1/admin/users/:id/ban`        | JWT + Roles                                           | `banUser`        |
| PATCH  | `/v1/admin/users/:id/suspend`    | JWT + Roles (roles: 'admin')                          | `suspendUser`    |
| PATCH  | `/v1/admin/users/:id/role`       | JWT + Roles (roles: 'admin')                          | `changeRole`     |
| POST   | `/v1/admin/disputes`             | JWT + Roles (roles: 'admin')                          | `createDispute`  |
| GET    | `/v1/admin/disputes`             | JWT + Roles (roles: 'admin', 'student', 'instructor') | `listDisputes`   |
| GET    | `/v1/admin/disputes/:id`         | JWT + Roles (roles: 'admin')                          | `getDispute`     |
| PATCH  | `/v1/admin/disputes/:id/resolve` | JWT + Roles (roles: 'admin')                          | `resolveDispute` |

### analytics (12 routes)

**`AdminAnalyticsController`** — `apps/backend/src/analytics/admin-analytics.controller.ts`

| Method | Path                            | Auth                         | Handler |
| ------ | ------------------------------- | ---------------------------- | ------- |
| GET    | `/v1/admin/analytics/dashboard` | JWT + Roles (roles: 'admin') | ``      |
| GET    | `/v1/admin/analytics/export`    | JWT + Roles                  | ``      |

**`AnalyticsController`** — `apps/backend/src/analytics/analytics.controller.ts`

| Method | Path                                | Auth | Handler        |
| ------ | ----------------------------------- | ---- | -------------- |
| GET    | `/v1/courses/:id/analytics`         | JWT  | `getAnalytics` |
| POST   | `/v1/courses/:id/analytics/refresh` | JWT  | `refresh`      |

**`InstructorAnalyticsController`** — `apps/backend/src/analytics/instructor-analytics.controller.ts`

| Method | Path                                  | Auth | Handler        |
| ------ | ------------------------------------- | ---- | -------------- |
| GET    | `/v1/analytics/instructor`            | JWT  | `getAnalytics` |
| GET    | `/v1/analytics/instructor/export/csv` | JWT  | `exportToCSV`  |

**`PlatformAnalyticsController`** — `apps/backend/src/analytics/platform-analytics.controller.ts`

| Method | Path                          | Auth | Handler        |
| ------ | ----------------------------- | ---- | -------------- |
| POST   | `/v1/analytics/events`        | —    | `trackEvent`   |
| GET    | `/v1/analytics/dashboard`     | —    | `getDashboard` |
| GET    | `/v1/analytics/events`        | —    | ``             |
| GET    | `/v1/analytics/events/export` | —    | `exportEvents` |

**`ProtocolMetricsController`** — `apps/backend/src/analytics/protocol-metrics.controller.ts`

| Method | Path                               | Auth | Handler   |
| ------ | ---------------------------------- | ---- | --------- |
| GET    | `/v1/protocol-metrics/summary`     | —    | `summary` |
| GET    | `/v1/protocol-metrics/time-series` | —    | ``        |

### api-usage (5 routes)

**`ApiUsageController`** — `apps/backend/src/api-usage/api-usage.controller.ts`

| Method | Path                     | Auth                         | Handler       |
| ------ | ------------------------ | ---------------------------- | ------------- |
| GET    | `/api-usage/dashboard`   | JWT + Roles (roles: 'admin') | ``            |
| GET    | `/api-usage/by-endpoint` | JWT + Roles                  | ``            |
| GET    | `/api-usage/by-user`     | JWT + Roles                  | ``            |
| GET    | `/api-usage/by-time`     | JWT + Roles                  | ``            |
| GET    | `/api-usage/alerts`      | JWT + Roles                  | `checkAlerts` |

### audit (4 routes)

**`AuditController`** — `apps/backend/src/audit/audit.controller.ts`

| Method | Path            | Auth                         | Handler     |
| ------ | --------------- | ---------------------------- | ----------- |
| GET    | `/audit`        | JWT + Roles                  | ``          |
| GET    | `/audit/export` | JWT + Roles (roles: 'admin') | ``          |
| GET    | `/audit/verify` | JWT + Roles (roles: 'admin') | ``          |
| GET    | `/audit/me`     | JWT + Roles (roles: 'admin') | `getMyLogs` |

### auth (18 routes)

**`AuthController`** — `apps/backend/src/auth/auth.controller.ts`

| Method | Path                                | Auth                         | Handler                 |
| ------ | ----------------------------------- | ---------------------------- | ----------------------- |
| GET    | `/auth/stellar`                     | —                            | ``                      |
| POST   | `/auth/stellar`                     | —                            | ``                      |
| POST   | `/auth/register`                    | —                            | ``                      |
| POST   | `/auth/login`                       | —                            | ``                      |
| POST   | `/auth/refresh`                     | —                            | ``                      |
| POST   | `/auth/logout`                      | —                            | ``                      |
| GET    | `/auth/verify`                      | —                            | ``                      |
| POST   | `/auth/resend-verification`         | —                            | ``                      |
| POST   | `/auth/forgot-password`             | —                            | ``                      |
| POST   | `/auth/reset-password`              | —                            | ``                      |
| POST   | `/auth/mfa/enable`                  | —                            | `enableMfa`             |
| POST   | `/auth/mfa/verify`                  | JWT                          | `verifyMfa`             |
| POST   | `/auth/mfa/disable`                 | JWT                          | `disableMfa`            |
| POST   | `/auth/mfa/backup-codes/regenerate` | JWT                          | `regenerateBackupCodes` |
| POST   | `/auth/admin/api-keys`              | JWT                          | `generateApiKey`        |
| POST   | `/auth/admin/api-keys/revoke`       | JWT + Roles (roles: 'admin') | `revokeApiKey`          |
| POST   | `/auth/stellar-challenge`           | JWT + Roles (roles: 'admin') | ``                      |
| POST   | `/auth/stellar-verify`              | JWT                          | ``                      |

### batch (7 routes)

**`BatchController`** — `apps/backend/src/batch/batch.controller.ts`

| Method | Path                  | Auth                         | Handler        |
| ------ | --------------------- | ---------------------------- | -------------- |
| POST   | `/batch/users`        | JWT + Roles (roles: 'admin') | ``             |
| POST   | `/batch/courses`      | JWT + Roles                  | ``             |
| POST   | `/batch/certificates` | JWT + Roles                  | ``             |
| POST   | `/batch/emails`       | JWT + Roles                  | ``             |
| POST   | `/batch/export`       | JWT + Roles                  | ``             |
| GET    | `/batch/jobs`         | JWT + Roles                  | `listJobs`     |
| GET    | `/batch/jobs/:jobId`  | JWT + Roles                  | `getJobStatus` |

### bookings (8 routes)

**`BookingsController`** — `apps/backend/src/bookings/bookings.controller.ts`

| Method | Path                                  | Auth | Handler           |
| ------ | ------------------------------------- | ---- | ----------------- |
| POST   | `/v1/bookings/availability`           | JWT  | `setAvailability` |
| GET    | `/v1/bookings/availability/:workerId` | JWT  | `getAvailability` |
| POST   | `/v1/bookings`                        | JWT  | ``                |
| GET    | `/v1/bookings`                        | JWT  | `getMyBookings`   |
| GET    | `/v1/bookings/:id`                    | JWT  | `getBooking`      |
| PATCH  | `/v1/bookings/:id/accept`             | JWT  | `acceptBooking`   |
| PATCH  | `/v1/bookings/:id/reject`             | JWT  | `rejectBooking`   |
| DELETE | `/v1/bookings/:id`                    | JWT  | ``                |

### cache (3 routes)

**`CacheManagementController`** — `apps/backend/src/cache/cache-management.controller.ts`

| Method | Path           | Auth                         | Handler |
| ------ | -------------- | ---------------------------- | ------- |
| GET    | `/cache/stats` | JWT + Roles (roles: 'admin') | `stats` |
| POST   | `/cache/clear` | JWT + Roles                  | `clear` |
| POST   | `/cache/warm`  | JWT + Roles                  | `warm`  |

### cdn (6 routes)

**`CdnController`** — `apps/backend/src/cdn/cdn.controller.ts`

| Method | Path                          | Auth | Handler           |
| ------ | ----------------------------- | ---- | ----------------- |
| POST   | `/v1/cdn/upload`              | JWT  | `uploadAsset`     |
| GET    | `/v1/cdn/:assetId/signed-url` | JWT  | `getSignedUrl`    |
| POST   | `/v1/cdn/:assetId/transcode`  | JWT  | `markTranscoded`  |
| POST   | `/v1/cdn/:assetId/invalidate` | JWT  | `invalidateCache` |
| GET    | `/v1/cdn/:assetId`            | JWT  | `getAsset`        |
| GET    | `/v1/cdn/lesson/:lessonId`    | JWT  | `getLessonAssets` |

### certificates (6 routes)

**`CertificatesController`** — `apps/backend/src/certificates/certificates.controller.ts`

| Method | Path                            | Auth       | Handler               |
| ------ | ------------------------------- | ---------- | --------------------- |
| POST   | `/v1/certificates`              | JWT        | ``                    |
| POST   | `/v1/certificates/verify`       | RolesGuard | ``                    |
| GET    | `/v1/certificates/user/:userId` | JWT        | `getUserCertificates` |
| GET    | `/v1/certificates/verify/:hash` | JWT        | `verifyCertificate`   |
| GET    | `/v1/certificates/:id/pdf`      | JWT        | ``                    |
| GET    | `/v1/certificates/:id`          | JWT        | ``                    |

### cohorts (13 routes)

**`CohortsController`** — `apps/backend/src/cohorts/cohorts.controller.ts`

| Method | Path                                    | Auth | Handler              |
| ------ | --------------------------------------- | ---- | -------------------- |
| POST   | `/v1/cohorts`                           | JWT  | `createCohort`       |
| GET    | `/v1/cohorts/:id`                       | JWT  | `getCohort`          |
| POST   | `/v1/cohorts/:cohortId/members`         | JWT  | `addMember`          |
| DELETE | `/v1/cohorts/:cohortId/members/:userId` | JWT  | `removeMember`       |
| POST   | `/v1/cohorts/:cohortId/progress`        | JWT  | `updateProgress`     |
| GET    | `/v1/cohorts/:cohortId/progress`        | JWT  | `getCohortProgress`  |
| GET    | `/v1/cohorts/course/:courseId`          | JWT  | `getCohortsByCourse` |

**`SessionsController`** — `apps/backend/src/cohorts/sessions.controller.ts`

| Method | Path                                                   | Auth | Handler               |
| ------ | ------------------------------------------------------ | ---- | --------------------- |
| POST   | `/v1/cohorts/:cohortId/sessions`                       | JWT  | `createSession`       |
| GET    | `/v1/cohorts/:cohortId/sessions`                       | JWT  | `getSessionsByCohort` |
| GET    | `/v1/cohorts/:cohortId/sessions/:sessionId`            | JWT  | `getSession`          |
| GET    | `/v1/cohorts/:cohortId/sessions/:sessionId/attendance` | JWT  | `getAttendance`       |
| POST   | `/v1/cohorts/:cohortId/sessions/:sessionId/attendance` | JWT  | `recordAttendance`    |
| GET    | `/v1/cohorts/:cohortId/sessions/:sessionId/invite`     | JWT  | `getCalendarInvite`   |

### coupons (7 routes)

**`CouponsController`** — `apps/backend/src/coupons/coupons.controller.ts`

| Method | Path                   | Auth                         | Handler        |
| ------ | ---------------------- | ---------------------------- | -------------- |
| POST   | `/v1/coupons`          | —                            | `create`       |
| POST   | `/v1/coupons/bulk`     | JWT + Roles (roles: 'admin') | `generateBulk` |
| POST   | `/v1/coupons/validate` | JWT + Roles (roles: 'admin') | `validate`     |
| GET    | `/v1/coupons`          | —                            | `findAll`      |
| GET    | `/v1/coupons/:id`      | JWT + Roles (roles: 'admin') | `findById`     |
| PATCH  | `/v1/coupons/:id`      | JWT + Roles (roles: 'admin') | `update`       |
| DELETE | `/v1/coupons/:id`      | JWT + Roles (roles: 'admin') | `delete`       |

### courses (27 routes)

**`CourseVersioningController`** — `apps/backend/src/courses/course-versioning.controller.ts`

| Method | Path                                              | Auth                                       | Handler         |
| ------ | ------------------------------------------------- | ------------------------------------------ | --------------- |
| POST   | `/courses/:courseId/versions`                     | JWT + Roles                                | `createVersion` |
| GET    | `/courses/:courseId/versions`                     | JWT + Roles (roles: 'admin', 'instructor') | `listVersions`  |
| GET    | `/courses/:courseId/versions/diff`                | JWT + Roles (roles: 'admin', 'instructor') | ``              |
| GET    | `/courses/:courseId/versions/:versionId`          | JWT + Roles (roles: 'admin', 'instructor') | `getVersion`    |
| POST   | `/courses/:courseId/versions/:versionId/rollback` | JWT + Roles (roles: 'admin', 'instructor') | `rollback`      |

**`CoursesController`** — `apps/backend/src/courses/courses.controller.ts`

| Method | Path                    | Auth                                       | Handler |
| ------ | ----------------------- | ------------------------------------------ | ------- |
| GET    | `/courses`              | —                                          | ``      |
| GET    | `/courses/:id`          | —                                          | ``      |
| POST   | `/courses`              | —                                          | ``      |
| PATCH  | `/courses/:id`          | JWT + Roles (roles: 'admin', 'instructor') | ``      |
| DELETE | `/courses/:id`          | JWT + Roles (roles: 'admin', 'instructor') | ``      |
| POST   | `/courses/:id/schedule` | JWT + Roles (roles: 'admin', 'instructor') | ``      |
| POST   | `/courses/:id/publish`  | JWT + Roles (roles: 'admin', 'instructor') | ``      |

**`ModulesController`** — `apps/backend/src/courses/modules.controller.ts`

| Method | Path                         | Auth                                       | Handler |
| ------ | ---------------------------- | ------------------------------------------ | ------- |
| GET    | `/courses/:courseId/modules` | —                                          | ``      |
| POST   | `/courses/:courseId/modules` | JWT + Roles (roles: 'instructor', 'admin') | ``      |
| PATCH  | `/modules/:id`               | JWT + Roles (roles: 'instructor', 'admin') | ``      |
| DELETE | `/modules/:id`               | JWT + Roles (roles: 'instructor', 'admin') | ``      |
| GET    | `/modules/:moduleId/lessons` | —                                          | ``      |
| POST   | `/modules/:moduleId/lessons` | JWT + Roles (roles: 'instructor', 'admin') | ``      |
| PATCH  | `/lessons/:id`               | JWT + Roles (roles: 'instructor', 'admin') | ``      |
| DELETE | `/lessons/:id`               | JWT + Roles (roles: 'instructor', 'admin') | ``      |

**`PrerequisitesController`** — `apps/backend/src/courses/prerequisites.controller.ts`

| Method | Path                                                | Auth                                                  | Handler                 |
| ------ | --------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| GET    | `/courses/:courseId/prerequisites`                  | JWT + Roles                                           | `getPrerequisites`      |
| GET    | `/courses/:courseId/prerequisites/chain`            | JWT + Roles (roles: 'admin', 'instructor', 'student') | `getChain`              |
| POST   | `/courses/:courseId/prerequisites`                  | JWT + Roles (roles: 'admin', 'instructor', 'student') | `addPrerequisite`       |
| DELETE | `/courses/:courseId/prerequisites/:prerequisiteId`  | JWT + Roles (roles: 'admin', 'instructor')            | `removePrerequisite`    |
| POST   | `/courses/:courseId/prerequisites/validate/:userId` | JWT + Roles (roles: 'admin', 'instructor')            | `validatePrerequisites` |

**`ReviewsController`** — `apps/backend/src/courses/reviews.controller.ts`

| Method | Path                   | Auth | Handler |
| ------ | ---------------------- | ---- | ------- |
| POST   | `/courses/:id/reviews` | —    | ``      |
| GET    | `/courses/:id/reviews` | JWT  | ``      |

### credentials (8 routes)

**`CredentialsController`** — `apps/backend/src/credentials/credentials.controller.ts`

| Method | Path                          | Auth | Handler |
| ------ | ----------------------------- | ---- | ------- |
| GET    | `/credentials/:id/pdf`        | JWT  | ``      |
| GET    | `/credentials/:userId`        | JWT  | ``      |
| GET    | `/credentials/verify/:txHash` | JWT  | ``      |
| POST   | `/credentials/issue`          | JWT  | ``      |

**`PublicCredentialVerificationController`** — `apps/backend/src/credentials/public-credential-verification.controller.ts`

| Method | Path                                      | Auth | Handler |
| ------ | ----------------------------------------- | ---- | ------- |
| GET    | `/public/credentials/:id/verify`          | —    | ``      |
| GET    | `/public/credentials/hash/:txHash/verify` | —    | ``      |
| GET    | `/public/credentials/:id/widget`          | —    | ``      |
| GET    | `/public/credentials/:id/badge`           | —    | ``      |

### email (3 routes)

**`EmailController`** — `apps/backend/src/email/email.controller.ts`

| Method | Path                    | Auth | Handler             |
| ------ | ----------------------- | ---- | ------------------- |
| GET    | `/v1/email/unsubscribe` | —    | `unsubscribe`       |
| GET    | `/v1/email/preferences` | JWT  | `getPreferences`    |
| PATCH  | `/v1/email/preferences` | JWT  | `updatePreferences` |

### enrollments (7 routes)

**`EnrollmentsController`** — `apps/backend/src/enrollments/enrollments.controller.ts`

| Method | Path                                    | Auth | Handler |
| ------ | --------------------------------------- | ---- | ------- |
| POST   | `/v1/enrollments`                       | JWT  | ``      |
| GET    | `/v1/enrollments`                       | JWT  | ``      |
| GET    | `/v1/enrollments/:id`                   | JWT  | ``      |
| DELETE | `/v1/enrollments/:id`                   | JWT  | ``      |
| POST   | `/v1/enrollments/courses/:id/enroll`    | JWT  | ``      |
| DELETE | `/v1/enrollments/courses/:id/enroll`    | JWT  | ``      |
| GET    | `/v1/enrollments/users/:id/enrollments` | JWT  | ``      |

### feature-flags (5 routes)

**`FeatureFlagsController`** — `apps/backend/src/feature-flags/feature-flags.controller.ts`

| Method | Path                           | Auth | Handler         |
| ------ | ------------------------------ | ---- | --------------- |
| GET    | `/feature-flags/evaluate/:key` | —    | ``              |
| POST   | `/feature-flags/evaluate`      | JWT  | `evaluateBatch` |
| GET    | `/feature-flags`               | JWT  | `findAll`       |
| POST   | `/feature-flags`               | JWT  | `upsert`        |
| DELETE | `/feature-flags/:key`          | JWT  | `remove`        |

### forums (3 routes)

**`ForumsController`** — `apps/backend/src/forums/forums.controller.ts`

| Method | Path                 | Auth | Handler        |
| ------ | -------------------- | ---- | -------------- |
| GET    | `/courses/:id/posts` | —    | `findByCourse` |
| POST   | `/courses/:id/posts` | —    | ``             |
| POST   | `/posts/:id/replies` | JWT  | ``             |

### gateway (2 routes)

**`GatewayController`** — `apps/backend/src/gateway/gateway.controller.ts`

| Method | Path                 | Auth | Handler  |
| ------ | -------------------- | ---- | -------- |
| GET    | `/v1/gateway/health` | —    | `health` |
| GET    | `/v1/gateway/routes` | —    | ``       |

### gdpr (2 routes)

**`PrivacyController`** — `apps/backend/src/gdpr/privacy.controller.ts`

| Method | Path                  | Auth | Handler |
| ------ | --------------------- | ---- | ------- |
| GET    | `/v1/privacy/export`  | JWT  | ``      |
| DELETE | `/v1/privacy/account` | JWT  | ``      |

### health (3 routes)

**`HealthController`** — `apps/backend/src/health/health.controller.ts`

| Method | Path                | Auth | Handler |
| ------ | ------------------- | ---- | ------- |
| GET    | `/health/liveness`  | —    | ``      |
| GET    | `/health/readiness` | —    | ``      |
| GET    | `/health`           | —    | ``      |

### import-export (5 routes)

**`ImportExportController`** — `apps/backend/src/import-export/import-export.controller.ts`

| Method | Path                          | Auth                                       | Handler        |
| ------ | ----------------------------- | ------------------------------------------ | -------------- |
| GET    | `/courses/:id/export`         | JWT + Roles (roles: 'instructor', 'admin') | `exportCourse` |
| POST   | `/courses/import/json`        | JWT + Roles                                | ``             |
| POST   | `/courses/import/scorm`       | JWT + Roles                                | ``             |
| POST   | `/courses/import/bulk`        | JWT + Roles                                | ``             |
| GET    | `/courses/import/jobs/:jobId` | JWT + Roles                                | `getJobStatus` |

### jobs (11 routes)

**`JobsController`** — `apps/backend/src/jobs/jobs.controller.ts`

| Method | Path                                 | Auth | Handler              |
| ------ | ------------------------------------ | ---- | -------------------- |
| GET    | `/jobs`                              | —    | `findAll`            |
| GET    | `/jobs/recommendations`              | JWT  | `getRecommendations` |
| GET    | `/jobs/:id`                          | —    | `findOne`            |
| POST   | `/jobs`                              | JWT  | `create`             |
| PATCH  | `/jobs/:id`                          | JWT  | `update`             |
| DELETE | `/jobs/:id`                          | JWT  | `remove`             |
| POST   | `/jobs/:id/apply`                    | JWT  | `apply`              |
| GET    | `/jobs/:id/applications`             | JWT  | `getApplications`    |
| GET    | `/jobs/applications/mine`            | JWT  | `myApplications`     |
| PATCH  | `/jobs/applications/:appId/status`   | JWT  | `updateStatus`       |
| PATCH  | `/jobs/applications/:appId/withdraw` | JWT  | `withdraw`           |

### kyc (5 routes)

**`KycController`** — `apps/backend/src/kyc/kyc.controller.ts`

| Method | Path                            | Auth | Handler               |
| ------ | ------------------------------- | ---- | --------------------- |
| GET    | `/kyc/status/:stellarPublicKey` | —    | `getStatus`           |
| PUT    | `/kyc/customer`                 | —    | `upsertCustomer`      |
| POST   | `/kyc/customer/document`        | —    | ``                    |
| GET    | `/kyc/report`                   | —    | `getComplianceReport` |
| POST   | `/kyc/webhook`                  | —    | `webhook`             |

### leaderboard (6 routes)

**`LeaderboardController`** — `apps/backend/src/leaderboard/leaderboard.controller.ts`

| Method | Path           | Auth | Handler          |
| ------ | -------------- | ---- | ---------------- |
| GET    | `/leaderboard` | —    | `getLeaderboard` |

**`RedisLeaderboardController`** — `apps/backend/src/leaderboard/redis-leaderboard.controller.ts`

| Method | Path                               | Auth | Handler |
| ------ | ---------------------------------- | ---- | ------- |
| GET    | `/v1/leaderboard/global`           | —    | ``      |
| GET    | `/v1/leaderboard/course/:courseId` | —    | ``      |
| GET    | `/v1/leaderboard/cohort/:cohortId` | —    | ``      |
| GET    | `/v1/leaderboard/me`               | —    | ``      |
| GET    | `/v1/leaderboard/top`              | JWT  | ``      |

### media (6 routes)

**`MediaController`** — `apps/backend/src/media/media.controller.ts`

| Method | Path                     | Auth | Handler            |
| ------ | ------------------------ | ---- | ------------------ |
| POST   | `/media/upload`          | JWT  | ``                 |
| GET    | `/media/mine`            | JWT  | `mine`             |
| GET    | `/media/:id/url`         | JWT  | `getUrl`           |
| GET    | `/media/:id/url/:suffix` | JWT  | `getDerivativeUrl` |
| DELETE | `/media/:id`             | JWT  | `delete`           |
| DELETE | `/media/:id/purge`       | JWT  | `purge`            |

### moderation (6 routes)

**`ModerationController`** — `apps/backend/src/moderation/moderation.controller.ts`

| Method | Path                             | Auth       | Handler  |
| ------ | -------------------------------- | ---------- | -------- |
| POST   | `/moderation/flag`               | JWT        | `flag`   |
| GET    | `/moderation/queue`              | JWT        | ``       |
| PATCH  | `/moderation/:id/review`         | RolesGuard | ``       |
| POST   | `/moderation/:id/appeal`         | RolesGuard | `appeal` |
| PATCH  | `/moderation/:id/appeal/resolve` | JWT        | ``       |
| GET    | `/moderation/:id/logs`           | RolesGuard | ``       |

### notifications (10 routes)

**`NotificationPreferencesController`** — `apps/backend/src/notifications/notification-preferences.controller.ts`

| Method | Path                         | Auth | Handler  |
| ------ | ---------------------------- | ---- | -------- |
| GET    | `/notifications/preferences` | JWT  | `get`    |
| PUT    | `/notifications/preferences` | JWT  | `upsert` |

**`NotificationsController`** — `apps/backend/src/notifications/notifications.controller.ts`

| Method | Path                             | Auth | Handler                |
| ------ | -------------------------------- | ---- | ---------------------- |
| GET    | `/notifications`                 | JWT  | `findAll`              |
| PATCH  | `/notifications/:id/read`        | JWT  | ``                     |
| PATCH  | `/notifications/read-all`        | JWT  | `markAllAsRead`        |
| GET    | `/notifications/preferences`     | JWT  | `getPreferences`       |
| PATCH  | `/notifications/preferences`     | JWT  | ``                     |
| POST   | `/notifications/schedule`        | JWT  | `scheduleNotification` |
| DELETE | `/notifications/schedule/:id`    | JWT  | ``                     |
| POST   | `/notifications/register-device` | JWT  | ``                     |

### organizations (10 routes)

**`OrganizationsController`** — `apps/backend/src/organizations/organizations.controller.ts`

| Method | Path                                              | Auth | Handler              |
| ------ | ------------------------------------------------- | ---- | -------------------- |
| POST   | `/v1/organizations`                               | JWT  | `createOrganization` |
| GET    | `/v1/organizations`                               | JWT  | `getMyOrganizations` |
| GET    | `/v1/organizations/:orgId`                        | JWT  | `getOrganization`    |
| GET    | `/v1/organizations/:orgId/members`                | JWT  | `getMembers`         |
| POST   | `/v1/organizations/:orgId/invite`                 | JWT  | `inviteMember`       |
| POST   | `/v1/organizations/invite/:token/accept`          | JWT  | `acceptInvite`       |
| PUT    | `/v1/organizations/:orgId/members/:memberId/role` | JWT  | `changeRole`         |
| DELETE | `/v1/organizations/:orgId/members/:memberId`      | JWT  | `removeMember`       |
| GET    | `/v1/organizations/:orgId/billing`                | JWT  | `getBillingProfile`  |
| PUT    | `/v1/organizations/:orgId/billing/budget`         | JWT  | `updateBudget`       |

### payments (8 routes)

**`PaymentsController`** — `apps/backend/src/payments/payments.controller.ts`

| Method | Path                            | Auth | Handler         |
| ------ | ------------------------------- | ---- | --------------- |
| POST   | `/v1/payments/checkout`         | —    | ``              |
| POST   | `/v1/payments/subscriptions`    | JWT  | ``              |
| GET    | `/v1/payments/subscriptions/me` | JWT  | ``              |
| DELETE | `/v1/payments/subscriptions/me` | JWT  | ``              |
| GET    | `/v1/payments/invoices`         | JWT  | ``              |
| GET    | `/v1/payments/history`          | JWT  | ``              |
| POST   | `/v1/payments/stripe/webhook`   | JWT  | `stripeWebhook` |
| POST   | `/v1/payments/stellar/verify`   | —    | ``              |

### payouts (5 routes)

**`PayoutsController`** — `apps/backend/src/payouts/payouts.controller.ts`

| Method | Path                                           | Auth                         | Handler                |
| ------ | ---------------------------------------------- | ---------------------------- | ---------------------- |
| POST   | `/v1/payouts/calculate`                        | —                            | `calculatePayouts`     |
| POST   | `/v1/payouts/:payoutId/process`                | JWT + Roles (roles: 'admin') | `processPayout`        |
| GET    | `/v1/payouts/instructor/:instructorId`         | JWT + Roles (roles: 'admin') | `getInstructorPayouts` |
| GET    | `/v1/payouts/instructor/:instructorId/stats`   | JWT                          | `getPayoutStats`       |
| GET    | `/v1/payouts/instructor/:instructorId/history` | JWT                          | `getPayoutHistory`     |

### progress (5 routes)

**`ProgressController`** — `apps/backend/src/progress/progress.controller.ts`

| Method | Path                              | Auth | Handler |
| ------ | --------------------------------- | ---- | ------- |
| POST   | `/v1/progress`                    | JWT  | ``      |
| GET    | `/v1/progress/:courseId`          | JWT  | ``      |
| GET    | `/v1/progress/user/:userId`       | JWT  | ``      |
| POST   | `/v1/progress/progress`           | JWT  | ``      |
| GET    | `/v1/progress/users/:id/progress` | JWT  | ``      |

### quizzes (8 routes)

**`QuizzesController`** — `apps/backend/src/quizzes/quizzes.controller.ts`

| Method | Path                                        | Auth | Handler       |
| ------ | ------------------------------------------- | ---- | ------------- |
| GET    | `/v1/quizzes/:id`                           | JWT  | ``            |
| POST   | `/v1/quizzes/:quizId/submit`                | JWT  | ``            |
| GET    | `/v1/quizzes/:quizId/results`               | JWT  | ``            |
| POST   | `/v1/quizzes/:lessonId`                     | JWT  | `createQuiz`  |
| POST   | `/v1/quizzes/:quizId/questions`             | JWT  | `addQuestion` |
| POST   | `/v1/quizzes/questions/:questionId/answers` | JWT  | `addAnswer`   |
| POST   | `/v1/quizzes/:attemptId/grade`              | JWT  | `gradeEssay`  |
| GET    | `/v1/quizzes/:quizId/attempts`              | JWT  | `getAttempts` |

### rate-limit (5 routes)

**`RateLimitController`** — `apps/backend/src/rate-limit/rate-limit.controller.ts`

| Method | Path                              | Auth       | Handler       |
| ------ | --------------------------------- | ---------- | ------------- |
| GET    | `/rate-limit/status`              | JWT        | `getMyStatus` |
| GET    | `/rate-limit/config`              | JWT        | ``            |
| DELETE | `/rate-limit/users/:userId/reset` | RolesGuard | ``            |
| POST   | `/rate-limit/allowlist/:userId`   | RolesGuard | ``            |
| DELETE | `/rate-limit/allowlist/:userId`   | RolesGuard | ``            |

### recommendations (5 routes)

**`RecommendationSignalsController`** — `apps/backend/src/recommendations/recommendation-signals.controller.ts`

| Method | Path                                         | Auth | Handler           |
| ------ | -------------------------------------------- | ---- | ----------------- |
| POST   | `/v1/recommendations/signals`                | JWT  | ``                |
| GET    | `/v1/recommendations/signal-recommendations` | JWT  | ``                |
| DELETE | `/v1/recommendations/signals`                | JWT  | `deleteMySignals` |
| GET    | `/v1/recommendations/evaluate`               | JWT  | ``                |

**`RecommendationsController`** — `apps/backend/src/recommendations/recommendations.controller.ts`

| Method | Path                  | Auth | Handler              |
| ------ | --------------------- | ---- | -------------------- |
| GET    | `/v1/recommendations` | JWT  | `getRecommendations` |

### reminders (5 routes)

**`RemindersController`** — `apps/backend/src/reminders/reminders.controller.ts`

| Method | Path                                      | Auth                         | Handler                 |
| ------ | ----------------------------------------- | ---------------------------- | ----------------------- |
| POST   | `/v1/reminders/send-inactive`             | —                            | `sendInactiveReminders` |
| POST   | `/v1/reminders/:userId/:courseId`         | JWT + Roles (roles: 'admin') | `createReminder`        |
| PATCH  | `/v1/reminders/:userId/:courseId/disable` | JWT                          | `disableReminder`       |
| PATCH  | `/v1/reminders/:userId/:courseId/enable`  | JWT                          | `enableReminder`        |
| GET    | `/v1/reminders/stats`                     | JWT                          | `getReminderStats`      |

### search (5 routes)

**`SearchController`** — `apps/backend/src/search/search.controller.ts`

| Method | Path                            | Auth                         | Handler      |
| ------ | ------------------------------- | ---------------------------- | ------------ |
| GET    | `/search`                       | —                            | ``           |
| GET    | `/search/autocomplete`          | —                            | ``           |
| POST   | `/search/click`                 | —                            | `trackClick` |
| GET    | `/search/analytics/top-queries` | —                            | ``           |
| POST   | `/search/evaluate`              | JWT + Roles (roles: 'admin') | ``           |

### secrets (7 routes)

**`SecretRotationController`** — `apps/backend/src/secrets/secret-rotation.controller.ts`

| Method | Path                                  | Auth       | Handler        |
| ------ | ------------------------------------- | ---------- | -------------- |
| POST   | `/secrets/api-keys/:id/rotate`        | JWT        | `rotateApiKey` |
| GET    | `/secrets/rotation-history`           | JWT        | ``             |
| GET    | `/secrets/access-logs`                | RolesGuard | ``             |
| GET    | `/secrets/aws/list`                   | RolesGuard | ``             |
| GET    | `/secrets/aws/:name/describe`         | RolesGuard | ``             |
| POST   | `/secrets/aws/:name/backup`           | RolesGuard | ``             |
| POST   | `/secrets/aws/:name/emergency-access` | RolesGuard | ``             |

### stellar (7 routes)

**`StellarController`** — `apps/backend/src/stellar/stellar.controller.ts`

| Method | Path                                   | Auth                         | Handler            |
| ------ | -------------------------------------- | ---------------------------- | ------------------ |
| GET    | `/stellar/network-status`              | —                            | `getNetworkStatus` |
| GET    | `/stellar/balance/:publicKey`          | —                            | `getBalance`       |
| POST   | `/stellar/fund-testnet`                | —                            | ``                 |
| POST   | `/stellar/mint`                        | —                            | ``                 |
| GET    | `/stellar/transactions/verify/:txHash` | JWT + Roles (roles: 'admin') | ``                 |
| GET    | `/stellar/transactions`                | JWT                          | ``                 |
| POST   | `/stellar/issue`                       | JWT + Roles (roles: 'admin') | ``                 |

### surveys (6 routes)

**`SurveysController`** — `apps/backend/src/surveys/surveys.controller.ts`

| Method | Path                              | Auth       | Handler              |
| ------ | --------------------------------- | ---------- | -------------------- |
| POST   | `/v1/surveys`                     | JWT        | `createSurvey`       |
| POST   | `/v1/surveys/:surveyId/questions` | RolesGuard | `addQuestion`        |
| POST   | `/v1/surveys/:surveyId/responses` | RolesGuard | `submitResponse`     |
| GET    | `/v1/surveys/course/:courseId`    | JWT        | `getSurveysByCourse` |
| GET    | `/v1/surveys/:surveyId/responses` | JWT        | `getResponses`       |
| GET    | `/v1/surveys/:surveyId/analytics` | RolesGuard | `getAnalytics`       |

### users (17 routes)

**`GdprController`** — `apps/backend/src/users/gdpr.controller.ts`

| Method | Path                | Auth | Handler   |
| ------ | ------------------- | ---- | --------- |
| GET    | `/gdpr/export`      | JWT  | `export`  |
| DELETE | `/gdpr/delete`      | JWT  | `delete`  |
| POST   | `/gdpr/recover/:id` | JWT  | `recover` |
| POST   | `/gdpr/purge`       | JWT  | `purge`   |

**`UsersController`** — `apps/backend/src/users/users.controller.ts`

| Method | Path                           | Auth        | Handler            |
| ------ | ------------------------------ | ----------- | ------------------ |
| GET    | `/v1/users/me`                 | JWT         | ``                 |
| GET    | `/v1/users/:id`                | JWT         | ``                 |
| PATCH  | `/v1/users/:id`                | JWT         | ``                 |
| POST   | `/v1/users/avatar`             | JWT         | ``                 |
| GET    | `/v1/users`                    | JWT         | ``                 |
| GET    | `/v1/users/:id/token-balance`  | RolesGuard  | ``                 |
| GET    | `/v1/users/:id/referrals`      | JWT         | `getReferrals`     |
| GET    | `/v1/users`                    | JWT + Roles | ``                 |
| POST   | `/v1/users/import/csv`         | JWT         | ``                 |
| GET    | `/v1/users/import-jobs/:jobId` | JWT         | `getUserImportJob` |
| PATCH  | `/v1/users/:id/role`           | JWT         | ``                 |
| PATCH  | `/v1/users/:id/ban`            | JWT         | ``                 |
| DELETE | `/v1/users/:id`                | JWT         | ``                 |

### webhooks (9 routes)

**`WebhooksController`** — `apps/backend/src/webhooks/webhooks.controller.ts`

| Method | Path                                         | Auth | Handler           |
| ------ | -------------------------------------------- | ---- | ----------------- |
| POST   | `/v1/webhooks`                               | JWT  | `create`          |
| GET    | `/v1/webhooks`                               | JWT  | `list`            |
| PATCH  | `/v1/webhooks/:id`                           | JWT  | `update`          |
| DELETE | `/v1/webhooks/:id`                           | JWT  | `remove`          |
| POST   | `/v1/webhooks/:id/rotate-secret`             | JWT  | `rotateSecret`    |
| GET    | `/v1/webhooks/:id/logs`                      | JWT  | `logs`            |
| GET    | `/v1/webhooks/:id/dlq`                       | JWT  | `dlq`             |
| POST   | `/v1/webhooks/deliveries/:deliveryId/replay` | JWT  | `replayDelivery`  |
| POST   | `/v1/webhooks/verify-signature`              | JWT  | `verifySignature` |

## See also

- [docs/api/DEPLOYMENT.md](./DEPLOYMENT.md) — publishing the generated OpenAPI spec to GitHub Pages
- [docs/api/swagger-ui.html](./swagger-ui.html) — static Swagger UI shell used for the published spec
- [docs/development-setup.md](../development-setup.md) — running the backend locally so `/api/docs` is reachable
