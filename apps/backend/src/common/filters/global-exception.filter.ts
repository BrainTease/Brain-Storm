import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app.error';

/**
 * GlobalExceptionFilter — the single, canonical exception filter (#799, #974).
 *
 * Handles every exception type in one place so the response envelope is
 * always consistent and matches the platform-standard error schema:
 *
 *   { code, message, details }
 *
 * `details` is always present (an empty object when there is no extra
 * context) so clients never have to branch on whether the field exists.
 * A few extra, additive fields are kept for backwards compatibility and
 * observability:
 *
 *   {
 *     code:       string,      // machine-readable error code
 *     message:    string,      // human-readable message
 *     details:    object,      // extra context from AppError subclasses (or {})
 *     statusCode: number,      // HTTP status
 *     errors?:    any,         // validation constraint list (BadRequest only)
 *     timestamp:  string,      // ISO-8601
 *     path:       string,      // request URL
 *   }
 *
 * Priority:
 *   1. AppError (and subclasses) — business/domain errors with explicit codes
 *   2. BadRequestException — validation failures (class-validator pipe)
 *   3. Any other HttpException — framework-level HTTP errors
 *   4. Unknown / generic Error — 500
 *
 * Replaces the three previously overlapping filters:
 *   - HttpExceptionFilter       (handled case 3)
 *   - ValidationExceptionFilter (handled case 2)
 *   - ErrorHandlingMiddleware   (duplicated case 1 with different shape)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let errors: unknown = undefined;
    let details: Record<string, unknown> = {};

    // ── 1. Business / domain errors ─────────────────────────────────────────
    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details ?? {};
      this.logger.warn(`AppError [${code}]: ${message}`, exception.stack);

      // ── 2. Validation errors (BadRequestException from class-validator) ──────
    } else if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      code = 'VALIDATION_ERROR';
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = typeof b['message'] === 'string' ? b['message'] : 'Validation failed';
        errors = b['message'] ?? b['errors'] ?? b['error'];
      } else {
        message = typeof body === 'string' ? body : 'Validation failed';
      }
      this.logger.debug(`Validation error: ${message}`);

      // ── 3. Other NestJS / HTTP exceptions ────────────────────────────────────
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = typeof b['message'] === 'string' ? b['message'] : exception.message;
        code = String(b['error'] ?? exception.name ?? 'HTTP_ERROR')
          .toUpperCase()
          .replace(/\s+/g, '_');
      } else {
        message = typeof body === 'string' ? body : exception.message;
        code = exception.name.toUpperCase().replace(/\s+/g, '_');
      }
      this.logger.warn(`HttpException [${statusCode}]: ${message}`);

      // ── 4. Unhandled / unknown errors ────────────────────────────────────────
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      // Do not leak internal error messages in production
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    } else {
      this.logger.error('Unknown non-Error exception thrown', JSON.stringify(exception));
    }

    const body: Record<string, unknown> = {
      code,
      message,
      details,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors !== undefined) body['errors'] = errors;

    response.status(statusCode).json(body);
  }
}
