import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from './app.error';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class ErrorHandlingMiddleware implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let context: Record<string, any> = {};

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
      code = exception.code;
      context = exception.context || {};
      this.logger.warn(`AppError: ${code}`, { message, context });
    } else if (exception instanceof Error) {
      this.logger.error('Unhandled exception', { error: exception.message, stack: exception.stack });
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}
