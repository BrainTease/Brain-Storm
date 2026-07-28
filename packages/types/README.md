# @brain-storm/types

Shared TypeScript types, DTOs, and interfaces for the Brain-Storm platform.

## Usage

```typescript
import type {
  UserProfile,
  CreateCourseDto,
  PaginatedResponse,
  AppErrorResponse,
} from '@brain-storm/types';
```

## Type Categories

### API Types (`api.types.ts`)
- `PaginatedResponse<T>` - Paginated API responses
- `ApiResponse<T>` - Standard API response wrapper
- `QueryOptions` - Common query parameters

### Error Types (`error.types.ts`)
- `ErrorCode` - Standardized error codes
- `AppErrorResponse` - Error response format
- `ValidationErrorDetail` - Validation error details

### User Types (`user.types.ts`)
- `UserProfile` - User profile information
- `CreateUserDto` - User creation DTO

### Course Types (`course.types.ts`)
- `CourseDto` - Course information
- `CreateCourseDto` - Course creation DTO
- `CourseModule` - Course module structure

### Enrollment Types (`enrollment.types.ts`)
- `EnrollmentDto` - Enrollment information
- `EnrollmentStatus` - Enrollment status enum

### Quiz Types (`quiz.types.ts`)
- `QuizDto` - Quiz information
- `QuizAttempt` - Quiz attempt data

### Notification Types (`notification.types.ts`)
- `NotificationDto` - Notification information
- `NotificationPreference` - User notification preferences

### Stellar Types (`stellar.types.ts`)
- `StellarAccount` - Stellar account information
- `TransactionDetails` - Transaction details

### Common Types (`common.types.ts`)
- `Pagination` - Pagination parameters
- `SortOrder` - Sort order enum

## Validation

All DTOs should include validation decorators:

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;
}
```

## Test Utilities (`test-utils` subpath)

The package ships a separate subpath export for test helpers so that factory
code is never bundled into production builds.

### Import

```typescript
import {
  UserFactory,
  CourseFactory,
  EnrollmentFactory,
  QuizFactory,
} from '@brain-storm/types/test-utils';
```

The subpath is declared in `package.json` under `exports["./test-utils"]` and
resolves directly to `src/test-utils/index.ts` (no build step needed in Jest).

### Available Factories

| Factory | Default shape | Key override fields |
|---|---|---|
| `UserFactory` | student, active | `role`, `email`, `firstName`, `lastName` |
| `CourseFactory` | published | `status`, `instructor`, `instructorId` |
| `EnrollmentFactory` | active, progress 0–100 | `status`, `progress`, `completedAt` |
| `QuizFactory` | 70 % passing score | `passingScore`, `questions` |

### Usage examples

```typescript
// Single object with defaults
const student = UserFactory.create();

// Override specific fields
const admin = UserFactory.create({ role: 'admin' });

// Batch creation
const courses = CourseFactory.createMany(5, { status: 'draft' });

// Completed enrollment
const done = EnrollmentFactory.create({ status: 'completed', progress: 100 });
```

### All factories accept an optional `overrides` argument

```typescript
static create(overrides?: Partial<TestUser>): TestUser
static createMany(count: number, overrides?: Partial<TestUser>): TestUser[]
```

The returned objects are **plain in-memory values** — no database, TypeORM, or
faker dependency. Tests that need ORM-specific fields (e.g. `passwordHash`,
`stellarPublicKey`) can spread the factory result and add those fields manually.

## Contributing

When adding new types:
1. Create a new file: `src/[feature].types.ts`
2. Export from `src/index.ts`
3. Update this README
4. Add JSDoc comments for complex types
