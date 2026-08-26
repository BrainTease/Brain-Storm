/**
 * Brain-Storm API TypeScript SDK.
 *
 * A dependency-free, fully-typed client for the Brain-Storm REST API. The type
 * definitions mirror the backend's OpenAPI spec; the client itself is
 * hand-maintained in this file (see `docs/api/sdk-reference.md` for how the two
 * stay in step).
 *
 * Every export in this module is public API and governed by the versioning
 * policy in `docs/api/sdk-versioning.md`. Anything not exported from here —
 * including the per-resource client classes reachable via `BrainStormClient` —
 * is internal and may change in any release.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```typescript
 * import { BrainStormClient } from '@brain-storm/sdk';
 *
 * const client = new BrainStormClient({ baseURL: 'https://api.brain-storm.com' });
 * const { access_token } = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'secret',
 * });
 * client.setToken(access_token);
 * const courses = await client.courses.list({ level: 'beginner' });
 * ```
 */

// ─── Request / Response types ────────────────────────────────────────────────

/**
 * Credentials for {@link BrainStormClient.auth}`.login`.
 *
 * @remarks
 * `mfa_token` is required only for accounts with multi-factor authentication
 * enabled; omitting it for such an account fails with `401`.
 */
export interface LoginDto {
  /** Registered email address. */
  email: string;
  /** Plaintext password, sent over TLS. */
  password: string;
  /** Current TOTP code, for MFA-enabled accounts. */
  mfa_token?: string;
}

/** Payload for creating a new account via {@link BrainStormClient.auth}`.register`. */
export interface RegisterDto {
  /** Email address; must be unique across the platform. */
  email: string;
  /** Plaintext password. Complexity rules are enforced server-side. */
  password: string;
}

/**
 * Token pair returned by `register` and `login`.
 *
 * @remarks
 * Pass `access_token` to {@link BrainStormClient.setToken} to authenticate
 * subsequent calls. Store `refresh_token` securely — it is the argument to
 * `auth.logout`.
 */
export interface AuthResponse {
  /** Short-lived JWT bearer token. */
  access_token: string;
  /** Long-lived token used to obtain a new access token, and to log out. */
  refresh_token: string;
}

/** A course as returned by the API. */
export interface CourseDto {
  /** UUID. */
  id: string;
  title: string;
  description: string;
  /** Difficulty tier. Adding a new tier is a breaking change for consumers that switch exhaustively. */
  level: 'beginner' | 'intermediate' | 'advanced';
  /** Estimated effort in hours; absent when the author has not set it. */
  durationHours?: number;
  /** `false` for drafts, which are visible only to their author and admins. */
  isPublished: boolean;
  /** When `true`, enrolment requires a completed KYC check. */
  requiresKyc: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Payload for {@link BrainStormClient.courses}`.create`. Requires an instructor or admin role. */
export interface CreateCourseDto {
  title: string;
  description: string;
  /** Defaults to `'beginner'` server-side when omitted. */
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  /** Defaults to `false` server-side when omitted. */
  requiresKyc?: boolean;
}

/**
 * Payload for {@link BrainStormClient.courses}`.update`.
 *
 * @remarks
 * A partial update — omitted fields are left unchanged. Note that unlike
 * {@link CreateCourseDto} this cannot change `requiresKyc`.
 */
export interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  /** Set to `true` to publish a draft, `false` to unpublish. */
  isPublished?: boolean;
}

/** One page of courses, plus the paging cursor state. */
export interface CourseListResponse {
  /** The courses on this page. */
  data: CourseDto[];
  /** Total matching courses across all pages, for computing page counts. */
  total: number;
  /** 1-based index of the page returned. */
  page: number;
  /** Page size that was applied. */
  limit: number;
}

/** Filters for {@link BrainStormClient.courses}`.list`. All fields are optional. */
export interface CourseQueryParams {
  /** Free-text search across title and description. */
  search?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  /** 1-based page index. Defaults to `1`. */
  page?: number;
  /** Page size. Defaults to and is capped by a server-side maximum. */
  limit?: number;
}

/** Payload for {@link BrainStormClient.progress}`.record`. */
export interface RecordProgressDto {
  /** UUID of the course being progressed. */
  courseId: string;
  /** UUID of the specific lesson, when recording lesson-level progress. */
  lessonId?: string;
  /** Completion percentage, `0`–`100`. */
  progressPct: number;
}

