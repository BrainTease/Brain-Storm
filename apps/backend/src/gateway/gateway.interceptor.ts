import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class GatewayLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ApiGateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const meta = {
      method: req.method,
      path: req.url,
      userId: req.user?.id ?? null,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
      requestId: req.headers['x-request-id'] ?? null,
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          ...meta,
          statusCode: res.statusCode,
          durationMs: Date.now() - startTime,
        });
      }),
      catchError((err) => {
        this.logger.warn({
          ...meta,
          statusCode: err.status ?? 500,
          durationMs: Date.now() - startTime,
          error: err.message,
        });
        return throwError(() => err);
      }),
    );
  }
}
