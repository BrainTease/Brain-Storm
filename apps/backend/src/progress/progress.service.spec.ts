import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Not, IsNull } from 'typeorm';
import { ProgressService } from './progress.service';
import { Progress } from './progress.entity';
import { StellarService } from '../stellar/stellar.service';
import { CredentialsService } from '../credentials/credentials.service';
import { UsersService } from '../users/users.service';

describe('ProgressService', () => {
  let service: ProgressService;

  const mockProgressRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockStellarService = {
    recordProgress: jest.fn(),
    mintReward: jest.fn(),
  };

  const mockCredentialsService = {
    issue: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: getRepositoryToken(Progress), useValue: mockProgressRepo },
        { provide: StellarService, useValue: mockStellarService },
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // record
  // ---------------------------------------------------------------------------

  describe('record', () => {
    const userId = 'user-1';
    const courseId = 'course-abc';
    const stellarKey = 'GDUMMY...STELLAR';

    it('should create a new progress record when none exists', async () => {
      const dto = { courseId, progressPct: 50 };
      const newProgress = { userId, courseId, progressPct: 0 } as Progress;
      const savedProgress = { ...newProgress, progressPct: 50, txHash: 'tx1' };

      mockProgressRepo.findOne.mockResolvedValue(null);
      mockProgressRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx1');
      mockProgressRepo.save.mockResolvedValue(savedProgress);

      const result = await service.record(userId, dto as any, stellarKey);

      expect(mockProgressRepo.create).toHaveBeenCalledWith({ userId, courseId });
      expect(result.progressPct).toBe(50);
    });

    it('should update an existing progress record', async () => {
      const dto = { courseId, progressPct: 75 };
      const existing = { userId, courseId, progressPct: 30 } as Progress;
      const saved = { ...existing, progressPct: 75, txHash: 'tx2' };

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx2');
      mockProgressRepo.save.mockResolvedValue(saved);

      const result = await service.record(userId, dto as any, stellarKey);

      expect(mockProgressRepo.create).not.toHaveBeenCalled();
      expect(result.progressPct).toBe(75);
    });

    it('should set completedAt when progressPct >= 100', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 80 } as Progress;
      const saved = { ...existing, progressPct: 100, completedAt: expect.any(Date) };

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx3');
      mockProgressRepo.save.mockResolvedValue(saved);
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepo.count.mockResolvedValue(1); // first completion
      mockUsersService.findById.mockResolvedValue({ id: userId, referredBy: null });

      await service.record(userId, dto as any, stellarKey);

      expect(existing.completedAt).toBeDefined();
      expect(mockCredentialsService.issue).toHaveBeenCalledWith(userId, courseId, stellarKey);
    });

    it('should NOT issue credential when progressPct < 100', async () => {
      const dto = { courseId, progressPct: 99 };
      const existing = { userId, courseId, progressPct: 80 } as Progress;

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('txX');
      mockProgressRepo.save.mockResolvedValue({ ...existing, progressPct: 99 });

      await service.record(userId, dto as any, stellarKey);

      expect(mockCredentialsService.issue).not.toHaveBeenCalled();
    });

    it('should mint referrer reward on first course completion with valid referrer', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 90 } as Progress;
      const referrerId = 'referrer-1';
      const referrerKey = 'GREFERRER...';

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx4');
      mockProgressRepo.save.mockResolvedValue({ ...existing, progressPct: 100 });
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepo.count.mockResolvedValue(1); // first completion
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId })   // user lookup
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: referrerKey }); // referrer lookup
      mockStellarService.mintReward.mockResolvedValue(undefined);

      await service.record(userId, dto as any, stellarKey);

      expect(mockProgressRepo.count).toHaveBeenCalledWith({
        where: { userId, completedAt: Not(IsNull()) },
      });
      expect(mockStellarService.mintReward).toHaveBeenCalledWith(referrerKey, 50);
    });

    it('should NOT mint referrer reward on subsequent completions', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 90 } as Progress;

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx5');
      mockProgressRepo.save.mockResolvedValue({ ...existing, progressPct: 100 });
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepo.count.mockResolvedValue(2); // not first completion

      await service.record(userId, dto as any, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('should continue gracefully when on-chain progress recording fails', async () => {
      const dto = { courseId, progressPct: 50 };
      const existing = { userId, courseId, progressPct: 20 } as Progress;

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockRejectedValue(new Error('Network timeout'));
      mockProgressRepo.save.mockResolvedValue({ ...existing, progressPct: 50 });

      // Should not throw; on-chain failure is non-fatal
      await expect(service.record(userId, dto as any, stellarKey)).resolves.toBeDefined();
      expect(mockProgressRepo.save).toHaveBeenCalled();
    });

    it('should continue gracefully when minting referrer reward fails', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 90 } as Progress;
      const referrerId = 'referrer-2';
      const referrerKey = 'GREFERRER2...';

      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx6');
      mockProgressRepo.save.mockResolvedValue({ ...existing, progressPct: 100 });
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepo.count.mockResolvedValue(1);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId })
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: referrerKey });
      mockStellarService.mintReward.mockRejectedValue(new Error('Stellar error'));

      await expect(service.record(userId, dto as any, stellarKey)).resolves.toBeDefined();
    });

    it('should update lessonId when provided in dto', async () => {
      const dto = { courseId, progressPct: 40, lessonId: 'lesson-5' };
      const newProgress = { userId, courseId, progressPct: 0 } as Progress;

      mockProgressRepo.findOne.mockResolvedValue(null);
      mockProgressRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('txL');
      mockProgressRepo.save.mockResolvedValue({ ...newProgress, lessonId: 'lesson-5', progressPct: 40 });

      await service.record(userId, dto as any, stellarKey);

      expect(newProgress.lessonId).toBe('lesson-5');
    });
  });

  // ---------------------------------------------------------------------------
  // findByCourse
  // ---------------------------------------------------------------------------

  describe('findByCourse', () => {
    it('should return progress record when found', async () => {
      const userId = 'u1';
      const courseId = 'c1';
      const record = { userId, courseId, progressPct: 60 } as Progress;

      mockProgressRepo.findOne.mockResolvedValue(record);

      const result = await service.findByCourse(userId, courseId);

      expect(result).toBe(record);
      expect(mockProgressRepo.findOne).toHaveBeenCalledWith({ where: { userId, courseId } });
    });

    it('should throw NotFoundException when progress not found', async () => {
      mockProgressRepo.findOne.mockResolvedValue(null);

      await expect(service.findByCourse('u1', 'c1')).rejects.toThrow(NotFoundException);
      await expect(service.findByCourse('u1', 'c1')).rejects.toThrow('Progress not found');
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------

  describe('findByUser', () => {
    it('should return all progress records for a user', async () => {
      const records: Progress[] = [
        { userId: 'u1', courseId: 'c1', progressPct: 80 } as Progress,
        { userId: 'u1', courseId: 'c2', progressPct: 30 } as Progress,
      ];

      mockProgressRepo.find.mockResolvedValue(records);

      const result = await service.findByUser('u1');

      expect(result).toEqual(records);
      expect(mockProgressRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return empty array when user has no progress', async () => {
      mockProgressRepo.find.mockResolvedValue([]);

      const result = await service.findByUser('u2');

      expect(result).toEqual([]);
    });
  });
});
