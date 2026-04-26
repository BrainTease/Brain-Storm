import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ApiUsageService } from './api-usage.service';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly apiUsageService: ApiUsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(context, req, start),
        error: () => this.record(context, req, start),
      }),
    );
  }

  private record(context: ExecutionContext, req: any, start: number): void {
    const res = context.switchToHttp().getResponse();
    const responseTimeMs = Date.now() - start;

    this.apiUsageService
      .log({
        endpoint: req.route?.path ?? req.url,
        method: req.method,
        userId: req.user?.id ?? null,
        ip: req.ip,
        statusCode: res.statusCode,
        responseTimeMs,
        userAgent: req.headers?.['user-agent'] ?? null,
      })
      .catch(() => {}); // fire-and-forget, never block the response
  }
}
