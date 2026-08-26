# Class: `BrainStormClient`

The primary entry point for all SDK operations. Groups API operations into resource-specific namespaces.

```typescript
import { BrainStormClient } from '@brain-storm/sdk';

const client = new BrainStormClient({
  baseURL: 'https://api.brain-storm.com',
  token: 'initial-jwt-bearer-token', // optional
});
```

---

## Constructor

### `new BrainStormClient(options: BrainStormClientOptions)`

Creates a new instance of the Brain-Storm API client.

#### Parameters
- `options.baseURL` (`string`, **required**): Base URL of the Brain-Storm REST backend without trailing slash (e.g. `'http://localhost:3000'` or `'https://api.brain-storm.com'`).
- `options.token` (`string`, optional): Initial JWT bearer token to use for authorization headers.

---

## Methods

### `setToken(token: string): void`

Sets or replaces the active JWT bearer token across all resource clients immediately.

```typescript
client.setToken(accessToken);
```

---

## Namespaces

### `AuthClient` (Namespace: `client.auth`)

Authentication and session lifecycle operations.

#### `register(dto: RegisterDto): Promise<AuthResponse>`
Creates a new learner or instructor account and returns an authenticated token pair.
- **Errors:** Throws 409 Conflict if email is already taken; 400 Bad Request if password does not meet requirements.

#### `login(dto: LoginDto): Promise<AuthResponse>`
Exchanges user credentials (and optional MFA token) for an access and refresh token pair.
- **Note:** Does not automatically call `client.setToken()`.

#### `logout(refreshToken: string): Promise<void>`
Revokes a refresh token server-side to terminate the active session.

---

### `CoursesClient` (Namespace: `client.courses`)

Course catalogue browsing, querying, and authoring.

#### `list(params?: CourseQueryParams): Promise<CourseListResponse>`
Queries published courses with filtering by difficulty level (`'beginner' | 'intermediate' | 'advanced'`), search keyword, and pagination (`page`, `limit`).

#### `get(id: string): Promise<CourseDto>`
Fetches a single course by its UUID. Throws 404 if not found or if the draft is unpublished and caller is not owner/admin.

#### `create(dto: CreateCourseDto): Promise<CourseDto>`
Creates a new draft course. Requires instructor or admin authorization.

#### `update(id: string, dto: UpdateCourseDto): Promise<CourseDto>`
Applies a partial update to a course. Requires course ownership or admin authorization.

#### `remove(id: string): Promise<void>`
Deletes a course by ID. Requires course ownership or admin authorization.

---

### `ProgressClient` (Namespace: `client.progress`)

Learner module and course progression tracking.

#### `record(dto: RecordProgressDto): Promise<ProgressDto>`
Upserts learner progress (0-100%) for a course or specific lesson. Reaching 100% triggers certificate issuance.

#### `getMyCourseProgress(courseId: string): Promise<ProgressDto>`
Retrieves progress record for the authenticated user on a specific course. Throws 404 if no progress has been recorded.

---

### `UsersClient` (Namespace: `client.users`)

User profile retrieval and management.

#### `getProfile(id: string): Promise<UserDto>`
Retrieves user profile information. Private fields are omitted if caller does not have permission to view them.

#### `updateProfile(id: string, dto: UpdateUserDto): Promise<UserDto>`
Updates editable user profile fields (bio, avatar, username).

---

### `StellarClient` (Namespace: `client.stellar`)

Stellar network queries relayed through backend.

#### `getBalance(publicKey: string): Promise<StellarBalanceResponse>`
Fetches native XLM and token balances for a Stellar account. Balances are returned as precise decimal strings.
