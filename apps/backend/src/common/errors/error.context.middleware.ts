import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Error context for tracking request-scoped error information
 */
export interface ErrorContext {
  requestId: string;
  userId?: string;
  path: string;
  method: string;
  timestamp: Date;
  errorCount: number;
  metadata: Record<string, any>;
}

/**
 * AsyncLocalStorage for storing error context across async operations
 */
export const errorContextStorage = new AsyncLocalStorage<ErrorContext>();

/**
 * Error context middleware that tracks error information across the request lifecycle
 */
@Injectable()
export class ErrorContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const context: ErrorContext = {
      requestId,
      path: req.path,
      method: req.method,
      timestamp: new Date(),
      errorCount: 0,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        referer: req.get('referer'),
      },
    };

    // Extract user ID from request if available
    if (req.user && (req.user as any).id) {
      context.userId = (req.user as any).id;
    }

    // Store context in AsyncLocalStorage
    errorContextStorage.run(context, () => {
      // Add request ID to response headers
      res.setHeader('X-Request-ID', requestId);

      // Track error count
      const originalJson = res.json;
      res.json = function (body: any) {
        if (body && body.code && body.code !== 'OK') {
          context.errorCount++;
        }
        return originalJson.call(this, body);
      };

      // Log request completion with error count
      res.on('finish', () => {
        if (context.errorCount > 0) {
          this.logger.warn(
            `Request ${requestId} completed with ${context.errorCount} error(s)`,
            {
              path: context.path,
              method: context.method,
              statusCode: res.statusCode,
              userId: context.userId,
              errorCount: context.errorCount,
            }
          );
        }
      });

      next();
    });
  }
}

/**
 * Get the current error context
 */
export function getErrorContext(): ErrorContext | undefined {
  return errorContextStorage.getStore();
}

/**
 * Update error context with additional metadata
 */
export function updateErrorContext(metadata: Record<string, any>): void {
  const context = getErrorContext();
  if (context) {
    context.metadata = { ...context.metadata, ...metadata };
  }
}

/**
 * Increment error count in context
 */
export function incrementErrorCount(): void {
  const context = getErrorContext();
  if (context) {
    context.errorCount++;
  }
}

/**
 * Create error with request context
 */
export function createErrorWithContext(
  error: Error,
  additionalMetadata?: Record<string, any>
): Error {
  const context = getErrorContext();
  if (context && error instanceof Error) {
    // Add context to error object
    (error as any).context = {
      requestId: context.requestId,
      userId: context.userId,
      path: context.path,
      method: context.method,
      timestamp: context.timestamp,
      ...additionalMetadata,
    };

    // Increment error count
    incrementErrorCount();
  }

  return error;
}

/**
 * Error context interceptor for NestJS
 */
export class ErrorContextInterceptor {
  intercept(context: any, next: any) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Ensure error context is available
    const errorContext = getErrorContext();
    if (!errorContext) {
      // Create minimal context if not already set
      const minimalContext: ErrorContext = {
        requestId: request.headers['x-request-id'] || uuidv4(),
        path: request.path,
        method: request.method,
        timestamp: new Date(),
        errorCount: 0,
        metadata: {},
      };

      errorContextStorage.run(minimalContext, () => {
        return next.handle();
      });
    } else {
      return next.handle();
    }
  }
}
