import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject, Injectable, Scope } from '@nestjs/common';

/**
 * Log levels for standardized logging
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * Structured log entry
 */
export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  duration?: number;
  statusCode?: number;
}

/**
 * Logger factory for creating standardized loggers
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerFactory {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger: Logger) {}

  /**
   * Create a child logger with context
   */
  createLogger(context: string): StandardizedLogger {
    return new StandardizedLogger(this.winstonLogger, context);
  }

  /**
   * Log a structured entry
   */
  log(entry: StructuredLogEntry): void {
    const logData = {
      context: entry.context,
      userId: entry.userId,
      requestId: entry.requestId,
      metadata: entry.metadata,
      duration: entry.duration,
      statusCode: entry.statusCode,
    };

    if (entry.error) {
      logData['error'] = {
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    this.winstonLogger.log(entry.level, entry.message, logData);
  }
}

/**
 * Standardized logger with structured logging support
 */
export class StandardizedLogger {
  constructor(
    private readonly winstonLogger: Logger,
    private readonly context: string,
  ) {}

  /**
   * Log error with structured data
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.winstonLogger.error(message, {
      context: this.context,
      error: error ? { message: error.message, stack: error.stack } : undefined,
      metadata,
    });
  }

  /**
   * Log warning with structured data
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.winstonLogger.warn(message, {
      context: this.context,
      metadata,
    });
  }

  /**
   * Log info with structured data
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.winstonLogger.info(message, {
      context: this.context,
      metadata,
    });
  }

  /**
   * Log debug with structured data
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.winstonLogger.debug(message, {
      context: this.context,
      metadata,
    });
  }

  /**
   * Log verbose with structured data
   */
  verbose(message: string, metadata?: Record<string, any>): void {
    this.winstonLogger.verbose(message, {
      context: this.context,
      metadata,
    });
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    metadata?: Record<string, any>,
  ): void {
    this.info(`${method} ${path}`, {
      statusCode,
      duration,
      userId,
      ...metadata,
    });
  }

  /**
   * Log API error
   */
  logRequestError(
    method: string,
    path: string,
    error: Error,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    this.error(`${method} ${path} - ${error.message}`, error, {
      statusCode,
      duration,
      userId,
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, duration: number, metadata?: Record<string, any>): void {
    this.debug(`Database query executed`, {
      query,
      duration,
      ...metadata,
    });
  }

  /**
   * Log database error
   */
  logQueryError(query: string, error: Error, metadata?: Record<string, any>): void {
    this.error(`Database query failed: ${error.message}`, error, {
      query,
      ...metadata,
    });
  }

  /**
   * Log business operation
   */
  logOperation(
    operation: string,
    status: 'start' | 'success' | 'failure',
    duration?: number,
    metadata?: Record<string, any>,
  ): void {
    const message = `Operation ${operation} - ${status}`;
    const level = status === 'failure' ? 'error' : 'info';
    
    this.winstonLogger.log(level, message, {
      context: this.context,
      operation,
      status,
      duration,
      metadata,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): StandardizedLogger {
    return new StandardizedLogger(this.winstonLogger, `${this.context}:${additionalContext}`);
  }
}
