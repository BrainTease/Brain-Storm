import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerFactory } from './logger-factory';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware for standardized HTTP request/response logging
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = this.loggerFactory.createLogger('HTTP');

  constructor(private readonly loggerFactory: LoggerFactory) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate request ID if not present
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    req['requestId'] = requestId;

    // Capture start time
    const startTime = Date.now();

    // Capture original send method
    const originalSend = res.send;

    // Override send to log response
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const userId = req['user']?.id;

      // Log the request
      this.logger.logRequest(
        req.method,
        req.path,
        statusCode,
        duration,
        userId,
        {
          requestId,
          query: req.query,
          params: req.params,
        },
      );

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  }
}

/**
 * Middleware for logging errors
 */
@Injectable()
export class ErrorLoggingMiddleware implements NestMiddleware {
  private readonly logger = this.loggerFactory.createLogger('ERROR');

  constructor(private readonly loggerFactory: LoggerFactory) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req['requestId'] || req.headers['x-request-id'] as string || '';
    const startTime = Date.now();

    // Capture errors
    res.on('error', (error: Error) => {
      const duration = Date.now() - startTime;
      const userId = req['user']?.id;

      this.logger.logRequestError(
        req.method,
        req.path,
        error,
        res.statusCode,
        duration,
        userId,
      );
    });

    next();
  }
}
