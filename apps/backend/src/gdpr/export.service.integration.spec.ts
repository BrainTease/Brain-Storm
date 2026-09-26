import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { GdprPartialFailureError, GdprTotalFailureError } from './gdpr-errors';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

const mockAuditService = () => ({
  log: jest.fn().mockResolvedValue(undefined),
});

describe('ExportService – multi-module GDPR export/deletion (integration)', () => {
  let service: ExportService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let auditService: ReturnType<typeof mockAuditService>;

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'user1',
    bio: 'bio',
    avatar: null,
    stellarPublicKey: 'GABC123',
    role: 'student',
    isVerified: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: AuditService, useFactory: mockAuditService },
      ],
    }).compile();

    service = module.get(ExportService);
    userRepo = module.get(getRepositoryToken(User));
    auditService = module.get(AuditService);
  });

  it('exports profile and on-chain notice modules and writes a success audit entry', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);

    const buffer = await service.exportUserData('user-1', '127.0.0.1');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(auditService.log).toHaveBeenCalledWith(
      'gdpr.export.requested',
      'user-1',
      true,
      expect.objectContaining({ succeededModules: expect.arrayContaining(['profile', 'on_chain_notice']) }),
      '127.0.0.1'
    );
  });

  it('throws NotFoundException when the user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.exportUserData('missing-user')).rejects.toThrow('User not found');
  });

  it('logs a success audit entry for account deletion with succeeded modules', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);
    userRepo.save.mockResolvedValue({ ...baseUser, deletedAt: new Date() });

    const result = await service.deleteAccount('user-1', '127.0.0.1');

    expect(result.success).toBe(true);
    expect(auditService.log).toHaveBeenCalledWith(
      'gdpr.account.deleted',
      'user-1',
      true,
      expect.objectContaining({ succeededModules: ['profile_pii_erasure'] }),
      '127.0.0.1'
    );
  });

  it('raises GdprTotalFailureError and logs a failure audit entry when deletion fails completely', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);
    userRepo.save.mockRejectedValue(new Error('database connection lost'));

    await expect(service.deleteAccount('user-1', '127.0.0.1')).rejects.toThrow(GdprTotalFailureError);

    expect(auditService.log).toHaveBeenCalledWith(
      'gdpr.account.deletion_failed',
      'user-1',
      false,
      expect.objectContaining({ failures: expect.any(Array) }),
      '127.0.0.1'
    );
  });

  it('GdprPartialFailureError carries succeeded modules and partial data for later reconciliation', () => {
    const err = new GdprPartialFailureError(
      'export',
      'user-1',
      [{ module: 'payments', error: 'timeout' }],
      ['profile'],
      Buffer.from('partial-zip')
    );
    expect(err.succeededModules).toEqual(['profile']);
    expect(err.failures).toHaveLength(1);
    expect(err.partialData?.toString()).toBe('partial-zip');
  });
});
