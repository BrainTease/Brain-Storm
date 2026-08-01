import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';

// Prevent real zip creation touching filesystem
jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    addFile: jest.fn(),
    toBuffer: jest.fn(() => Buffer.from('FAKE_ZIP')),
  }));
});

describe('ExportService', () => {
  let service: ExportService;

  const mockUserRepo = { findOne: jest.fn(), save: jest.fn() };
  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'u1',
      email: 'alice@example.com',
      username: 'alice',
      bio: 'Blockchain learner',
      avatar: null,
      stellarPublicKey: 'GSTELLAR123',
      role: 'student',
      isVerified: true,
      createdAt: new Date('2024-01-01'),
      passwordHash: 'hashed',
      verificationToken: 'vt',
      mfaSecret: null,
      mfaBackupCodes: null,
      referralCode: 'REF1',
      referredBy: null,
      deletedAt: null,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── exportUserData ─────────────────────────────────────────────────────────

  describe('exportUserData', () => {
    it('returns a Buffer containing the ZIP archive', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.exportUserData('u1');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('FAKE_ZIP');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.exportUserData('missing')).rejects.toThrow(NotFoundException);
    });

    it('writes profile.json and on_chain_notice.txt to the ZIP', async () => {
      const AdmZip = require('adm-zip');
      const mockZipInstance = { addFile: jest.fn(), toBuffer: jest.fn(() => Buffer.from('')) };
      (AdmZip as jest.Mock).mockImplementationOnce(() => mockZipInstance);

      mockUserRepo.findOne.mockResolvedValue(makeUser());

      await service.exportUserData('u1');

      const filenames = mockZipInstance.addFile.mock.calls.map((c: any[]) => c[0]);
      expect(filenames).toContain('profile.json');
      expect(filenames).toContain('on_chain_notice.txt');
    });

    it('excludes sensitive fields (passwordHash, mfaSecret) from profile.json', async () => {
      const AdmZip = require('adm-zip');
      const mockZipInstance = { addFile: jest.fn(), toBuffer: jest.fn(() => Buffer.from('')) };
      (AdmZip as jest.Mock).mockImplementationOnce(() => mockZipInstance);

      mockUserRepo.findOne.mockResolvedValue(makeUser());

      await service.exportUserData('u1');

      const profileCall = mockZipInstance.addFile.mock.calls.find(
        (c: any[]) => c[0] === 'profile.json'
      );
      const profileJson = JSON.parse(profileCall[1].toString());
      expect(profileJson).not.toHaveProperty('passwordHash');
      expect(profileJson).not.toHaveProperty('mfaSecret');
      expect(profileJson).not.toHaveProperty('verificationToken');
    });

    it('logs a GDPR audit entry for the export', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser());

      await service.exportUserData('u1', '1.2.3.4');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'gdpr.export.requested',
        'u1',
        true,
        expect.any(Object),
        '1.2.3.4'
      );
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('erases PII fields and returns success with on-chain caveat', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser());
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.deleteAccount('u1');

      expect(result.success).toBe(true);
      expect(result.onChainCaveat).toContain('Stellar');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount('missing')).rejects.toThrow(NotFoundException);
    });

    it('replaces email with deleted placeholder', async () => {
      const user = makeUser();
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      await service.deleteAccount('u1');

      const savedUser = mockUserRepo.save.mock.calls[0][0];
      expect(savedUser.email).toBe('deleted-u1@deleted.invalid');
    });

    it('nullifies all PII fields', async () => {
      const user = makeUser();
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      await service.deleteAccount('u1');

      const saved = mockUserRepo.save.mock.calls[0][0];
      expect(saved.username).toBeNull();
      expect(saved.passwordHash).toBe('');
      expect(saved.avatar).toBeNull();
      expect(saved.bio).toBeNull();
      expect(saved.stellarPublicKey).toBeNull();
      expect(saved.verificationToken).toBeNull();
      expect(saved.mfaSecret).toBeNull();
      expect(saved.referralCode).toBeNull();
      expect(saved.referredBy).toBeNull();
    });

    it('sets deletedAt to a Date', async () => {
      const user = makeUser();
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      await service.deleteAccount('u1');

      const saved = mockUserRepo.save.mock.calls[0][0];
      expect(saved.deletedAt).toBeInstanceOf(Date);
    });

    it('logs a GDPR audit entry for the deletion', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser());
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      await service.deleteAccount('u1', '10.0.0.1');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'gdpr.account.deleted',
        'u1',
        true,
        expect.any(Object),
        '10.0.0.1'
      );
    });
  });
});
