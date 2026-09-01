import { Request, Response } from 'express';
import { createSuccessResponse, createErrorResponse, ApiResponse, PaginationMeta } from '../types/response';

export abstract class BaseController {
  /**
   * Send a success response
   */
  protected success<T>(res: Response, data: T, options?: {
    pagination?: PaginationMeta;
    status?: number;
    meta?: Partial<any>;
  }): void {
    const status = options?.status || 200;
    const response = createSuccessResponse(data, {
      pagination: options?.pagination,
      ...options?.meta,
    });
    res.status(status).json(response);
  }

  /**
   * Send an error response
   */
  protected error(
    res: Response,
    code: string,
    message: string,
    details?: Record<string, any>,
    status?: number,
  ): void {
    const response = createErrorResponse(code, message, details);
    res.status(status || 400).json(response);
  }

  /**
   * Send a not found response
   */
  protected notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, 'NOT_FOUND', message, undefined, 404);
  }

  /**
   * Send a validation error response
   */
  protected validationError(
    res: Response,
    message: string,
    details?: Record<string, any>,
  ): void {
    this.error(res, 'VALIDATION_ERROR', message, details, 400);
  }

  /**
   * Send an unauthorized response
   */
  protected unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, 'UNAUTHORIZED', message, undefined, 401);
  }

  /**
   * Send a forbidden response
   */
  protected forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, 'FORBIDDEN', message, undefined, 403);
  }

  /**
   * Send a conflict response
   */
  protected conflict(res: Response, message: string, details?: Record<string, any>): void {
    this.error(res, 'CONFLICT', message, details, 409);
  }

  /**
   * Send a server error response
   */
  protected serverError(res: Response, message: string = 'Internal server error'): void {
    this.error(res, 'INTERNAL_ERROR', message, undefined, 500);
  }
}
