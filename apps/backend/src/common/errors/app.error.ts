export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, 400, message, context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.NOT_FOUND, 404, message, context);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, 401, message, context);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.FORBIDDEN, 403, message, context);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.CONFLICT, 409, message, context);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, 502, message, context);
    this.name = 'ExternalServiceError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, 429, message, context);
    this.name = 'RateLimitError';
  }
}
