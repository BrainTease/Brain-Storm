import { Module, Global } from '@nestjs/common';
import { ErrorMonitoringService } from './error.monitoring.service';
import { ErrorMonitoringInterceptor } from './error.monitoring.interceptor';
import { ErrorContextMiddleware } from './error.context.middleware';

/**
 * Global module for error handling and monitoring
 * This module provides comprehensive error handling utilities
 * that can be used across the entire application.
 */
@Global()
@Module({
  providers: [
    ErrorMonitoringService,
    ErrorMonitoringInterceptor,
    ErrorContextMiddleware,
  ],
  exports: [
    ErrorMonitoringService,
    ErrorMonitoringInterceptor,
    ErrorContextMiddleware,
  ],
})
export class ErrorsModule {}
