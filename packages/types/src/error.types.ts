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

export interface AppErrorResponse {
  statusCode: number;
  code: ErrorCode;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorContext {
  [key: string]: any;
}
