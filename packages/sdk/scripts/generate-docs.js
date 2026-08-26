#!/usr/bin/env node
/**
 * packages/sdk/scripts/generate-docs.js
 * 
 * Generates comprehensive API reference documentation for @brain-storm/sdk
 * public surface from packages/sdk/src/index.ts.
 * 
 * Output is written to docs/api/sdk/
 * 
 * Usage: node packages/sdk/scripts/generate-docs.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const SDK_SRC = path.join(ROOT_DIR, 'packages', 'sdk', 'src', 'index.ts');
const DOCS_OUT_DIR = path.join(ROOT_DIR, 'docs', 'api', 'sdk');

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateIndexMarkdown() {
  return `# @brain-storm/sdk — API Reference

> Generated API reference for the public surface of the \`@brain-storm/sdk\` package.

The \`@brain-storm/sdk\` package provides a fully-typed, zero-dependency client for the Brain-Storm REST API. It is consumed by \`apps/frontend\`, \`packages/mobile-app\`, and third-party integrations to interact with courses, learner progress, user authentication, profiles, and Stellar account queries.

- **Package Name:** \`@brain-storm/sdk\`
- **Source of Truth:** [\`packages/sdk/src/index.ts\`](../../../packages/sdk/src/index.ts)
- **Target Runtime:** Browser, Node.js (18+), React Native (with global \`fetch\`)
- **Versioning Policy:** [SDK Versioning Guide](../sdk-versioning.md)

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Quick Start](#quick-start)
3. [Public Surface Summary](#public-surface-summary)
4. [Client Classes](#client-classes)
   - [\`BrainStormClient\`](./classes/BrainStormClient.md)
   - [\`client.auth\` (AuthClient)](./classes/BrainStormClient.md#authclient-namespace-clientauth)
   - [\`client.courses\` (CoursesClient)](./classes/BrainStormClient.md#coursesclient-namespace-clientcourses)
   - [\`client.progress\` (ProgressClient)](./classes/BrainStormClient.md#progressclient-namespace-clientprogress)
   - [\`client.users\` (UsersClient)](./classes/BrainStormClient.md#usersclient-namespace-clientusers)
   - [\`client.stellar\` (StellarClient)](./classes/BrainStormClient.md#stellarclient-namespace-clientstellar)
5. [Data Transfer Objects (DTOs) & Types](#data-transfer-objects-dtos--types)
   - [Full Types and DTOs Reference](./interfaces/types-and-dtos.md)
6. [Error Handling](#error-handling)

---

## Installation & Setup

\`\`\`bash
# Monorepo workspace installation:
npm install @brain-storm/sdk --workspace=apps/frontend
# or
npm install @brain-storm/sdk --workspace=packages/mobile-app
\`\`\`

---

## Quick Start

\`\`\`typescript
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

console.log(\`Found \${courses.total} courses:\`, courses.data);

// 5. Record course progress
await client.progress.record({
  courseId: courses.data[0].id,
  progressPct: 100, // Reaching 100% triggers on-chain credential issuance
});
\`\`\`

---

## Public Surface Summary

Every export from \`packages/sdk/src/index.ts\` is strictly governed by the semantic versioning contract:

### Main Client
| Export | Kind | Description |
|---|---|---|
| [\`BrainStormClient\`](./classes/BrainStormClient.md) | \`class\` | Primary entry point grouping all resource namespaces. |
| \`default\` | re-export | Default export alias for \`BrainStormClient\`. |

### Namespaces & Methods
| Namespace | Methods | Description |
|---|---|---|
| \`client.auth\` | \`register\`, \`login\`, \`logout\` | User registration, credential authentication, session revocation |
| \`client.courses\` | \`list\`, \`get\`, \`create\`, \`update\`, \`remove\` | Course catalogue browsing, search, authoring, and management |
| \`client.progress\` | \`record\`, \`getMyCourseProgress\` | Student progress updates and course completion tracking |
| \`client.users\` | \`getProfile\`, \`updateProfile\` | User profile retrieval and bio/avatar updates |
| \`client.stellar\` | \`getBalance\` | Relay query for Stellar/Soroban account asset balances |

### Types & Interfaces
| Type / Interface | Description |
|---|---|
| [\`BrainStormClientOptions\`](./interfaces/types-and-dtos.md#brainstormclientoptions) | Constructor configuration options (\`baseURL\`, \`token\`) |
| [\`LoginDto\`](./interfaces/types-and-dtos.md#logindto) | Payload for user login with optional MFA TOTP token |
| [\`RegisterDto\`](./interfaces/types-and-dtos.md#registerdto) | Payload for user registration |
| [\`AuthResponse\`](./interfaces/types-and-dtos.md#authresponse) | Access and refresh token pair |
| [\`CourseDto\`](./interfaces/types-and-dtos.md#coursedto) | Full course entity model |
| [\`CreateCourseDto\`](./interfaces/types-and-dtos.md#createcoursedto) | Course creation request payload |
| [\`UpdateCourseDto\`](./interfaces/types-and-dtos.md#updatecoursedto) | Course partial update payload |
| [\`CourseListResponse\`](./interfaces/types-and-dtos.md#courselistresponse) | Paginated list response for courses |
| [\`CourseQueryParams\`](./interfaces/types-and-dtos.md#coursequeryparams) | Filter and pagination query parameters |
| [\`RecordProgressDto\`](./interfaces/types-and-dtos.md#recordprogressdto) | Course/lesson progress submission payload |
| [\`ProgressDto\`](./interfaces/types-and-dtos.md#progressdto) | Stored progress record with percentage and timestamps |
| [\`UserDto\`](./interfaces/types-and-dtos.md#userdto) | User profile data with role and Stellar public key |
| [\`UpdateUserDto\`](./interfaces/types-and-dtos.md#updateuserdto) | User profile editable fields |
| [\`StellarBalanceResponse\`](./interfaces/types-and-dtos.md#stellarbalanceresponse) | Account balances (decimal strings for 7-decimal precision) |
| [\`ApiError\`](./interfaces/types-and-dtos.md#apierror) | Standard error structure returned on non-2xx HTTP responses |
| [\`HttpAdapter\`](./interfaces/types-and-dtos.md#httpadapter) | Abstract transport interface contract |

---

## Error Handling

When an API call returns a non-2xx HTTP response, the SDK throws an \`Error\` whose properties conform to [\`ApiError\`](./interfaces/types-and-dtos.md#apierror):

\`\`\`typescript
import { ApiError } from '@brain-storm/sdk';

try {
  const course = await client.courses.get('invalid-uuid');
} catch (error) {
  const apiError = error as Error & Partial<ApiError>;
  console.error(\`HTTP \${apiError.statusCode}: \${apiError.message}\`);
  if (apiError.statusCode === 404) {
    // Handle not found
  }
}
\`\`\`
`;
}

function generateClassesMarkdown() {
  return `# Class: \`BrainStormClient\`

The primary entry point for all SDK operations. Groups API operations into resource-specific namespaces.

\`\`\`typescript
import { BrainStormClient } from '@brain-storm/sdk';

const client = new BrainStormClient({
  baseURL: 'https://api.brain-storm.com',
  token: 'initial-jwt-bearer-token', // optional
});
\`\`\`

---

## Constructor

### \`new BrainStormClient(options: BrainStormClientOptions)\`

Creates a new instance of the Brain-Storm API client.

#### Parameters
- \`options.baseURL\` (\`string\`, **required**): Base URL of the Brain-Storm REST backend without trailing slash (e.g. \`'http://localhost:3000'\` or \`'https://api.brain-storm.com'\`).
- \`options.token\` (\`string\`, optional): Initial JWT bearer token to use for authorization headers.

---

## Methods

### \`setToken(token: string): void\`

Sets or replaces the active JWT bearer token across all resource clients immediately.

\`\`\`typescript
client.setToken(accessToken);
\`\`\`

---

## Namespaces

### \`AuthClient\` (Namespace: \`client.auth\`)

Authentication and session lifecycle operations.

#### \`register(dto: RegisterDto): Promise<AuthResponse>\`
Creates a new learner or instructor account and returns an authenticated token pair.
- **Errors:** Throws 409 Conflict if email is already taken; 400 Bad Request if password does not meet requirements.

#### \`login(dto: LoginDto): Promise<AuthResponse>\`
Exchanges user credentials (and optional MFA token) for an access and refresh token pair.
- **Note:** Does not automatically call \`client.setToken()\`.

#### \`logout(refreshToken: string): Promise<void>\`
Revokes a refresh token server-side to terminate the active session.

---

### \`CoursesClient\` (Namespace: \`client.courses\`)

Course catalogue browsing, querying, and authoring.

#### \`list(params?: CourseQueryParams): Promise<CourseListResponse>\`
Queries published courses with filtering by difficulty level (\`'beginner' | 'intermediate' | 'advanced'\`), search keyword, and pagination (\`page\`, \`limit\`).

#### \`get(id: string): Promise<CourseDto>\`
Fetches a single course by its UUID. Throws 404 if not found or if the draft is unpublished and caller is not owner/admin.

#### \`create(dto: CreateCourseDto): Promise<CourseDto>\`
Creates a new draft course. Requires instructor or admin authorization.

#### \`update(id: string, dto: UpdateCourseDto): Promise<CourseDto>\`
Applies a partial update to a course. Requires course ownership or admin authorization.

#### \`remove(id: string): Promise<void>\`
Deletes a course by ID. Requires course ownership or admin authorization.

---

### \`ProgressClient\` (Namespace: \`client.progress\`)

Learner module and course progression tracking.

#### \`record(dto: RecordProgressDto): Promise<ProgressDto>\`
Upserts learner progress (0-100%) for a course or specific lesson. Reaching 100% triggers certificate issuance.

#### \`getMyCourseProgress(courseId: string): Promise<ProgressDto>\`
Retrieves progress record for the authenticated user on a specific course. Throws 404 if no progress has been recorded.

---

### \`UsersClient\` (Namespace: \`client.users\`)

User profile retrieval and management.

#### \`getProfile(id: string): Promise<UserDto>\`
Retrieves user profile information. Private fields are omitted if caller does not have permission to view them.

#### \`updateProfile(id: string, dto: UpdateUserDto): Promise<UserDto>\`
Updates editable user profile fields (bio, avatar, username).

---

### \`StellarClient\` (Namespace: \`client.stellar\`)

Stellar network queries relayed through backend.

#### \`getBalance(publicKey: string): Promise<StellarBalanceResponse>\`
Fetches native XLM and token balances for a Stellar account. Balances are returned as precise decimal strings.
`;
}

function generateTypesMarkdown() {
  return `# DTOs & Types Reference

Complete reference for all Data Transfer Objects (DTOs), payload types, and response models exported by \`@brain-storm/sdk\`.

---

## Table of Contents

- [Client Options & Config](#client-options--config)
  - [\`BrainStormClientOptions\`](#brainstormclientoptions)
  - [\`HttpAdapter\`](#httpadapter)
- [Authentication Models](#authentication-models)
  - [\`LoginDto\`](#logindto)
  - [\`RegisterDto\`](#registerdto)
  - [\`AuthResponse\`](#authresponse)
- [Course Models](#course-models)
  - [\`CourseDto\`](#coursedto)
  - [\`CreateCourseDto\`](#createcoursedto)
  - [\`UpdateCourseDto\`](#updatecoursedto)
  - [\`CourseListResponse\`](#courselistresponse)
  - [\`CourseQueryParams\`](#coursequeryparams)
- [Progress Models](#progress-models)
  - [\`RecordProgressDto\`](#recordprogressdto)
  - [\`ProgressDto\`](#progressdto)
- [User Models](#user-models)
  - [\`UserDto\`](#userdto)
  - [\`UpdateUserDto\`](#updateuserdto)
- [Stellar Models](#stellar-models)
  - [\`StellarBalanceResponse\`](#stellarbalanceresponse)
- [Error Models](#error-models)
  - [\`ApiError\`](#apierror)

---

## Client Options & Config

### \`BrainStormClientOptions\`
\`\`\`typescript
export interface BrainStormClientOptions {
  baseURL: string;
  token?: string;
}
\`\`\`

### \`HttpAdapter\`
\`\`\`typescript
export interface HttpAdapter {
  get<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  delete<T>(url: string, options?: RequestInit): Promise<T>;
}
\`\`\`

---

## Authentication Models

### \`LoginDto\`
\`\`\`typescript
export interface LoginDto {
  email: string;
  password: string;
  mfa_token?: string;
}
\`\`\`

### \`RegisterDto\`
\`\`\`typescript
export interface RegisterDto {
  email: string;
  password: string;
}
\`\`\`

### \`AuthResponse\`
\`\`\`typescript
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}
\`\`\`

---

## Course Models

### \`CourseDto\`
\`\`\`typescript
export interface CourseDto {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished: boolean;
  requiresKyc: boolean;
  createdAt: string;
}
\`\`\`

### \`CreateCourseDto\`
\`\`\`typescript
export interface CreateCourseDto {
  title: string;
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  requiresKyc?: boolean;
}
\`\`\`

### \`UpdateCourseDto\`
\`\`\`typescript
export interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished?: boolean;
}
\`\`\`

### \`CourseListResponse\`
\`\`\`typescript
export interface CourseListResponse {
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
}
\`\`\`

### \`CourseQueryParams\`
\`\`\`typescript
export interface CourseQueryParams {
  search?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  page?: number;
  limit?: number;
}
\`\`\`

---

## Progress Models

### \`RecordProgressDto\`
\`\`\`typescript
export interface RecordProgressDto {
  courseId: string;
  lessonId?: string;
  progressPct: number; // 0 - 100
}
\`\`\`

### \`ProgressDto\`
\`\`\`typescript
export interface ProgressDto {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPct: number;
  updatedAt: string;
}
\`\`\`

---

## User Models

### \`UserDto\`
\`\`\`typescript
export interface UserDto {
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
\`\`\`

### \`UpdateUserDto\`
\`\`\`typescript
export interface UpdateUserDto {
  username?: string;
  avatar?: string;
  bio?: string;
}
\`\`\`

---

## Stellar Models

### \`StellarBalanceResponse\`
\`\`\`typescript
export interface StellarBalanceResponse {
  balances: Array<{
    asset_type: string;
    balance: string; // Decimal string preserving 7 decimal places
    asset_code?: string;
  }>;
}
\`\`\`

---

## Error Models

### \`ApiError\`
\`\`\`typescript
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
\`\`\`
`;
}

function main() {
  console.log(`Generating SDK API documentation from ${SDK_SRC}...`);
  ensureDirectoryExists(DOCS_OUT_DIR);
  ensureDirectoryExists(path.join(DOCS_OUT_DIR, 'classes'));
  ensureDirectoryExists(path.join(DOCS_OUT_DIR, 'interfaces'));

  fs.writeFileSync(path.join(DOCS_OUT_DIR, 'README.md'), generateIndexMarkdown(), 'utf8');
  fs.writeFileSync(path.join(DOCS_OUT_DIR, 'classes', 'BrainStormClient.md'), generateClassesMarkdown(), 'utf8');
  fs.writeFileSync(path.join(DOCS_OUT_DIR, 'interfaces', 'types-and-dtos.md'), generateTypesMarkdown(), 'utf8');

  console.log(`SDK API reference generated in ${DOCS_OUT_DIR}`);
}

main();
