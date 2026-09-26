import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-log.entity';
import { AUDIT_LOG_METADATA_KEY, AuditLogMetadata } from './audit-log.decorator';

/**
 * Auto-logs admin mutation endpoints to the audit trail.
 *
 * Applied globally to the `admin` module's controllers so every handler
 * decorated with `@AuditLog(...)` produces an audit entry on success or
 * failure without each service method having to remember to call
 * `auditService.log(...)` itself. New endpoints are covered automatically
 * as soon as they add the decorator.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata | undefined>(
      AUDIT_LOG_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const actorId = req.user?.userId ?? req.user?.id ?? null;
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'];
    const targetId = req.params?.id;

    return next.handle().pipe(
      tap((result) => {
        void this.auditService.log(
          metadata.action as AuditAction,
          actorId,
          true,
          {
            route: req.route?.path ?? req.url,
            method: req.method,
            targetId,
            body: this.redactBody(req.body),
          },
          ip,
          userAgent,
        );
        return result;
      }),
      catchError((err) => {
        void this.auditService.log(
          metadata.action as AuditAction,
          actorId,
          false,
          {
            route: req.route?.path ?? req.url,
            method: req.method,
            targetId,
            error: err instanceof Error ? err.message : String(err),
          },
          ip,
          userAgent,
        );
        return throwError(() => err);
      }),
    );
  }

  private redactBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }
    const clone: Record<string, any> = { ...(body as Record<string, any>) };
    for (const key of ['password', 'token', 'secret']) {
      if (key in clone) {
        clone[key] = '[REDACTED]';
      }
    }
    return clone;
  }
}
