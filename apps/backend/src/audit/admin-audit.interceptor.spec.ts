import { of, throwError, lastValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { AUDIT_LOG_METADATA_KEY } from './audit-log.decorator';
import { AuditAction } from './audit-log.entity';

function buildContext(overrides: Partial<any> = {}): ExecutionContext {
  const req = {
    user: { userId: 'admin-1' },
    ip: '127.0.0.1',
    connection: {},
    headers: { 'user-agent': 'jest' },
    params: { id: 'target-1' },
    body: { role: 'instructor', password: 'should-be-redacted' },
    method: 'PATCH',
    route: { path: '/v1/admin/users/:id/role' },
    url: '/v1/admin/users/target-1/role',
    ...overrides,
  };

  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('AdminAuditInterceptor', () => {
  let auditService: { log: jest.Mock };
  let reflector: Reflector;

  beforeEach(() => {
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    reflector = new Reflector();
  });

  it('skips handlers with no @AuditLog metadata', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const interceptor = new AdminAuditInterceptor(reflector, auditService as any);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(interceptor.intercept(buildContext(), next));

    expect(result).toEqual({ ok: true });
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('logs a successful admin mutation to the audit trail', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ action: AuditAction.ROLE_CHANGED });
    const interceptor = new AdminAuditInterceptor(reflector, auditService as any);
    const next: CallHandler = { handle: () => of({ id: 'target-1', role: 'instructor' }) };

    await lastValueFrom(interceptor.intercept(buildContext(), next));

    expect(auditService.log).toHaveBeenCalledTimes(1);
    const [action, actorId, success, metadata] = auditService.log.mock.calls[0];
    expect(action).toBe(AuditAction.ROLE_CHANGED);
    expect(actorId).toBe('admin-1');
    expect(success).toBe(true);
    expect(metadata.targetId).toBe('target-1');
    expect(metadata.body.password).toBe('[REDACTED]');
  });

  it('logs a failed admin mutation with success=false and rethrows', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ action: AuditAction.USER_BANNED });
    const interceptor = new AdminAuditInterceptor(reflector, auditService as any);
    const failure = new Error('user not found');
    const next: CallHandler = { handle: () => throwError(() => failure) };

    await expect(
      lastValueFrom(interceptor.intercept(buildContext(), next)),
    ).rejects.toThrow('user not found');

    expect(auditService.log).toHaveBeenCalledTimes(1);
    const [action, actorId, success, metadata] = auditService.log.mock.calls[0];
    expect(action).toBe(AuditAction.USER_BANNED);
    expect(actorId).toBe('admin-1');
    expect(success).toBe(false);
    expect(metadata.error).toBe('user not found');
  });

  it('redacts sensitive body fields before persisting metadata', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ action: AuditAction.ADMIN_ACTION });
    const interceptor = new AdminAuditInterceptor(reflector, auditService as any);
    const next: CallHandler = { handle: () => of({}) };

    await lastValueFrom(
      interceptor.intercept(
        buildContext({ body: { token: 'abc', secret: 'xyz', reason: 'spam' } }),
        next,
      ),
    );

    const [, , , metadata] = auditService.log.mock.calls[0];
    expect(metadata.body).toEqual({
      token: '[REDACTED]',
      secret: '[REDACTED]',
      reason: 'spam',
    });
  });
});
