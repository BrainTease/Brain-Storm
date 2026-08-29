import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, ValidationError } from 'joi';

/**
 * Validation Middleware – Issue #981
 *
 * Provides schema-based request body and query validation for any endpoint.
 * Rejects malformed payloads with descriptive error messages.
 *
 * Usage:
 *   Use the @ValidateRequest() decorator on controller methods
 */

export interface ValidationSchema {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  /**
   * Validate request payload against provided schema
   * Returns sanitized and validated data
   */
  static validateRequest(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate body
        if (schema.body && req.body) {
          const { error, value } = schema.body.validate(req.body, {
            stripUnknown: true,
            abortEarly: false,
          });
          if (error) {
            throw this.formatValidationError(error);
          }
          req.body = value;
        }

        // Validate query
        if (schema.query && Object.keys(req.query).length > 0) {
          const { error, value } = schema.query.validate(req.query, {
            stripUnknown: true,
            abortEarly: false,
          });
          if (error) {
            throw this.formatValidationError(error);
          }
          req.query = value;
        }

        // Validate params
        if (schema.params && Object.keys(req.params).length > 0) {
          const { error, value } = schema.params.validate(req.params, {
            stripUnknown: true,
            abortEarly: false,
          });
          if (error) {
            throw this.formatValidationError(error);
          }
          req.params = value;
        }

        next();
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.warn(
          `Validation error on ${req.method} ${req.path}: ${err instanceof Error ? err.message : String(err)}`
        );
        throw new BadRequestException({
          message: 'Request validation failed',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    };
  }

  private static formatValidationError(error: ValidationError): BadRequestException {
    const details = error.details
      .map((d) => `${d.path.join('.')}: ${d.message}`)
      .join('; ');
    return new BadRequestException({
      message: 'Request validation failed',
      details,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    next();
  }
}
