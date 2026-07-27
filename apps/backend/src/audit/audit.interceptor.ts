import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (user?.apiKey) {
      const ip = req.ip || req.connection.remoteAddress;
      const ua = req.headers['user-agent'];
      this.auditService.log(AuditAction.API_KEY_USED, user.userId, true, { apiKeyId: user.apiKeyId }, ip, ua);
    }

    return next.handle();
  }
}
