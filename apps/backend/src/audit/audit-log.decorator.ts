import { SetMetadata } from '@nestjs/common';
import { AuditAction } from './audit-log.entity';

export const AUDIT_LOG_METADATA_KEY = 'audit:log-action';

export interface AuditLogMetadata {
  action: AuditAction | string;
}

/**
 * Marks a controller method as an auditable admin mutation. Combined with
 * `AdminAuditInterceptor`, this makes it impossible to add a new admin
 * mutation endpoint without an explicit decision about its audit action —
 * the interceptor auto-logs every request whose handler carries this
 * decorator, so new endpoints are covered automatically once decorated.
 */
export const AuditLog = (action: AuditAction | string) =>
  SetMetadata(AUDIT_LOG_METADATA_KEY, { action } as AuditLogMetadata);
