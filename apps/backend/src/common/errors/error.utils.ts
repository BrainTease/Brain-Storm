import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  StellarError,
  DatabaseError,
  RateLimitError,
  BadRequestError,
  ForbiddenError,
  MethodNotAllowedError,
  UnsupportedMediaTypeError,
  UnprocessableEntityError,
  TooManyRequestsError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  NetworkError,
  TimeoutError,
  InsufficientFundsError,
  ResourceLockedError,
  MaintenanceError,
  ErrorCode,
} from './app.error';

/**
 * Error utilities for common error handling patterns
 */
export class ErrorUtils {
  /**
   * Create a validation error with field-specific details
   */
  static validationError(
    message: string,
    fieldErrors?: Record<string, string[]>
  ): ValidationError {
    const details = fieldErrors ? { fieldErrors } : undefined;
    return new ValidationError(message, details);
  }

  /**
   * Create a not found error for a specific resource
   */
  static notFound(resource: string, id?: string | number): NotFoundError {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    return new NotFoundError(message);
  }

  /**
   * Create a conflict error for duplicate resources
   */
  static duplicate(resource: string, field: string, value: string): ConflictError {
    return new ConflictError(`${resource} with ${field} '${value}' already exists`);
  }

  /**
   * Create an authentication error with optional challenge
   */
  static authenticationFailed(reason?: string, challenge?: string): AuthenticationError {
    const message = reason ? `Authentication failed: ${reason}` : 'Authentication failed';
    const details = challenge ? { challenge } : undefined;
    return new AuthenticationError(message);
  }

  /**
   * Create an authorization error with required permissions
   */
  static insufficientPermissions(
    requiredPermissions?: string[],
    userPermissions?: string[]
  ): AuthorizationError {
    const message = 'Insufficient permissions';
    const details = {
      requiredPermissions,
      userPermissions,
    };
    return new AuthorizationError(message);
  }

  /**
   * Create a bad request error with validation details
   */
  static badRequest(message: string, fieldErrors?: Record<string, string[]>): BadRequestError {
    const details = fieldErrors ? { fieldErrors } : undefined;
    return new BadRequestError(message, details);
  }

  /**
   * Create an unprocessable entity error with detailed constraints
   */
  static unprocessableEntity(
    message: string,
    constraints?: Record<string, any>
  ): UnprocessableEntityError {
    return new UnprocessableEntityError(message, constraints);
  }

  /**
   * Check if an error is a specific AppError type
   */
  static isAppError(error: any, errorCode?: ErrorCode): error is AppError {
    if (!(error instanceof AppError)) {
      return false;
    }
    if (errorCode && error.code !== errorCode) {
      return false;
    }
    return true;
  }

  /**
   * Extract error details for logging and monitoring
   */
  static extractErrorDetails(error: any): {
    code: string;
    message: string;
    stack?: string;
    details?: Record<string, any>;
    statusCode?: number;
  } {
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        stack: error.stack,
        details: error.details,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    };
  }

  /**
   * Create error response object for API responses
   */
  static createErrorResponse(
    error: AppError,
    requestId?: string,
    includeStack?: boolean
  ): Record<string, any> {
    const response: Record<string, any> = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    };

    if (error.details) {
      response.details = error.details;
    }

    if (requestId) {
      response.requestId = requestId;
    }

    if (includeStack && process.env.NODE_ENV !== 'production' && error.stack) {
      response.stack = error.stack.split('\n');
    }

    return response;
  }

  /**
   * Wrap async operations with consistent error handling
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    errorHandler?: (error: Error) => AppError
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (errorHandler) {
        throw errorHandler(error as Error);
      }

      if (error instanceof AppError) {
        throw error;
      }

      // Convert unknown errors to internal server errors
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal server error',
        500,
        { originalError: error }
      );
    }
  }
}

/**
 * Factory function for creating common error types
 */
export const createError = {
  validation: (message: string, fieldErrors?: Record<string, string[]>) =>
    ErrorUtils.validationError(message, fieldErrors),
  notFound: (resource: string, id?: string | number) => ErrorUtils.notFound(resource, id),
  conflict: (resource: string, field: string, value: string) =>
    ErrorUtils.duplicate(resource, field, value),
  badRequest: (message: string, fieldErrors?: Record<string, string[]>) =>
    ErrorUtils.badRequest(message, fieldErrors),
  unprocessable: (message: string, constraints?: Record<string, any>) =>
    ErrorUtils.unprocessableEntity(message, constraints),
  unauthorized: (reason?: string) => new AuthenticationError(reason),
  forbidden: (requiredPermissions?: string[], userPermissions?: string[]) =>
    ErrorUtils.insufficientPermissions(requiredPermissions, userPermissions),
  rateLimit: (message?: string) => new RateLimitError(message),
  timeout: (message?: string) => new TimeoutError(message),
  serviceUnavailable: (message?: string) => new ServiceUnavailableError(message),
  maintenance: (message?: string) => new MaintenanceError(message),
  stellar: (message: string, details?: Record<string, any>) => new StellarError(message, details),
  database: (message: string, details?: Record<string, any>) => new DatabaseError(message, details),
};
