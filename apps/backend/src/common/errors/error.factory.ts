import { AppError, ErrorCode } from './app.error';

export class ErrorFactory {
  static validation(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, 400, message, context);
  }

  static notFound(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.NOT_FOUND, 404, message, context);
  }

  static unauthorized(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, 401, message, context);
  }

  static forbidden(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.FORBIDDEN, 403, message, context);
  }

  static conflict(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.CONFLICT, 409, message, context);
  }

  static externalService(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 502, message, context);
  }

  static rateLimit(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, 429, message, context);
  }

  static internal(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, 500, message, context);
  }
}