/** A stored progress record for one user against one course or lesson. */
export interface ProgressDto {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  /** Completion percentage, `0`–`100`. `100` means the course is complete. */
  progressPct: number;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * A user profile.
 *
 * @remarks
 * Which fields are populated depends on the caller's relationship to the user —
 * requesting another user's profile may omit fields the API treats as private.
 */
export interface UserDto {
  id: string;
  email: string;
  username?: string;
  /** Absolute URL of the avatar image. */
  avatar?: string;
  bio?: string;
  /**
   * Role name, e.g. `'student'`, `'instructor'`, `'admin'`.
   *
   * @remarks
   * Deliberately a `string` rather than a union, so that adding a role
   * server-side does not break compilation downstream.
   */
  role: string;
  /** Stellar account address (`G…`), present once a wallet has been linked. */
  stellarPublicKey?: string;
  /** Whether the email address has been confirmed. */
  isVerified: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Payload for {@link BrainStormClient.users}`.updateProfile`. A partial update. */
export interface UpdateUserDto {
  username?: string;
  /** Absolute URL of the avatar image. */
  avatar?: string;
  bio?: string;
}

/**
 * Balances held by a Stellar account, as relayed by the backend from Horizon.
 *
 * @remarks
 * Balances are decimal **strings**, not numbers, to preserve Stellar's 7-digit
 * precision. Do not parse them with `Number` before doing arithmetic.
 */
export interface StellarBalanceResponse {
  balances: Array<{
    /** Horizon asset type, e.g. `'native'` or `'credit_alphanum4'`. */
    asset_type: string;
    /** Decimal string, e.g. `'100.0000000'`. */
    balance: string;
    /** Asset code such as `'BST'`; absent for the native XLM balance. */
    asset_code?: string;
  }>;
}

/**
 * Error body returned by the API on a non-2xx response.
 *
 * @remarks
 * The SDK does not return this — it throws an `Error` whose `message` is
 * `ApiError.message`, with the `ApiError` fields assigned onto the error object.
 * Narrow with a type guard:
 *
 * ```typescript
 * try {
 *   await client.courses.get(id);
 * } catch (e) {
 *   const err = e as Error & Partial<ApiError>;
 *   if (err.statusCode === 404) { … }
 * }
 * ```
 */
export interface ApiError {
  /** HTTP status code. */
  statusCode: number;
  /** Human-readable message. */
  message: string;
  /** Short error identifier, e.g. `'Not Found'`. */
  error?: string;
}

// ─── Network configuration ─────────────────────────────────────────────────────

/** Supported Stellar network identifiers. */
export type StellarNetwork = 'testnet' | 'mainnet';

/** Network passphrase and endpoint URLs for a single Stellar network. */
export interface StellarNetworkConfig {
  /** Network identifier. */
  network: StellarNetwork;
  /** Passphrase used to sign and verify transactions on this network. */
  passphrase: string;
  /** Horizon (classic API) base URL. */
  horizonUrl: string;
  /** Soroban RPC base URL, for smart-contract invocation. */
  sorobanRpcUrl: string;
}

/**
 * Single source of truth for Stellar network configuration, keyed by network.
 *
 * @remarks
 * Consumers (the SDK, `apps/frontend`, etc.) should read from this map rather
 * than hardcoding passphrases or endpoint URLs, so testnet and mainnet values
 * stay in sync everywhere they're used.
 */
export const STELLAR_NETWORK_CONFIGS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: 'testnet',
    passphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    network: 'mainnet',
    passphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://mainnet.sorobanrpc.com',
  },
};

/**
 * Looks up the {@link StellarNetworkConfig} for `network`.
 *
 * @param network - Network identifier, case-insensitive. Falls back to
 * `'testnet'` when omitted or unrecognized.
 */
export function getStellarNetworkConfig(network: string | null | undefined): StellarNetworkConfig {
  const key = (network ?? 'testnet').toLowerCase();
  return STELLAR_NETWORK_CONFIGS[key as StellarNetwork] ?? STELLAR_NETWORK_CONFIGS.testnet;
}

// ─── HTTP adapter ─────────────────────────────────────────────────────────────

/**
 * The HTTP surface the resource clients depend on.
 *
 * @remarks
 * Exported so consumers can describe a transport in their own code — for
 * retries, logging, or a test double. Note that {@link BrainStormClient} does
 * **not** currently accept one: it always constructs its own `fetch`-based
 * adapter. Accepting an injected adapter is a planned additive change.
 *
 * All four methods must reject on a non-2xx response.
 */
export interface HttpAdapter {
  /** Issues a `GET` and resolves with the parsed JSON body. */
  get<T>(url: string, options?: RequestInit): Promise<T>;
  /** Issues a `POST` with a JSON-serialised `body`. */
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  /** Issues a `PATCH` with a JSON-serialised `body`. */
  patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  /** Issues a `DELETE` and resolves with the parsed JSON body, if any. */
  delete<T>(url: string, options?: RequestInit): Promise<T>;
}

// ─── Default fetch-based HTTP client ──────────────────────────────────────────

/**
 * `fetch`-based {@link HttpAdapter} used by {@link BrainStormClient}.
 *
 * @internal Not exported. Requires a global `fetch` (Node 18+, or a polyfill).
 */
