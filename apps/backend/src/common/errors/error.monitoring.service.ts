import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppError, ErrorCode } from './app.error';
import { getErrorContext } from './error.context.middleware';

/**
 * Error metrics collected during runtime
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorByCode: Record<string, number>;
  errorByStatusCode: Record<number, number>;
  recentErrors: Array<{
    code: string;
    message: string;
    timestamp: Date;
    path?: string;
    method?: string;
    userId?: string;
  }>;
  lastErrorTime?: Date;
}

/**
 * Events emitted by error monitoring
 */
export const ERROR_EVENTS = {
  ERROR_OCCURRED: 'error.occurred',
  ERROR_RATE_EXCEEDED: 'error.rate.exceeded',
  CRITICAL_ERROR: 'error.critical',
} as const;

/**
 * Error monitoring configuration
 */
export interface ErrorMonitoringConfig {
  maxRecentErrors: number;
  criticalErrorThreshold: number; // Errors per minute
  enableMetrics: boolean;
  enableEvents: boolean;
}

/**
 * Service for monitoring and tracking errors across the application
 */
@Injectable()
export class ErrorMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(ErrorMonitoringService.name);
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorByCode: {},
    errorByStatusCode: {},
    recentErrors: [],
  };
  private errorTimestamps: Date[] = [];
  private config: ErrorMonitoringConfig = {
    maxRecentErrors: 100,
    criticalErrorThreshold: 10, // 10 errors per minute
    enableMetrics: true,
    enableEvents: true,
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.logger.log('Error monitoring service initialized');
    this.startCleanupInterval();
  }

  /**
   * Record an error occurrence
   */
  recordError(error: Error | AppError): void {
    if (!this.config.enableMetrics) return;

    const timestamp = new Date();
    const errorContext = getErrorContext();
    const isAppError = error instanceof AppError;

    // Update metrics
    this.metrics.totalErrors++;
    this.metrics.lastErrorTime = timestamp;

    // Track by error code
    const errorCode = isAppError ? error.code : 'UNKNOWN_ERROR';
    this.metrics.errorByCode[errorCode] = (this.metrics.errorByCode[errorCode] || 0) + 1;

    // Track by status code
    const statusCode = isAppError ? error.statusCode : 500;
    this.metrics.errorByStatusCode[statusCode] = (this.metrics.errorByStatusCode[statusCode] || 0) + 1;

    // Add to recent errors
    const recentError = {
      code: errorCode,
      message: error.message,
      timestamp,
      path: errorContext?.path,
      method: errorContext?.method,
      userId: errorContext?.userId,
    };

    this.metrics.recentErrors.unshift(recentError);
    if (this.metrics.recentErrors.length > this.config.maxRecentErrors) {
      this.metrics.recentErrors.pop();
    }

    // Track error timestamps for rate calculation
    this.errorTimestamps.push(timestamp);
    this.cleanupOldTimestamps();

    // Emit events if enabled
    if (this.config.enableEvents) {
      this.emitErrorEvents(error, errorContext);
    }

    // Check for critical error rate
    this.checkCriticalErrorRate();
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentErrors = this.errorTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );
    return recentErrors.length;
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(): Array<{ code: string; count: number; percentage: number }> {
    const total = this.metrics.totalErrors;
    return Object.entries(this.metrics.errorByCode)
      .map(([code, count]) => ({
        code,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get recent errors with optional filtering
   */
  getRecentErrors(
    limit?: number,
    filter?: { code?: string; statusCode?: number }
  ): ErrorMetrics['recentErrors'] {
    let filtered = this.metrics.recentErrors;

    if (filter?.code) {
      filtered = filtered.filter((error) => error.code === filter.code);
    }

    if (filter?.statusCode) {
      // Note: statusCode filtering would require storing it in recentErrors
    }

    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorByCode: {},
      errorByStatusCode: {},
      recentErrors: [],
    };
    this.errorTimestamps = [];
    this.logger.log('Error metrics reset');
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<ErrorMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Error monitoring configuration updated', { config });
  }

  /**
   * Emit error events
   */
  private emitErrorEvents(error: Error, context?: any): void {
    const eventData = {
      error: {
        name: error.name,
        message: error.message,
        code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
        statusCode: error instanceof AppError ? error.statusCode : 500,
      },
      context: {
        requestId: context?.requestId,
        userId: context?.userId,
        path: context?.path,
        method: context?.method,
        timestamp: new Date(),
      },
      metrics: {
        totalErrors: this.metrics.totalErrors,
        errorRate: this.getErrorRate(),
      },
    };

    // Emit general error event
    this.eventEmitter.emit(ERROR_EVENTS.ERROR_OCCURRED, eventData);

    // Emit critical error event for high severity errors
    if (error instanceof AppError && error.statusCode >= 500) {
      this.eventEmitter.emit(ERROR_EVENTS.CRITICAL_ERROR, {
        ...eventData,
        severity: 'critical',
      });
    }
  }

  /**
   * Check for critical error rate
   */
  private checkCriticalErrorRate(): void {
    const errorRate = this.getErrorRate();
    if (errorRate >= this.config.criticalErrorThreshold) {
      this.logger.warn(`Critical error rate exceeded: ${errorRate} errors/minute`);
      
      if (this.config.enableEvents) {
        this.eventEmitter.emit(ERROR_EVENTS.ERROR_RATE_EXCEEDED, {
          errorRate,
          threshold: this.config.criticalErrorThreshold,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Clean up old error timestamps
   */
  private cleanupOldTimestamps(): void {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    this.errorTimestamps = this.errorTimestamps.filter(
      (timestamp) => timestamp > fiveMinutesAgo
    );
  }

  /**
   * Start periodic cleanup of old data
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldTimestamps();
      
      // Clean up old recent errors (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 3600000);
      this.metrics.recentErrors = this.metrics.recentErrors.filter(
        (error) => error.timestamp > oneHourAgo
      );
    }, 300000); // Run every 5 minutes
  }
}
