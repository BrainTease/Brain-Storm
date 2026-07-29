import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CredentialsService } from './credentials.service';
import { Credential } from './credential.entity';
import { StellarService } from '../stellar/stellar.service';
import { KycService } from '../kyc/kyc.service';
import { CoursesService } from '../courses/courses.service';

describe('CredentialsService', () => {
  let service: CredentialsService;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const mockStellar = { issueCredential: jest.fn(), mintReward: jest.fn() };
  const mockKyc = { isApproved: jest.fn() };
  const mockCourses = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: getRepositoryToken(Credential), useValue: mockRepo },
        { provide: StellarService, useValue: mockStellar },
        { provide: KycService, useValue: mockKyc },
        { provide: CoursesService, useValue: mockCourses },
      ],
    }).compile();
    service = module.get<CredentialsService>(CredentialsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('issue', () => {
    const userId = 'u1', courseId = 'c1', key = 'GKEY';

    it('returns existing credential without re-issuing (idempotent)', async () => {
      const existing = { id: 'cred-1', userId, courseId } as Credential;
      mockRepo.findOne.mockResolvedValue(existing);

      const result = await service.issue(userId, courseId, key);

      expect(result).toEqual(existing);
      expect(mockStellar.issueCredential).not.toHaveBeenCalled();
    });

    it('issues credential when no KYC requirement', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockCourses.findOne.mockResolvedValue({ id: courseId, requiresKyc: false });
      mockStellar.issueCredential.mockResolvedValue('tx123');
      mockStellar.mintReward.mockResolvedValue(undefined);
      const cred = { id: 'cred-1', userId, courseId, txHash: 'tx123' } as Credential;
      mockRepo.create.mockReturnValue(cred);
      mockRepo.save.mockResolvedValue(cred);

      const result = await service.issue(userId, courseId, key);

      expect(mockStellar.issueCredential).toHaveBeenCalledWith(key, courseId);
      expect(result).toEqual(cred);
    });

    it('issues credential when KYC required and user is approved', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockCourses.findOne.mockResolvedValue({ id: courseId, requiresKyc: true });
      mockKyc.isApproved.mockResolvedValue(true);
      mockStellar.issueCredential.mockResolvedValue('tx456');
      mockStellar.mintReward.mockResolvedValue(undefined);
      const cred = { id: 'cred-2', userId, courseId } as Credential;
      mockRepo.create.mockReturnValue(cred);
      mockRepo.save.mockResolvedValue(cred);

      await expect(service.issue(userId, courseId, key)).resolves.toEqual(cred);
      expect(mockKyc.isApproved).toHaveBeenCalledWith(key);
    });

    it('throws ForbiddenException when KYC required but user not approved', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockCourses.findOne.mockResolvedValue({ id: courseId, requiresKyc: true });
      mockKyc.isApproved.mockResolvedValue(false);

      await expect(service.issue(userId, courseId, key)).rejects.toThrow(ForbiddenException);
      expect(mockStellar.issueCredential).not.toHaveBeenCalled();
    });

    it('saves credential even when mintReward fails (non-fatal)', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockCourses.findOne.mockResolvedValue({ id: courseId, requiresKyc: false });
      mockStellar.issueCredential.mockResolvedValue('tx789');
      mockStellar.mintReward.mockRejectedValue(new Error('mint failed'));
      const cred = { id: 'cred-3', userId, courseId } as Credential;
      mockRepo.create.mockReturnValue(cred);
      mockRepo.save.mockResolvedValue(cred);

      await expect(service.issue(userId, courseId, key)).resolves.toEqual(cred);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('returns credentials ordered by issuedAt DESC', async () => {
      const creds = [{ id: 'c1' }, { id: 'c2' }] as Credential[];
      mockRepo.find.mockResolvedValue(creds);

      const result = await service.findByUser('u1');

      expect(result).toEqual(creds);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { userId: 'u1' }, order: { issuedAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns credential with relations when found', async () => {
      const cred = { id: 'c1', user: {}, course: {} } as unknown as Credential;
      mockRepo.findOne.mockResolvedValue(cred);

      const result = await service.findOne('c1');

      expect(result).toEqual(cred);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'c1' }, relations: ['user', 'course'] });
    });

    it('throws NotFoundException when credential not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('returns verified true when txHash matches', async () => {
      const cred = { id: 'c1', txHash: 'txABC' } as Credential;
      mockRepo.findOne.mockResolvedValue(cred);

      const result = await service.verify('txABC');

      expect(result).toEqual({ credential: cred, verified: true });
    });

    it('returns verified false when txHash not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.verify('unknown-tx');

      expect(result).toEqual({ credential: null, verified: false });
    });
  });
});
