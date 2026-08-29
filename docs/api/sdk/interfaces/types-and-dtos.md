# DTOs & Types Reference

Complete reference for all Data Transfer Objects (DTOs), payload types, and response models exported by `@brain-storm/sdk`.

---

## Table of Contents

- [Client Options & Config](#client-options--config)
  - [`BrainStormClientOptions`](#brainstormclientoptions)
  - [`HttpAdapter`](#httpadapter)
- [Authentication Models](#authentication-models)
  - [`LoginDto`](#logindto)
  - [`RegisterDto`](#registerdto)
  - [`AuthResponse`](#authresponse)
- [Course Models](#course-models)
  - [`CourseDto`](#coursedto)
  - [`CreateCourseDto`](#createcoursedto)
  - [`UpdateCourseDto`](#updatecoursedto)
  - [`CourseListResponse`](#courselistresponse)
  - [`CourseQueryParams`](#coursequeryparams)
- [Progress Models](#progress-models)
  - [`RecordProgressDto`](#recordprogressdto)
  - [`ProgressDto`](#progressdto)
- [User Models](#user-models)
  - [`UserDto`](#userdto)
  - [`UpdateUserDto`](#updateuserdto)
- [Stellar Models](#stellar-models)
  - [`StellarBalanceResponse`](#stellarbalanceresponse)
- [Error Models](#error-models)
  - [`ApiError`](#apierror)

---

## Client Options & Config

### `BrainStormClientOptions`

```typescript
export interface BrainStormClientOptions {
  baseURL: string;
  token?: string;
}
```

### `HttpAdapter`

```typescript
export interface HttpAdapter {
  get<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  patch<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  delete<T>(url: string, options?: RequestInit): Promise<T>;
}
```

---

## Authentication Models

### `LoginDto`

```typescript
export interface LoginDto {
  email: string;
  password: string;
  mfa_token?: string;
}
```

### `RegisterDto`

```typescript
export interface RegisterDto {
  email: string;
  password: string;
}
```

### `AuthResponse`

```typescript
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}
```

---

## Course Models

### `CourseDto`

```typescript
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
```

### `CreateCourseDto`

```typescript
export interface CreateCourseDto {
  title: string;
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  requiresKyc?: boolean;
}
```

### `UpdateCourseDto`

```typescript
export interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished?: boolean;
}
```

### `CourseListResponse`

```typescript
export interface CourseListResponse {
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
}
```

### `CourseQueryParams`

```typescript
export interface CourseQueryParams {
  search?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  page?: number;
  limit?: number;
}
```

---

## Progress Models

### `RecordProgressDto`

```typescript
export interface RecordProgressDto {
  courseId: string;
  lessonId?: string;
  progressPct: number; // 0 - 100
}
```

### `ProgressDto`

```typescript
export interface ProgressDto {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPct: number;
  updatedAt: string;
}
```

---

## User Models

### `UserDto`

```typescript
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
```

### `UpdateUserDto`

```typescript
export interface UpdateUserDto {
  username?: string;
  avatar?: string;
  bio?: string;
}
```

---

## Stellar Models

### `StellarBalanceResponse`

```typescript
export interface StellarBalanceResponse {
  balances: Array<{
    asset_type: string;
    balance: string; // Decimal string preserving 7 decimal places
    asset_code?: string;
  }>;
}
```

---

## Error Models

### `ApiError`

```typescript
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
```
