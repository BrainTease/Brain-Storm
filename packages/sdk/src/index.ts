/**
 * Brain-Storm API TypeScript SDK
 *
 * Generated from the OpenAPI spec. Provides a fully-typed client for all
 * Brain-Storm API endpoints.
 *
 * Usage:
 *   import { BrainStormClient } from '@brain-storm/sdk';
 *
 *   const client = new BrainStormClient({ baseURL: 'https://api.brain-storm.com' });
 *   await client.auth.login({ email: 'user@example.com', password: 'secret' });
 *   const courses = await client.courses.list();
 */

// ─── Request / Response types ────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
  mfa_token?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

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

export interface CreateCourseDto {
  title: string;
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  requiresKyc?: boolean;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished?: boolean;
}

export interface CourseListResponse {
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CourseQueryParams {
  search?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  page?: number;
  limit?: number;
}

export interface RecordProgressDto {
  courseId: string;
  lessonId?: string;
  progressPct: number;
}

export interface ProgressDto {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPct: number;
  updatedAt: string;
}

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

export interface UpdateUserDto {
  username?: string;
  avatar?: string;
  bio?: string;
}

export interface StellarBalanceResponse {
  balances: Array<{ asset_type: string; balance: string; asset_code?: string }>;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ─── HTTP adapter ─────────────────────────────────────────────────────────────

export interface HttpAdapter {
  get<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  delete<T>(url: string, options?: RequestInit): Promise<T>;
}

// ─── Default fetch-based HTTP client ──────────────────────────────────────────

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

class AuthClient {
  constructor(private http: FetchHttpAdapter) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/v1/auth/register', dto);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/v1/auth/login', dto);
  }

  async logout(refreshToken: string): Promise<void> {
    return this.http.post<void>('/v1/auth/logout', { refresh_token: refreshToken });
  }
}

class CoursesClient {
  constructor(private http: FetchHttpAdapter) {}

  async list(params?: CourseQueryParams): Promise<CourseListResponse> {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.http.get<CourseListResponse>(`/v1/courses${qs}`);
  }

  async get(id: string): Promise<CourseDto> {
    return this.http.get<CourseDto>(`/v1/courses/${id}`);
  }

  async create(dto: CreateCourseDto): Promise<CourseDto> {
    return this.http.post<CourseDto>('/v1/courses', dto);
  }

  async update(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    return this.http.patch<CourseDto>(`/v1/courses/${id}`, dto);
  }

  async remove(id: string): Promise<void> {
    return this.http.delete<void>(`/v1/courses/${id}`);
  }
}

class ProgressClient {
  constructor(private http: FetchHttpAdapter) {}

  async record(dto: RecordProgressDto): Promise<ProgressDto> {
    return this.http.post<ProgressDto>('/v1/progress', dto);
  }

  async getMyCourseProgress(courseId: string): Promise<ProgressDto> {
    return this.http.get<ProgressDto>(`/v1/progress/my/${courseId}`);
  }
}

class UsersClient {
  constructor(private http: FetchHttpAdapter) {}

  async getProfile(id: string): Promise<UserDto> {
    return this.http.get<UserDto>(`/v1/users/${id}`);
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<UserDto> {
    return this.http.patch<UserDto>(`/v1/users/${id}`, dto);
  }
}

class StellarClient {
  constructor(private http: FetchHttpAdapter) {}

  async getBalance(publicKey: string): Promise<StellarBalanceResponse> {
    return this.http.get<StellarBalanceResponse>(`/v1/stellar/balance/${publicKey}`);
  }
}

// ─── Main SDK client ──────────────────────────────────────────────────────────

export interface BrainStormClientOptions {
  /** Base URL of the Brain-Storm API, e.g. 'https://api.brain-storm.com' */
  baseURL: string;
  /** Optional initial JWT token */
  token?: string;
}

/**
 * Brain-Storm API client.
 *
 * @example
 * const client = new BrainStormClient({ baseURL: 'http://localhost:3000' });
 * const { access_token } = await client.auth.login({ email: 'user@example.com', password: 'pass' });
 * client.setToken(access_token);
 * const courses = await client.courses.list({ level: 'beginner' });
 */
export class BrainStormClient {
  readonly auth: AuthClient;
  readonly courses: CoursesClient;
  readonly progress: ProgressClient;
  readonly users: UsersClient;
  readonly stellar: StellarClient;

  private readonly httpAdapter: FetchHttpAdapter;

  constructor(options: BrainStormClientOptions) {
    this.httpAdapter = new FetchHttpAdapter(options.baseURL, options.token);
    this.auth = new AuthClient(this.httpAdapter);
    this.courses = new CoursesClient(this.httpAdapter);
    this.progress = new ProgressClient(this.httpAdapter);
    this.users = new UsersClient(this.httpAdapter);
    this.stellar = new StellarClient(this.httpAdapter);
  }

  /** Set or refresh the JWT bearer token used for authenticated requests. */
  setToken(token: string): void {
    this.httpAdapter.setToken(token);
  }
}

export default BrainStormClient;
