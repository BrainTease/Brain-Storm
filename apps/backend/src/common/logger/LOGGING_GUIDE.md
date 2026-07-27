# Standardized Logging Guide

This guide explains how to use the standardized logging system in Brain-Storm backend.

## Overview

The logging system provides:
- **Structured logging** with consistent format across the application
- **Log levels** (ERROR, WARN, INFO, DEBUG, VERBOSE)
- **Request tracking** with unique request IDs
- **Performance monitoring** with duration tracking
- **Error tracking** with stack traces and context

## Components

### 1. LoggerFactory

Creates standardized loggers for different modules.

```typescript
import { LoggerFactory } from '@common/logger';

@Injectable()
export class MyService {
  private readonly logger = this.loggerFactory.createLogger('MyService');

  constructor(private readonly loggerFactory: LoggerFactory) {}

  async doSomething() {
    this.logger.info('Starting operation', { userId: '123' });
    // ... operation code
    this.logger.info('Operation completed', { duration: 100 });
  }
}
```

### 2. StandardizedLogger

Provides structured logging methods.

```typescript
// Log info
logger.info('User created', { userId: '123', email: 'user@example.com' });

// Log warning
logger.warn('High memory usage', { memoryUsage: '80%' });

// Log error
logger.error('Database connection failed', error, { retryCount: 3 });

// Log debug
logger.debug('Query executed', { query: 'SELECT * FROM users', duration: 50 });

// Log verbose
logger.verbose('Detailed operation info', { step: 1, data: {...} });
```

### 3. Request Logging

Automatically logs HTTP requests with middleware.

```typescript
// In app.module.ts
import { LoggingMiddleware } from '@common/logger';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
```

Logs include:
- HTTP method and path
- Status code
- Response time (duration)
- User ID (if authenticated)
- Request ID (for tracing)

### 4. Method-Level Logging

Use LoggingInterceptor for automatic method logging.

```typescript
import { LoggingInterceptor } from '@common/logger';

@Controller('users')
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  @Get(':id')
  getUser(@Param('id') id: string) {
    // Automatically logged with duration and status
    return this.usersService.findById(id);
  }
}
```

## Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Errors that need immediate attention | Database connection failed |
| WARN | Warnings about potential issues | High memory usage |
| INFO | Important business events | User created, course published |
| DEBUG | Detailed debugging information | Query executed, cache hit |
| VERBOSE | Very detailed information | Step-by-step operation flow |

## Structured Logging Examples

### API Request
```typescript
logger.logRequest(
  'GET',
  '/api/users/123',
  200,
  45,  // duration in ms
  'user-id-123',
  { query: { page: 1 } }
);
```

### Database Query
```typescript
logger.logQuery(
  'SELECT * FROM users WHERE id = $1',
  25,  // duration in ms
  { userId: '123' }
);
```

### Business Operation
```typescript
logger.logOperation('course-enrollment', 'start');
// ... operation code
logger.logOperation('course-enrollment', 'success', 150);
```

### Error Handling
```typescript
try {
  await this.usersService.create(userData);
} catch (error) {
  logger.error('Failed to create user', error, {
    email: userData.email,
    retryCount: 3
  });
}
```

## Request ID Tracking

Every request gets a unique ID for tracing:

```typescript
// Automatically set by LoggingMiddleware
const requestId = req['requestId'];

// Use in logs
logger.info('Processing request', { requestId });
```

## Best Practices

1. **Use appropriate log levels**
   - ERROR: Only for actual errors
   - WARN: For potential issues
   - INFO: For important business events
   - DEBUG: For debugging during development
   - VERBOSE: For detailed tracing

2. **Include context in metadata**
   ```typescript
   logger.info('User updated', {
     userId: user.id,
     changes: ['email', 'name'],
     timestamp: new Date()
   });
   ```

3. **Log at operation boundaries**
   ```typescript
   logger.info('Starting user import', { fileSize: 1024 });
   // ... operation
   logger.info('User import completed', { imported: 100, failed: 5 });
   ```

4. **Include error details**
   ```typescript
   logger.error('API call failed', error, {
     endpoint: 'https://api.example.com/users',
     statusCode: 500,
     retryAttempt: 2
   });
   ```

5. **Track performance**
   ```typescript
   const start = Date.now();
   await this.heavyOperation();
   const duration = Date.now() - start;
   logger.info('Heavy operation completed', { duration });
   ```

## Configuration

Set log level via environment variable:

```bash
LOG_LEVEL=debug  # debug, info, warn, error
NODE_ENV=production  # Affects log format
```

## Log Output

### Development
```
2024-01-15 10:30:45 info: [MyService] User created {"userId":"123","email":"user@example.com"}
```

### Production
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "User created",
  "context": "MyService",
  "userId": "123",
  "email": "user@example.com"
}
```

## Troubleshooting

### Logs not appearing
- Check LOG_LEVEL environment variable
- Ensure LoggingMiddleware is registered
- Verify logger is created with LoggerFactory

### Performance impact
- Use DEBUG level only in development
- Avoid logging large objects
- Use sampling for high-frequency operations

### Missing request IDs
- Ensure LoggingMiddleware is applied to all routes
- Check that x-request-id header is being passed
