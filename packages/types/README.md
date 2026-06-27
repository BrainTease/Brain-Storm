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

## Contributing

When adding new types:
1. Create a new file: `src/[feature].types.ts`
2. Export from `src/index.ts`
3. Update this README
4. Add JSDoc comments for complex types
