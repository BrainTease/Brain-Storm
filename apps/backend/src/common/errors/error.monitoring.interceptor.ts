import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ErrorMonitoringService } from './error.monitoring.service';
import { AppError } from './app.error';

/**
 * Interceptor that automatically records errors for monitoring
 */
@Injectable()
export class ErrorMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorMonitoringInterceptor.name);

  constructor(private readonly errorMonitoringService: ErrorMonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Record successful request metrics (optional)
        const responseTime = Date.now() - startTime;
        // Could add response time tracking here
      }),
      catchError((error) => {
        // Record error in monitoring service
        this.errorMonitoringService.recordError(error);

        // Log additional context for AppErrors
        if (error instanceof AppError) {
          this.logger.debug(`AppError intercepted: ${error.code} - ${error.message}`, {
            path: request.path,
            method: request.method,
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Re-throw the error so other filters can handle it
        return throwError(() => error);
      })
    );
  }
}
