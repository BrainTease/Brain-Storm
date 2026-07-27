# `@brain-storm/sdk`

Dependency-free, fully-typed TypeScript client for the Brain-Storm REST API.

| | |
| --- | --- |
| **Full API reference** | [`docs/api/sdk-reference.md`](../../docs/api/sdk-reference.md) |
| **Versioning policy** | [`docs/api/sdk-versioning.md`](../../docs/api/sdk-versioning.md) |
| **Changelog** | [`CHANGELOG.md`](./CHANGELOG.md) |
| **Source** | [`src/index.ts`](./src/index.ts) — every export carries TSDoc |

## Status

> **Not currently consumed by anything in this repo, and not installable as-is.**
>
> `apps/frontend` and `packages/mobile-app` each use their own `axios` client rather than this SDK, and `packages/sdk` is missing from the root `package.json` `workspaces` array — so `import … from '@brain-storm/sdk'` does not resolve today. See [Known gaps](../../docs/api/sdk-reference.md#known-gaps) for the full list, each classified by version impact.
>
> The surface is nonetheless at `1.0.0` and treated as stable: the [versioning policy](../../docs/api/sdk-versioning.md) is in force now, so anyone adopting the SDK can rely on it.

## Requirements

- A global `fetch` — any browser, **Node 18+**, or React Native. No polyfill is bundled.
- `axios` is declared as a `peerDependency` but is **not used** by the source. Removing it is a breaking change, so it waits for the next major.

## Installation

```bash
npm install @brain-storm/sdk
```

Inside this monorepo, add `packages/sdk` to the root `workspaces` array first — see the note under [Status](#status).

## Usage

```typescript
import { BrainStormClient } from '@brain-storm/sdk';

const client = new BrainStormClient({
  // No `/v1` prefix and no trailing slash — the SDK appends versioned paths itself.
  baseURL: 'https://api.brain-storm.com',
});

// Authenticate. `login` does not set the token for you.
const { access_token } = await client.auth.login({
  email: 'user@example.com',
  password: 'securepass123',
});
client.setToken(access_token);

// List courses
const { data: courses, total } = await client.courses.list({
  level: 'beginner',
  page: 1,
  limit: 20,
});

// Record progress — an upsert; reaching 100 triggers credential issuance server-side
await client.progress.record({ courseId: 'uuid', progressPct: 75 });
```

### Handling errors

The SDK **throws** on any non-2xx response; it does not return an error value. The thrown `Error` carries the [`ApiError`](../../docs/api/sdk-reference.md#apierror) fields:

```typescript
import type { ApiError } from '@brain-storm/sdk';

try {
  await client.courses.get(id);
} catch (e) {
  const err = e as Error & Partial<ApiError>;
  if (err.statusCode === 404) return null;
  throw e;
}
```

### Stellar balances are strings

```typescript
const { balances } = await client.stellar.getBalance('GABC…');
// balance is '100.0000000' — a decimal string, not a number.
// Stellar amounts carry 7 decimal digits; parsing with Number is lossy.
```

## The public surface

Everything exported from `src/index.ts`, and nothing else, is public API. Each entry links to its reference section.

**Client**

- [`BrainStormClient`](../../docs/api/sdk-reference.md#brainstormclient) — the single entry point, plus a matching `default` export
- [`BrainStormClientOptions`](../../docs/api/sdk-reference.md#brainstormclientoptions)

**Namespaces on the client**

| Namespace | Methods |
| --- | --- |
| [`client.auth`](../../docs/api/sdk-reference.md#clientauth) | `register`, `login`, `logout` |
| [`client.courses`](../../docs/api/sdk-reference.md#clientcourses) | `list`, `get`, `create`, `update`, `remove` |
| [`client.progress`](../../docs/api/sdk-reference.md#clientprogress) | `record`, `getMyCourseProgress` |
| [`client.users`](../../docs/api/sdk-reference.md#clientusers) | `getProfile`, `updateProfile` |
| [`client.stellar`](../../docs/api/sdk-reference.md#clientstellar) | `getBalance` — read-only |

**Types** — [`LoginDto`](../../docs/api/sdk-reference.md#logindto), [`RegisterDto`](../../docs/api/sdk-reference.md#registerdto), [`AuthResponse`](../../docs/api/sdk-reference.md#authresponse), [`CourseDto`](../../docs/api/sdk-reference.md#coursedto), [`CreateCourseDto`](../../docs/api/sdk-reference.md#createcoursedto), [`UpdateCourseDto`](../../docs/api/sdk-reference.md#updatecoursedto), [`CourseListResponse`](../../docs/api/sdk-reference.md#courselistresponse), [`CourseQueryParams`](../../docs/api/sdk-reference.md#coursequeryparams), [`RecordProgressDto`](../../docs/api/sdk-reference.md#recordprogressdto), [`ProgressDto`](../../docs/api/sdk-reference.md#progressdto), [`UserDto`](../../docs/api/sdk-reference.md#userdto), [`UpdateUserDto`](../../docs/api/sdk-reference.md#updateuserdto), [`StellarBalanceResponse`](../../docs/api/sdk-reference.md#stellarbalanceresponse), [`ApiError`](../../docs/api/sdk-reference.md#apierror), [`HttpAdapter`](../../docs/api/sdk-reference.md#httpadapter).

**Internal** — the per-resource classes (`AuthClient`, `CoursesClient`, `ProgressClient`, `UsersClient`, `StellarClient`) and `FetchHttpAdapter` are *not* exported. Their methods are public API; their names are not. Use `BrainStormClient['courses']` if you need the type.

## Scope

This SDK wraps the **HTTP API**. It does **not** build, sign or submit Stellar or Soroban transactions — `stellar.getBalance` is a read the backend relays from Horizon. Signing lives in the client apps' wallet adapters (`apps/frontend/src/lib/walletAdapters.ts`, `packages/mobile/src/wallet`). See [`docs/stellar-integration.md`](../../docs/stellar-integration.md).

## Versioning

At `1.0.0`, with stability guarantees already in force. Summary:

| Bump | Trigger |
| --- | --- |
| **MAJOR** | Removing/renaming an export, new required input field, changed response field type, new member in a response **union**, changed error behaviour, `peerDependencies` change |
| **MINOR** | New export, new method, new **optional** field, loosened input type, `@deprecated` marking |
| **PATCH** | Bug fixes, docs, internal refactors |

Two rules that catch people out:

- **Adding a value to a response enum is breaking here**, though it is not for the HTTP API — a TypeScript union is checked at compile time, so exhaustive `switch` statements downstream stop compiling. The two policies govern different contracts and do not conflict.
- **Never convert a decimal balance string to a number.** It is breaking *and* lossy.

Full rules, deprecation process, changelog format, and reserved rules for future transaction building: [`docs/api/sdk-versioning.md`](../../docs/api/sdk-versioning.md).

## Regenerating

```bash
./scripts/generate-sdk.sh   # from the monorepo root
```

> **This does not regenerate the client.** Despite the package description, `scripts/generate-sdk.sh` only builds the backend, exports its OpenAPI spec, and copies `openapi.json` into this package. `src/index.ts` is **hand-maintained** and can drift from the API it wraps.
>
> When changing the surface, diff the affected `*Dto` against the backend DTO in `apps/backend/src/**/dto/` and follow [Keeping the surface honest](../../docs/api/sdk-versioning.md#keeping-the-surface-honest).
>
> Note also that `npm run generate` in this package points at a non-existent `scripts/generate-sdk.js`; use the `.sh` script directly.

## Building

```bash
cd packages/sdk && npm run build   # tsc → dist/, with .d.ts declarations
```

There are currently no tests for this package.
