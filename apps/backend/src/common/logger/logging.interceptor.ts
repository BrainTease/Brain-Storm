import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerFactory } from './logger-factory';

/**
 * Interceptor for standardized method-level logging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = this.loggerFactory.createLogger('METHOD');

  constructor(private readonly loggerFactory: LoggerFactory) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;
    const startTime = Date.now();
    const requestId = request['requestId'];

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logger.info(`Method executed: ${method} ${path}`, {
          requestId,
          duration,
          statusCode: 200,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Method failed: ${method} ${path}`,
          error,
          {
            requestId,
            duration,
            statusCode: error.status || 500,
          },
        );
        return throwError(() => error);
      }),
    );
  }
}
