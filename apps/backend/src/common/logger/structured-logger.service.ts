import { Injectable, Logger } from '@nestjs/common';
import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface StructuredLogContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

@Injectable()
export class StructuredLoggerService extends Logger {
  private logger: winston.Logger;
  private requestId: string = '';

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'brain-storm-backend' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
              const requestIdStr = requestId ? ` [${requestId}]` : '';
              return `${timestamp}${requestIdStr} [${level}]: ${message} ${
                Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        }),
      ],
      exceptionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
              return `${timestamp} [${level}]: ${message}\n${stack}\n${JSON.stringify(meta, null, 2)}`;
            })
          ),
        }),
      ],
    });

    // Add file transport for production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        })
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        })
      );
    }
  }

  /**
   * Set the request ID for correlation tracking
   */
  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Get or generate request ID
   */
  getRequestId(): string {
    if (!this.requestId) {
      this.requestId = uuidv4();
    }
    return this.requestId;
  }

  /**
   * Log informational message with structured context
   */
  info(message: string, context?: StructuredLogContext) {
    const meta = {
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    this.logger.info(message, meta);
  }

  /**
   * Log debug message with structured context
   */
  debug(message: string, context?: StructuredLogContext) {
    const meta = {
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    this.logger.debug(message, meta);
  }

  /**
   * Log warning message with structured context
   */
  warn(message: string, context?: StructuredLogContext) {
    const meta = {
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    this.logger.warn(message, meta);
  }

  /**
   * Log error message with structured context and stack trace
   */
  error(message: string, error?: Error | string, context?: StructuredLogContext) {
    let stack: string | undefined;
    let errorMessage = message;

    if (error instanceof Error) {
      errorMessage = error.message;
      stack = error.stack;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    const meta = {
      ...context,
      requestId: context?.requestId || this.getRequestId(),
      ...(stack && { stack }),
    };

    this.logger.error(errorMessage, meta);
  }

  /**
   * Log transaction-related information
   */
  logTransaction(
    action: string,
    txHash?: string,
    context?: StructuredLogContext
  ) {
    const meta = {
      action,
      txHash,
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    this.logger.info('transaction', meta);
  }

  /**
   * Log API request details
   */
  logRequest(
    method: string,
    path: string,
    context?: StructuredLogContext
  ) {
    const meta = {
      method,
      path,
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    this.logger.info('api_request', meta);
  }

  /**
   * Log API response details
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: StructuredLogContext
  ) {
    const meta = {
      method,
      path,
      statusCode,
      duration_ms: duration,
      ...context,
      requestId: context?.requestId || this.getRequestId(),
    };
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](
      `api_response`,
      meta
    );
  }

  /**
   * Get underlying Winston logger instance for advanced usage
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Create a child logger with bound context
   */
  createChildLogger(context: StructuredLogContext): ChildStructuredLogger {
    return new ChildStructuredLogger(this, context);
  }
}

/**
 * Child logger that maintains context across multiple log calls
 */
export class ChildStructuredLogger {
  constructor(
    private parentLogger: StructuredLoggerService,
    private boundContext: StructuredLogContext
  ) {}

  info(message: string, additionalContext?: StructuredLogContext) {
    this.parentLogger.info(message, { ...this.boundContext, ...additionalContext });
  }

  debug(message: string, additionalContext?: StructuredLogContext) {
    this.parentLogger.debug(message, { ...this.boundContext, ...additionalContext });
  }

  warn(message: string, additionalContext?: StructuredLogContext) {
    this.parentLogger.warn(message, { ...this.boundContext, ...additionalContext });
  }

  error(message: string, error?: Error | string, additionalContext?: StructuredLogContext) {
    this.parentLogger.error(message, error, { ...this.boundContext, ...additionalContext });
  }

  logTransaction(action: string, txHash?: string, additionalContext?: StructuredLogContext) {
    this.parentLogger.logTransaction(action, txHash, { ...this.boundContext, ...additionalContext });
  }

  logRequest(method: string, path: string, additionalContext?: StructuredLogContext) {
    this.parentLogger.logRequest(method, path, { ...this.boundContext, ...additionalContext });
  }

  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    additionalContext?: StructuredLogContext
  ) {
    this.parentLogger.logResponse(method, path, statusCode, duration, {
      ...this.boundContext,
      ...additionalContext,
    });
  }
}
