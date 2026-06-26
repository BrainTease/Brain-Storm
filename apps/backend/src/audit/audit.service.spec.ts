import { AuditService } from './audit.service';
import * as crypto from 'crypto';

const makeRepo = (entries: any[] = []) => ({
  findOne: jest.fn(async () => entries[entries.length - 1] ?? null),
  create: jest.fn((data: any) => ({ ...data })),
  save: jest.fn(async (entry: any) => { entries.push(entry); return entry; }),
  createQueryBuilder: jest.fn(() => ({
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(async () => ({ affected: 1 })),
    getMany: jest.fn(async () => entries),
  })),
});

const makeLogger = () => ({ setContext: jest.fn(), info: jest.fn(), error: jest.fn() });

const makeEncryption = () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
});

describe('AuditService', () => {
  let service: AuditService;
  let entries: any[];

  beforeEach(() => {
    entries = [];
    service = new AuditService(makeRepo(entries) as any, makeLogger() as any, makeEncryption() as any);
  });

  it('should save an audit entry with entryHash', async () => {
    await service.log('auth.login.success', 'user-1', true, {}, '1.2.3.4', 'Mozilla');
    expect(entries).toHaveLength(1);
    expect(entries[0].entryHash).toBeTruthy();
    expect(entries[0].entryHash).toHaveLength(64); // sha256 hex
  });

  it('should encrypt ipAddress and userAgent', async () => {
    await service.log('auth.login.success', 'user-1', true, {}, '1.2.3.4', 'Mozilla');
    expect(entries[0].ipAddress).toBe('enc:1.2.3.4');
    expect(entries[0].userAgent).toBe('enc:Mozilla');
  });

  it('should redact PII from metadata', async () => {
    await service.log('auth.register', 'user-1', true, { email: 'user@example.com', foo: 'bar' });
    expect(entries[0].metadata.email).toBe('[REDACTED]');
    expect(entries[0].metadata.foo).toBe('bar');
  });

  it('should chain prevHash from the last entry', async () => {
    await service.log('auth.login.success', 'u1', true);
    const firstHash = entries[0].entryHash;
    await service.log('auth.logout', 'u1', true);
    expect(entries[1].prevHash).toBe(firstHash);
  });

  it('verifyIntegrity should pass for unmodified entries', async () => {
    await service.log('auth.login.success', 'u1', true);
    const report = await service.verifyIntegrity();
    expect(report.valid).toBe(true);
    expect(report.broken).toBe(0);
  });

  it('verifyIntegrity should detect a tampered entry', async () => {
    await service.log('auth.login.success', 'u1', true);
    // Tamper
    entries[0].action = 'TAMPERED';
    const report = await service.verifyIntegrity();
    expect(report.valid).toBe(false);
    expect(report.broken).toBe(1);
  });

  it('pruneOldEntries should call delete query', async () => {
    const deleted = await service.pruneOldEntries(365);
    expect(deleted).toBe(1);
  });

  it('exportLogs should return NDJSON string', async () => {
    await service.log('auth.login.success', 'u1', true);
    const ndjson = await service.exportLogs({});
    expect(typeof ndjson).toBe('string');
    JSON.parse(ndjson.split('\n')[0]); // should be valid JSON
  });
});