class FetchHttpAdapter implements HttpAdapter {
  constructor(
    private readonly baseURL: string,
    private token?: string,
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText,
      }));
      throw Object.assign(new Error(err.message), err);
    }
    return res.json() as Promise<T>;
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseURL}${url}`, {
      ...options,
      method: 'GET',
      headers: { ...this.headers(), ...(options?.headers as Record<string, string>) },
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(url: string, body: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseURL}${url}`, {
      ...options,
      method: 'POST',
      headers: { ...this.headers(), ...(options?.headers as Record<string, string>) },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseURL}${url}`, {
      ...options,
      method: 'PATCH',
      headers: { ...this.headers(), ...(options?.headers as Record<string, string>) },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseURL}${url}`, {
      ...options,
      method: 'DELETE',
      headers: { ...this.headers(), ...(options?.headers as Record<string, string>) },
    });
    return this.handleResponse<T>(res);
  }
}

// ─── Resource clients ─────────────────────────────────────────────────────────

/**
 * Authentication endpoints. Reached via {@link BrainStormClient.auth}.
 *
 * @remarks
 * This class is intentionally not exported; treat `client.auth` as its only
 * entry point. Its *methods* are public API.
 */
class AuthClient {
  constructor(private http: FetchHttpAdapter) {}

  /**
   * Creates an account and returns a token pair — no separate login needed.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `statusCode` is `409`
   * if the email is already registered, `400` if the password is too weak.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/v1/auth/register', dto);
  }

  /**
   * Exchanges credentials for a token pair.
   *
   * @remarks
   * Does **not** set the token on the client — call
   * {@link BrainStormClient.setToken} with the returned `access_token`.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `statusCode` is `401`
   * for bad credentials or a missing/incorrect `mfa_token`.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/v1/auth/login', dto);
  }

  /**
   * Revokes a refresh token server-side.
   *
   * @param refreshToken - The `refresh_token` from {@link AuthResponse}.
   *
   * @remarks
   * Does not clear the access token held by the client; the already-issued
   * access token stays valid until it expires.
   */
  async logout(refreshToken: string): Promise<void> {
    return this.http.post<void>('/v1/auth/logout', { refresh_token: refreshToken });
  }
}

/**
 * Course catalogue and authoring endpoints. Reached via {@link BrainStormClient.courses}.
 *
 * @remarks Not exported; `client.courses` is the entry point.
 */
class CoursesClient {
  constructor(private http: FetchHttpAdapter) {}

  /**
   * Lists published courses, filtered and paginated.
   *
   * @param params - Filters; see {@link CourseQueryParams}. Omit for defaults.
   *
   * @remarks
   * Parameters are serialised with `URLSearchParams`, so numeric values are
   * stringified and `undefined` fields are dropped.
   */
  async list(params?: CourseQueryParams): Promise<CourseListResponse> {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== undefined),
          ) as Record<string, string>,
        ).toString()
      : '';
    return this.http.get<CourseListResponse>(`/v1/courses${qs}`);
  }

  /**
   * Fetches a single course by id.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `statusCode` is `404`
   * when the course does not exist or is an unpublished draft the caller
   * cannot see.
   */
  async get(id: string): Promise<CourseDto> {
    return this.http.get<CourseDto>(`/v1/courses/${id}`);
  }

  /**
   * Creates a course, initially unpublished.
   *
   * @remarks Requires an authenticated instructor or admin.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `403` if the caller
   * lacks the role.
   */
  async create(dto: CreateCourseDto): Promise<CourseDto> {
    return this.http.post<CourseDto>('/v1/courses', dto);
  }

  /**
   * Applies a partial update and returns the full updated course.
   *
   * @remarks Requires ownership of the course, or an admin.
   */
  async update(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    return this.http.patch<CourseDto>(`/v1/courses/${id}`, dto);
  }

  /**
   * Deletes a course.
   *
   * @remarks
   * Named `remove` rather than `delete` because `delete` is a reserved word.
   * Requires ownership of the course, or an admin.
   */
  async remove(id: string): Promise<void> {
    return this.http.delete<void>(`/v1/courses/${id}`);
  }
}

/**
 * Learner progress endpoints. Reached via {@link BrainStormClient.progress}.
 *
 * @remarks Not exported; `client.progress` is the entry point.
 */
class ProgressClient {
  constructor(private http: FetchHttpAdapter) {}

  /**
   * Records progress for the authenticated user.
   *
   * @remarks
   * An upsert — calling it repeatedly for the same course/lesson updates the
   * existing record rather than creating duplicates. Reaching `progressPct: 100`
   * is what triggers credential issuance server-side.
   */
  async record(dto: RecordProgressDto): Promise<ProgressDto> {
    return this.http.post<ProgressDto>('/v1/progress', dto);
  }

