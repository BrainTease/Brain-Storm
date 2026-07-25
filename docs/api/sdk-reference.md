# `@brain-storm/sdk` — API Reference

Complete reference for the public surface of `packages/sdk`.

- **Source of truth:** `packages/sdk/src/index.ts` — every entry below is derived from the TSDoc there.
- **Versioning policy:** [`sdk-versioning.md`](./sdk-versioning.md)
- **Package overview:** [`packages/sdk/README.md`](../../packages/sdk/README.md)

---

## What this SDK is

A dependency-free, typed client for the Brain-Storm **REST API**. It wraps HTTP calls to `apps/backend`; the types mirror the backend's OpenAPI spec.

**It does not build, sign or submit Stellar or Soroban transactions.** The only Stellar surface is one read (`stellar.getBalance`), which the backend relays from Horizon. Transaction signing lives in the client apps' wallet adapters (`apps/frontend/src/lib/walletAdapters.ts` for Freighter, `packages/mobile/src/wallet` on mobile), not here. This matters for versioning — see [Scope of the contract](./sdk-versioning.md#scope-of-the-contract).

## Requirements

| Requirement | Detail |
| --- | --- |
| Global `fetch` | Any browser, Node **18+**, or React Native. No polyfill is bundled. |
| `axios` | Declared as a `peerDependency` but **not used** by the current source. See [Known gaps](#known-gaps). |
| Runtime deps | None. |

## The public surface at a glance

Everything exported from `packages/sdk/src/index.ts`, and nothing else, is public API.

### Values

| Export | Kind | Summary |
| --- | --- | --- |
| [`BrainStormClient`](#brainstormclient) | `class` | The single entry point. Groups the API by resource. |
| `default` | re-export | Identical to `BrainStormClient`. |

### Types

| Export | Used by |
| --- | --- |
| [`BrainStormClientOptions`](#brainstormclientoptions) | `new BrainStormClient(…)` |
| [`LoginDto`](#logindto) | `auth.login` |
| [`RegisterDto`](#registerdto) | `auth.register` |
| [`AuthResponse`](#authresponse) | `auth.login`, `auth.register` |
| [`CourseDto`](#coursedto) | `courses.get`, `courses.create`, `courses.update` |
| [`CreateCourseDto`](#createcoursedto) | `courses.create` |
| [`UpdateCourseDto`](#updatecoursedto) | `courses.update` |
| [`CourseListResponse`](#courselistresponse) | `courses.list` |
| [`CourseQueryParams`](#coursequeryparams) | `courses.list` |
| [`RecordProgressDto`](#recordprogressdto) | `progress.record` |
| [`ProgressDto`](#progressdto) | `progress.record`, `progress.getMyCourseProgress` |
| [`UserDto`](#userdto) | `users.getProfile`, `users.updateProfile` |
| [`UpdateUserDto`](#updateuserdto) | `users.updateProfile` |
| [`StellarBalanceResponse`](#stellarbalanceresponse) | `stellar.getBalance` |
| [`ApiError`](#apierror) | Shape of thrown errors |
| [`HttpAdapter`](#httpadapter) | Transport contract (not yet injectable) |

### Not exported

The per-resource classes — `AuthClient`, `CoursesClient`, `ProgressClient`, `UsersClient`, `StellarClient` — and `FetchHttpAdapter` are **internal**. Their *methods* are public API (reached through `client.auth`, `client.courses`, …), but the class names are not exported, so downstream code cannot annotate a variable as `CoursesClient`. Use `BrainStormClient['courses']` if you need the type:

```typescript
type CoursesNamespace = BrainStormClient['courses'];
```

Exporting these names later would be a **minor** (additive) change. See [Known gaps](#known-gaps).

---

## `BrainStormClient`

```typescript
class BrainStormClient {
  constructor(options: BrainStormClientOptions);

  readonly auth: AuthClient;
  readonly courses: CoursesClient;
  readonly progress: ProgressClient;
  readonly users: UsersClient;
  readonly stellar: StellarClient;

  setToken(token: string): void;
}
```

The SDK's single entry point. All five namespaces share one HTTP adapter, so `setToken` authenticates every namespace at once.

### `new BrainStormClient(options)`

| Parameter | Type | Notes |
| --- | --- | --- |
| `options` | [`BrainStormClientOptions`](#brainstormclientoptions) | Required. |

```typescript
import { BrainStormClient } from '@brain-storm/sdk';

const client = new BrainStormClient({ baseURL: 'https://api.brain-storm.com' });
```

### `setToken(token)`

Sets or replaces the JWT bearer token used for authenticated requests. Takes effect immediately across every namespace.

There is **no way to clear** the token — construct a new client to drop credentials. Adding a `clearToken()` would be a minor change.

---

## `BrainStormClientOptions`

```typescript
interface BrainStormClientOptions {
  baseURL: string;
  token?: string;
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `baseURL` | `string` | **Must not** include the `/v1` prefix or a trailing slash — the SDK appends versioned paths such as `/v1/courses` itself. `'https://api.brain-storm.com'`, not `'https://api.brain-storm.com/v1/'`. |
| `token` | `string?` | JWT to start with. Use when restoring a persisted session. |

---

## `client.auth`

### `register(dto: RegisterDto): Promise<AuthResponse>`

`POST /v1/auth/register`. Creates an account and returns a token pair — no separate login call needed.

Throws with `statusCode` `409` if the email is already registered, `400` if the password fails server-side complexity rules.

### `login(dto: LoginDto): Promise<AuthResponse>`

`POST /v1/auth/login`. Exchanges credentials for a token pair.

Does **not** set the token on the client — pass the returned `access_token` to `setToken`.

Throws with `statusCode` `401` for bad credentials, or for a missing/incorrect `mfa_token` on an MFA-enabled account.

### `logout(refreshToken: string): Promise<void>`

`POST /v1/auth/logout`. Revokes a refresh token server-side.

Takes the **refresh** token, not the access token. Does not clear the client's access token, and the already-issued access token stays valid until it expires — clear local state yourself.

---

## `client.courses`

### `list(params?: CourseQueryParams): Promise<CourseListResponse>`

`GET /v1/courses`. Lists published courses, filtered and paginated.

Parameters are serialised with `URLSearchParams`, so numbers are stringified and `undefined` fields are dropped.

### `get(id: string): Promise<CourseDto>`

`GET /v1/courses/{id}`. Throws `404` when the course does not exist, or is an unpublished draft the caller cannot see.

### `create(dto: CreateCourseDto): Promise<CourseDto>`

`POST /v1/courses`. Creates a course, initially unpublished. Requires an authenticated instructor or admin; throws `403` otherwise.

### `update(id: string, dto: UpdateCourseDto): Promise<CourseDto>`

`PATCH /v1/courses/{id}`. Applies a partial update, returns the full updated course. Requires ownership or admin.

### `remove(id: string): Promise<void>`

`DELETE /v1/courses/{id}`. Named `remove` rather than `delete` because `delete` is a reserved word. Requires ownership or admin.

---

## `client.progress`

### `record(dto: RecordProgressDto): Promise<ProgressDto>`

`POST /v1/progress`. Records progress for the authenticated user.

An **upsert** — calling it repeatedly for the same course/lesson updates the existing record rather than creating duplicates. Reaching `progressPct: 100` is what triggers credential issuance server-side.

### `getMyCourseProgress(courseId: string): Promise<ProgressDto>`

`GET /v1/progress/my/{courseId}`. Throws `404` when the user has no progress record for the course yet — treat that as "0%", not as an error.

---

## `client.users`

### `getProfile(id: string): Promise<UserDto>`

`GET /v1/users/{id}`. Private fields are omitted when reading a profile other than your own, so treat every optional field on [`UserDto`](#userdto) as genuinely absent-able.

### `updateProfile(id: string, dto: UpdateUserDto): Promise<UserDto>`

`PATCH /v1/users/{id}`. Only the authenticated user's own profile may be updated, unless the caller is an admin.

---

## `client.stellar`

Read-only. See [What this SDK is](#what-this-sdk-is).

### `getBalance(publicKey: string): Promise<StellarBalanceResponse>`

`GET /v1/stellar/balance/{publicKey}`. Fetches balances for a Stellar account address (`G…`).

Throws `404` if Horizon does not know the account — i.e. it has never been funded.

---

## Type definitions

### `LoginDto`

```typescript
interface LoginDto {
  email: string;
  password: string;
  mfa_token?: string;
}
```

`mfa_token` is required only for MFA-enabled accounts; omitting it for such an account fails with `401`.

### `RegisterDto`

```typescript
interface RegisterDto {
  email: string;
  password: string;
}
```

`email` must be unique across the platform. Password complexity is enforced server-side.

### `AuthResponse`

```typescript
interface AuthResponse {
  access_token: string;
  refresh_token: string;
}
```

Pass `access_token` to `setToken`. Store `refresh_token` securely — it is the argument to `auth.logout`.

### `CourseDto`

```typescript
interface CourseDto {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished: boolean;
  requiresKyc: boolean;
  createdAt: string;
}
```

| Field | Notes |
| --- | --- |
| `id` | UUID. |
| `level` | Adding a tier is **breaking** for consumers that `switch` exhaustively. |
| `durationHours` | Absent when the author has not set it. |
| `isPublished` | `false` for drafts, visible only to their author and admins. |
| `requiresKyc` | When `true`, enrolment requires a completed KYC check. |
| `createdAt` | ISO 8601 string, not a `Date`. |

### `CreateCourseDto`

```typescript
interface CreateCourseDto {
  title: string;
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  requiresKyc?: boolean;
}
```

`level` defaults to `'beginner'` and `requiresKyc` to `false` server-side.

### `UpdateCourseDto`

```typescript
interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished?: boolean;
}
```

A partial update — omitted fields are unchanged. Note the asymmetry with `CreateCourseDto`: this **cannot** change `requiresKyc`, and it can change `isPublished` (set `true` to publish a draft).

### `CourseListResponse`

```typescript
interface CourseListResponse {
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
}
```

`total` counts all matching courses across pages, for computing page counts. `page` is 1-based. `limit` is the page size actually applied, which may be lower than requested if it exceeded the server-side cap.

### `CourseQueryParams`

```typescript
interface CourseQueryParams {
  search?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  page?: number;
  limit?: number;
}
```

`search` is free-text across title and description. `page` is 1-based, defaulting to `1`.

### `RecordProgressDto`

```typescript
interface RecordProgressDto {
  courseId: string;
  lessonId?: string;
  progressPct: number;
}
```

`progressPct` is `0`–`100`. Include `lessonId` for lesson-level progress; omit it for course-level.

### `ProgressDto`

```typescript
interface ProgressDto {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPct: number;
  updatedAt: string;
}
```

`progressPct: 100` means complete. `updatedAt` is an ISO 8601 string.

### `UserDto`

```typescript
interface UserDto {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role: string;
  stellarPublicKey?: string;
  isVerified: boolean;
  createdAt: string;
}
```

| Field | Notes |
| --- | --- |
| `role` | Deliberately `string`, not a union, so adding a role server-side does not break downstream compilation. Compare against `'student'` / `'instructor'` / `'admin'`. |
| `stellarPublicKey` | Present once a wallet has been linked. |
| `avatar` | Absolute URL. |
| `createdAt` | ISO 8601 string. |

Which optional fields are populated depends on the caller's relationship to the user.

### `UpdateUserDto`

```typescript
interface UpdateUserDto {
  username?: string;
  avatar?: string;
  bio?: string;
}
```

A partial update. Email and role are not editable through this endpoint.

### `StellarBalanceResponse`

```typescript
interface StellarBalanceResponse {
  balances: Array<{
    asset_type: string;
    balance: string;
    asset_code?: string;
  }>;
}
```

> **Balances are decimal strings, not numbers.** Stellar amounts carry 7 decimal digits of precision; `Number('100.0000001')` is lossy for large balances. Use a decimal library or string arithmetic.

`asset_type` is a Horizon type such as `'native'` or `'credit_alphanum4'`. `asset_code` (e.g. `'BST'`) is absent for the native XLM balance.

### `ApiError`

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
```

The SDK never *returns* this — it **throws** an `Error` whose `message` is `ApiError.message`, with the `ApiError` fields assigned onto the error object via `Object.assign`. Narrow it like this:

```typescript
import type { ApiError } from '@brain-storm/sdk';

try {
  await client.courses.get(id);
} catch (e) {
  const err = e as Error & Partial<ApiError>;
  if (err.statusCode === 404) {
    // not found
  } else if (err.statusCode === 401) {
    // token expired — refresh and retry
  } else {
    throw e;
  }
}
```

If the error body is not valid JSON, the SDK synthesises `{ statusCode: res.status, message: res.statusText }`.

### `HttpAdapter`

```typescript
interface HttpAdapter {
  get<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  delete<T>(url: string, options?: RequestInit): Promise<T>;
}
```

The transport contract the resource clients depend on. All four methods must reject on a non-2xx response.

> **`BrainStormClient` does not accept one.** It always constructs its own `fetch`-based adapter internally. `HttpAdapter` is exported so consumers can *describe* a transport in their own code (for retries, logging, or a test double), but there is currently no way to inject it. Accepting an optional adapter in `BrainStormClientOptions` is a planned additive change — see [Known gaps](#known-gaps).

---

## Downstream usage cross-check

Issue #766 assumed this SDK is consumed by `apps/frontend` and `packages/mobile*`. **As of this document, it is not.** Verified by searching every `.ts`/`.tsx`/`.js`/`.json` file in the repo for `@brain-storm/sdk`:

| Consumer | Uses the SDK? | What it actually uses |
| --- | --- | --- |
| `apps/frontend` | No | Its own `axios` instance, `apps/frontend/src/lib/api.ts`, plus per-domain wrappers (`lib/forumApi.ts`, `lib/adminApi.ts`, …). |
| `packages/mobile-app` | No | Its own `axios` `ApiClient`, `packages/mobile-app/src/api/client.ts`. |
| `packages/mobile` | No | No HTTP layer; it covers auth storage, cache, notifications and wallet. |
| `apps/backend` | No | Defines the API the SDK targets. |

The only references anywhere are `packages/sdk`'s own files and one incorrect snippet in `docs/api-documentation-automation.md` (corrected alongside this document).

**Consequences for the acceptance criterion "all exports actually imported by `apps/frontend` or `packages/mobile*` are documented":** that set is currently empty, so it is satisfied trivially. This reference therefore documents the **entire** export surface rather than only the consumed subset, which is the stricter reading and the one that will hold once a client does adopt the SDK.

**Re-run the cross-check** whenever the surface changes:

```bash
grep -rn "@brain-storm/sdk" --include=*.ts --include=*.tsx --include=*.js --include=*.json . \
  | grep -v node_modules | grep -v "^./packages/sdk/"
```

Any export that appears in the output must have an entry above.

---

## Known gaps

These are documented rather than fixed, because #766 is a documentation issue and each is an API or build change that warrants its own review. Each is annotated with how the [versioning policy](./sdk-versioning.md) would classify the fix.

| # | Gap | Fix classification |
| --- | --- | --- |
| 1 | `packages/sdk` is **not** in the root `package.json` `workspaces` array, so `npm install` never links it. `import … from '@brain-storm/sdk'` would fail to resolve today. | Build fix — no version impact. |
| 2 | `package.json` declares `"generate": "node ../../scripts/generate-sdk.js"`, but the script is `scripts/generate-sdk.sh`. The npm script is broken. | Patch. |
| 3 | `scripts/generate-sdk.sh` only exports and copies `openapi.json` — it never regenerates `src/index.ts`. Despite the "auto-generated" description, **the surface is hand-maintained** and can silently drift from the backend. | Process fix; see [Keeping the surface honest](./sdk-versioning.md#keeping-the-surface-honest). |
| 4 | `axios` is a `peerDependency` but is not imported anywhere in `src/`. Consumers are forced to install a dependency the SDK does not use. | Removing it is **breaking** (peer-dependency change), so it waits for the next major. |
| 5 | `HttpAdapter` is exported but cannot be injected into `BrainStormClient`. | Minor (additive optional field). |
| 6 | Resource client classes are not exported, so their types cannot be named downstream. | Minor (additive export). |
| 7 | No `clearToken()` / `logout()` that resets client-side credentials. | Minor (additive method). |
| 8 | The SDK has no tests. | No version impact. |

## See also

- [`sdk-versioning.md`](./sdk-versioning.md) — semver rules and changelog format
- [`packages/sdk/CHANGELOG.md`](../../packages/sdk/CHANGELOG.md) — release history
- [`api-versioning.md`](../api-versioning.md) — versioning of the **HTTP API** the SDK wraps, which is a separate contract
- [`stellar-integration.md`](../stellar-integration.md) — where transaction building actually happens
