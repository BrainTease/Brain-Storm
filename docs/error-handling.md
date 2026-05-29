# Error Handling Guide

## Overview

Brain-Storm implements a standardized error handling system across the backend to ensure consistent error responses and logging.

## Error Hierarchy

All errors inherit from `AppError` and include:
- **code**: Machine-readable error code
- **statusCode**: HTTP status code
- **message**: Human-readable error message
- **context**: Additional error context

## Error Types

### ValidationError (400)
Validation failures on input data.
```typescript
throw new ValidationError('Invalid email format', { field: 'email' });
```

### NotFoundError (404)
Resource not found.
```typescript
throw new NotFoundError('Course not found', { courseId: 123 });
```

### UnauthorizedError (401)
Authentication required or failed.
```typescript
throw new UnauthorizedError('Invalid credentials');
```

### ForbiddenError (403)
Authenticated but not authorized.
```typescript
throw new ForbiddenError('Insufficient permissions', { requiredRole: 'admin' });
```

### ConflictError (409)
Resource conflict (e.g., duplicate).
```typescript
throw new ConflictError('Email already registered', { email });
```

### ExternalServiceError (502)
External service failure.
```typescript
throw new ExternalServiceError('Stellar network unavailable');
```

### RateLimitError (429)
Rate limit exceeded.
```typescript
throw new RateLimitError('Too many requests', { retryAfter: 60 });
```

## Using ErrorFactory

For consistency, use `ErrorFactory`:

```typescript
import { ErrorFactory } from '@/common/errors';

throw ErrorFactory.notFound('User not found', { userId });
throw ErrorFactory.validation('Invalid input', { field: 'name' });
```

## Error Recovery

Implement retry logic for transient errors:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ExternalServiceError && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

## Logging

Errors are automatically logged with context. Access logs via:
```bash
docker compose logs -f backend | grep ERROR
```
