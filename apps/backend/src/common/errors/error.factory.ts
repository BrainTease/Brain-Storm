import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  StellarError,
  DatabaseError,
  ErrorCode,
} from './app.error';

export class ErrorFactory {
  static validation(message: string, details?: Record<string, any>): ValidationError {
    return new ValidationError(message, details);
  }

  static authentication(message?: string): AuthenticationError {
    return new AuthenticationError(message);
  }

  static authorization(message?: string): AuthorizationError {
    return new AuthorizationError(message);
  }

  static notFound(resource: string): NotFoundError {
    return new NotFoundError(resource);
  }

  static conflict(message: string): ConflictError {
    return new ConflictError(message);
  }

  static stellar(message: string, details?: Record<string, any>): StellarError {
    return new StellarError(message, details);
  }

  static database(message: string, details?: Record<string, any>): DatabaseError {
    return new DatabaseError(message, details);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500);
    }
    return new AppError(ErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
  }
}
