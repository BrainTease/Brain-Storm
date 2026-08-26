# @brain-storm/sdk — API Reference

> Generated API reference for the public surface of the `@brain-storm/sdk` package.

The `@brain-storm/sdk` package provides a fully-typed, zero-dependency client for the Brain-Storm REST API. It is consumed by `apps/frontend`, `packages/mobile-app`, and third-party integrations to interact with courses, learner progress, user authentication, profiles, and Stellar account queries.

- **Package Name:** `@brain-storm/sdk`
- **Source of Truth:** [`packages/sdk/src/index.ts`](../../../packages/sdk/src/index.ts)
- **Target Runtime:** Browser, Node.js (18+), React Native (with global `fetch`)
- **Versioning Policy:** [SDK Versioning Guide](../sdk-versioning.md)

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Quick Start](#quick-start)
3. [Public Surface Summary](#public-surface-summary)
4. [Client Classes](#client-classes)
   - [`BrainStormClient`](./classes/BrainStormClient.md)
   - [`client.auth` (AuthClient)](./classes/BrainStormClient.md#authclient-namespace-clientauth)
   - [`client.courses` (CoursesClient)](./classes/BrainStormClient.md#coursesclient-namespace-clientcourses)
   - [`client.progress` (ProgressClient)](./classes/BrainStormClient.md#progressclient-namespace-clientprogress)
   - [`client.users` (UsersClient)](./classes/BrainStormClient.md#usersclient-namespace-clientusers)
   - [`client.stellar` (StellarClient)](./classes/BrainStormClient.md#stellarclient-namespace-clientstellar)
5. [Data Transfer Objects (DTOs) & Types](#data-transfer-objects-dtos--types)
   - [Full Types and DTOs Reference](./interfaces/types-and-dtos.md)
6. [Error Handling](#error-handling)

---

## Installation & Setup

```bash
# Monorepo workspace installation:
npm install @brain-storm/sdk --workspace=apps/frontend
# or
npm install @brain-storm/sdk --workspace=packages/mobile-app
```

---

## Quick Start

```typescript
import { BrainStormClient } from '@brain-storm/sdk';

// 1. Initialize client
const client = new BrainStormClient({
  baseURL: 'https://api.brain-storm.com', // no trailing slash or /v1 prefix
});

// 2. Authenticate
const { access_token } = await client.auth.login({
  email: 'learner@example.com',
  password: 'SecurePassword123!',
});

// 3. Set Bearer token for subsequent authenticated calls
client.setToken(access_token);

// 4. Query published courses
const courses = await client.courses.list({
  level: 'beginner',
  limit: 10,
});

console.log(`Found ${courses.total} courses:`, courses.data);

// 5. Record course progress
await client.progress.record({
  courseId: courses.data[0].id,
  progressPct: 100, // Reaching 100% triggers on-chain credential issuance
});
```

---

## Public Surface Summary

Every export from `packages/sdk/src/index.ts` is strictly governed by the semantic versioning contract:

### Main Client
| Export | Kind | Description |
|---|---|---|
| [`BrainStormClient`](./classes/BrainStormClient.md) | `class` | Primary entry point grouping all resource namespaces. |
| `default` | re-export | Default export alias for `BrainStormClient`. |

### Namespaces & Methods
| Namespace | Methods | Description |
|---|---|---|
| `client.auth` | `register`, `login`, `logout` | User registration, credential authentication, session revocation |
| `client.courses` | `list`, `get`, `create`, `update`, `remove` | Course catalogue browsing, search, authoring, and management |
| `client.progress` | `record`, `getMyCourseProgress` | Student progress updates and course completion tracking |
| `client.users` | `getProfile`, `updateProfile` | User profile retrieval and bio/avatar updates |
| `client.stellar` | `getBalance` | Relay query for Stellar/Soroban account asset balances |

### Types & Interfaces
| Type / Interface | Description |
|---|---|
| [`BrainStormClientOptions`](./interfaces/types-and-dtos.md#brainstormclientoptions) | Constructor configuration options (`baseURL`, `token`) |
| [`LoginDto`](./interfaces/types-and-dtos.md#logindto) | Payload for user login with optional MFA TOTP token |
| [`RegisterDto`](./interfaces/types-and-dtos.md#registerdto) | Payload for user registration |
| [`AuthResponse`](./interfaces/types-and-dtos.md#authresponse) | Access and refresh token pair |
| [`CourseDto`](./interfaces/types-and-dtos.md#coursedto) | Full course entity model |
| [`CreateCourseDto`](./interfaces/types-and-dtos.md#createcoursedto) | Course creation request payload |
| [`UpdateCourseDto`](./interfaces/types-and-dtos.md#updatecoursedto) | Course partial update payload |
| [`CourseListResponse`](./interfaces/types-and-dtos.md#courselistresponse) | Paginated list response for courses |
| [`CourseQueryParams`](./interfaces/types-and-dtos.md#coursequeryparams) | Filter and pagination query parameters |
| [`RecordProgressDto`](./interfaces/types-and-dtos.md#recordprogressdto) | Course/lesson progress submission payload |
| [`ProgressDto`](./interfaces/types-and-dtos.md#progressdto) | Stored progress record with percentage and timestamps |
| [`UserDto`](./interfaces/types-and-dtos.md#userdto) | User profile data with role and Stellar public key |
| [`UpdateUserDto`](./interfaces/types-and-dtos.md#updateuserdto) | User profile editable fields |
| [`StellarBalanceResponse`](./interfaces/types-and-dtos.md#stellarbalanceresponse) | Account balances (decimal strings for 7-decimal precision) |
| [`ApiError`](./interfaces/types-and-dtos.md#apierror) | Standard error structure returned on non-2xx HTTP responses |
| [`HttpAdapter`](./interfaces/types-and-dtos.md#httpadapter) | Abstract transport interface contract |

---

## Error Handling

When an API call returns a non-2xx HTTP response, the SDK throws an `Error` whose properties conform to [`ApiError`](./interfaces/types-and-dtos.md#apierror):

```typescript
import { ApiError } from '@brain-storm/sdk';

try {
  const course = await client.courses.get('invalid-uuid');
} catch (error) {
  const apiError = error as Error & Partial<ApiError>;
  console.error(`HTTP ${apiError.statusCode}: ${apiError.message}`);
  if (apiError.statusCode === 404) {
    // Handle not found
  }
}
```
