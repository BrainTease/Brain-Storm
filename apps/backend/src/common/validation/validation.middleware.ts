import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Validation middleware for request body validation
 */
@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    // Middleware just passes through - actual validation happens via pipes
    next();
  }
}

/**
 * Validation error formatter
 */
export class ValidationErrorFormatter {
  static format(errors: any[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      const field = error.property;
      const messages = Object.values(error.constraints || {}) as string[];
      formatted[field] = messages;
    });

    return formatted;
  }

  static formatSingle(errors: any[]): string {
    if (errors.length === 0) return 'Validation failed';
    const firstError = errors[0];
    const constraints = Object.values(firstError.constraints || {}) as string[];
    return constraints[0] || 'Validation failed';
  }
}

/**
 * Validation error response builder
 */
export class ValidationErrorResponse {
  static build(errors: any[]) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: ValidationErrorFormatter.format(errors),
      timestamp: new Date().toISOString(),
    };
  }
}