  /**
   * Fetches the authenticated user's progress for one course.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `404` when the user has
   * no progress record for the course yet.
   */
  async getMyCourseProgress(courseId: string): Promise<ProgressDto> {
    return this.http.get<ProgressDto>(`/v1/progress/my/${courseId}`);
  }
}

/**
 * User profile endpoints. Reached via {@link BrainStormClient.users}.
 *
 * @remarks Not exported; `client.users` is the entry point.
 */
class UsersClient {
  constructor(private http: FetchHttpAdapter) {}

  /**
   * Fetches a user profile by id.
   *
   * @remarks
   * Private fields are omitted when reading a profile other than your own.
   */
  async getProfile(id: string): Promise<UserDto> {
    return this.http.get<UserDto>(`/v1/users/${id}`);
  }

  /**
   * Applies a partial profile update.
   *
   * @remarks
   * Only the authenticated user's own profile may be updated, unless the caller
   * is an admin.
   */
  async updateProfile(id: string, dto: UpdateUserDto): Promise<UserDto> {
    return this.http.patch<UserDto>(`/v1/users/${id}`, dto);
  }
}

/**
 * Stellar read endpoints. Reached via {@link BrainStormClient.stellar}.
 *
 * @remarks
 * Read-only. This SDK does **not** build, sign or submit Stellar or Soroban
 * transactions — it relays queries through the backend, which talks to Horizon.
 * Signing happens in the client apps via a wallet adapter (Freighter on web).
 */
class StellarClient {
  constructor(private http: FetchHttpAdapter) {}

  /**
   * Fetches the balances held by a Stellar account.
   *
   * @param publicKey - Stellar account address (`G…`).
   *
   * @remarks
   * Balances are decimal strings — see {@link StellarBalanceResponse}.
   *
   * @throws An `Error` carrying {@link ApiError} fields; `404` if Horizon does
   * not know the account (i.e. it has never been funded).
   */
  async getBalance(publicKey: string): Promise<StellarBalanceResponse> {
    return this.http.get<StellarBalanceResponse>(`/v1/stellar/balance/${publicKey}`);
  }
}

// ─── Main SDK client ──────────────────────────────────────────────────────────

/** Constructor options for {@link BrainStormClient}. */
export interface BrainStormClientOptions {
  /**
   * Base URL of the Brain-Storm API, e.g. `'https://api.brain-storm.com'`.
   *
   * @remarks
   * Must **not** include the `/v1` prefix or a trailing slash — the SDK appends
   * versioned paths such as `/v1/courses` itself.
   */
  baseURL: string;
  /**
   * JWT bearer token to start with.
   *
   * @remarks
   * Use this when restoring a persisted session. For a fresh login, call
   * {@link BrainStormClient.setToken} with the token from `auth.login`.
   */
  token?: string;
}

/**
 * Brain-Storm API client — the SDK's single entry point.
 *
 * @remarks
 * Groups the API by resource. Each namespace shares one HTTP adapter, so
 * {@link BrainStormClient.setToken} authenticates all of them at once.
 *
 * Requires a global `fetch`: any browser, Node 18+, or React Native.
 *
 * @example
 * ```typescript
 * const client = new BrainStormClient({ baseURL: 'http://localhost:3000' });
 * const { access_token } = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'pass',
 * });
 * client.setToken(access_token);
 * const courses = await client.courses.list({ level: 'beginner' });
 * ```
 */
export class BrainStormClient {
  /** Registration, login and logout. */
  readonly auth: AuthClient;
  /** Course catalogue reads plus authoring writes. */
  readonly courses: CoursesClient;
  /** Recording and reading learner progress. */
  readonly progress: ProgressClient;
  /** User profile reads and updates. */
  readonly users: UsersClient;
  /** Read-only Stellar queries. */
  readonly stellar: StellarClient;

  private readonly httpAdapter: FetchHttpAdapter;

  /**
   * @param options - See {@link BrainStormClientOptions}. `baseURL` is required.
   */
  constructor(options: BrainStormClientOptions) {
    this.httpAdapter = new FetchHttpAdapter(options.baseURL, options.token);
    this.auth = new AuthClient(this.httpAdapter);
    this.courses = new CoursesClient(this.httpAdapter);
    this.progress = new ProgressClient(this.httpAdapter);
    this.users = new UsersClient(this.httpAdapter);
    this.stellar = new StellarClient(this.httpAdapter);
  }

  /**
   * Sets or replaces the JWT bearer token used for authenticated requests.
   *
   * @remarks
   * Takes effect immediately for every namespace, including in-flight retries.
   * There is currently no way to *clear* the token — construct a new client to
   * drop credentials entirely.
   */
  setToken(token: string): void {
    this.httpAdapter.setToken(token);
  }
}

/** Convenience default export, identical to the named {@link BrainStormClient}. */
export default BrainStormClient;
