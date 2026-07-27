# Error Handling Standardization

## Overview
Consistent error handling across the Brain-Storm backend using error hierarchy and factory pattern.

## Error Hierarchy

### AppError (Base)
```typescript
new AppError(code, message, statusCode, details)
```

### Specific Errors
- `ValidationError` (400) - Input validation failures
- `AuthenticationError` (401) - Auth failures
- `AuthorizationError` (403) - Permission denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `StellarError` (500) - Blockchain operations
- `DatabaseError` (500) - Database operations

## Usage

### Throwing Errors
```typescript
import { ErrorFactory } from '@/common/errors/error.factory';

// Validation
throw ErrorFactory.validation('Invalid email', { field: 'email' });

// Not found
throw ErrorFactory.notFound('User');

// Stellar operation
throw ErrorFactory.stellar('Transaction failed', { txHash: '...' });
```

### Global Exception Filter
Automatically catches all errors and returns standardized JSON:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid email",
  "details": { "field": "email" },
  "timestamp": "2026-05-29T11:51:05.034Z"
}
```

## Best Practices
- Always use ErrorFactory for consistency
- Include relevant details for debugging
- Log errors appropriately
- Return meaningful messages to clients
- Use specific error types, not generic AppError
