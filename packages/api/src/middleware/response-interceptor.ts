import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, createErrorResponse } from '../types/response';

declare global {
  namespace Express {
    interface Response {
      success: <T>(data: T, options?: any) => void;
      error: (code: string, message: string, details?: Record<string, any>) => void;
    }
  }
}

/**
 * Response interceptor middleware
 * 
 * Adds `res.success()` and `res.error()` methods for consistent responses
 */
export function responseInterceptor(req: Request, res: Response, next: NextFunction): void {
  // Add success method
  res.success = function<T>(data: T, options?: any): void {
    const response = createSuccessResponse(data, options);
    this.status(200).json(response);
  };

  // Add error method
  res.error = function(code: string, message: string, details?: Record<string, any>): void {
    const response = createErrorResponse(code, message, details);
    this.status(400).json(response);
  };

  next();
}
