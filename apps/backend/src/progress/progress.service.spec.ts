import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StellarService } from '../stellar/stellar.service';
import { BadgeAwardService } from '../credentials/badge-award.service';
import { PROGRESS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

/**
 * Unit tests for ProgressService.
 *
 * Issue #818: ProgressService now delegates credential issuance and referral
 * reward minting to BadgeAwardService.  CredentialsService and UsersService are
 * no longer direct dependencies of ProgressService, so they are no longer
 * mocked here.  The badge-award path is fully tested in
 * badge-award.service.spec.ts.
 */
describe('ProgressService', () => {
  let service: ProgressService;

  const mockProgressRepository = {
    findByUserAndCourse: jest.fn(),
    save: jest.fn(),
    findByUser: jest.fn(),
    countCompletedByUser: jest.fn(),
  };

  const mockStellarService = {
    recordProgress: jest.fn(),
  };

  const mockBadgeAwardService = {
    awardOnCompletion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PROGRESS_REPOSITORY_TOKEN, useValue: mockProgressRepository },
        { provide: StellarService, useValue: mockStellarService },
        { provide: BadgeAwardService, useValue: mockBadgeAwardService },
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

    it('creates a new progress record when none exists', async () => {
      const dto = { courseId, progressPct: 50 };
      const newProgress = { userId, courseId, progressPct: 0 };
      const savedProgress = { ...newProgress, progressPct: 50, txHash: 'tx1' };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(null);
      mockStellarService.recordProgress.mockResolvedValue('tx1');
      mockProgressRepository.save.mockResolvedValue(savedProgress);

      const result = await service.record(userId, dto as any, stellarKey);

      expect(result.progressPct).toBe(50);
    });

    it('updates an existing progress record', async () => {
      const dto = { courseId, progressPct: 75 };
      const existing = { userId, courseId, progressPct: 30 };
      const saved = { ...existing, progressPct: 75, txHash: 'tx2' };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx2');
      mockProgressRepository.save.mockResolvedValue(saved);

      const result = await service.record(userId, dto as any, stellarKey);

      expect(result.progressPct).toBe(75);
    });

    it('sets completedAt when progressPct >= 100', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 80 } as any;

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx3');
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 100 });
      mockBadgeAwardService.awardOnCompletion.mockResolvedValue(undefined);

      await service.record(userId, dto as any, stellarKey);

      expect(existing.completedAt).toBeDefined();
    });

    it('delegates to BadgeAwardService at 100 %', async () => {
      const dto = { courseId, progressPct: 100 };
      const existing = { userId, courseId, progressPct: 80 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx4');
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 100 });
      mockBadgeAwardService.awardOnCompletion.mockResolvedValue(undefined);

      await service.record(userId, dto as any, stellarKey);

      expect(mockBadgeAwardService.awardOnCompletion).toHaveBeenCalledWith(
        userId,
        courseId,
        stellarKey
      );
    });

    it('does NOT call BadgeAwardService when progressPct < 100', async () => {
      const dto = { courseId, progressPct: 99 };
      const existing = { userId, courseId, progressPct: 80 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('txX');
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 99 });

      await service.record(userId, dto as any, stellarKey);

      expect(mockBadgeAwardService.awardOnCompletion).not.toHaveBeenCalled();
    });

    it('continues gracefully when on-chain progress recording fails', async () => {
      const dto = { courseId, progressPct: 50 };
      const existing = { userId, courseId, progressPct: 20 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockRejectedValue(new Error('Network timeout'));
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 50 });

      await expect(service.record(userId, dto as any, stellarKey)).resolves.toBeDefined();
      expect(mockProgressRepository.save).toHaveBeenCalled();
    });

    it('updates lessonId when provided in dto', async () => {
      const dto = { courseId, progressPct: 40, lessonId: 'lesson-5' };
      const savedWithLesson = { userId, courseId, progressPct: 40, lessonId: 'lesson-5' };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(null);
      mockStellarService.recordProgress.mockResolvedValue('txL');
      mockProgressRepository.save.mockResolvedValue(savedWithLesson);

      const result = await service.record(userId, dto as any, stellarKey);

      // The save call should have included lessonId
      const savedArg = mockProgressRepository.save.mock.calls[0][0];
      expect(savedArg.lessonId).toBe('lesson-5');
      expect(result.lessonId).toBe('lesson-5');
    });
  });

  // ---------------------------------------------------------------------------
  // findByCourse
  // ---------------------------------------------------------------------------

  describe('findByCourse', () => {
    it('returns the progress record when found', async () => {
      const record = { userId: 'u1', courseId: 'c1', progressPct: 60 };
      mockProgressRepository.findByUserAndCourse.mockResolvedValue(record);

      const result = await service.findByCourse('u1', 'c1');

      expect(result).toBe(record);
    });

    it('throws NotFoundException when progress not found', async () => {
      mockProgressRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(service.findByCourse('u1', 'c1')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------

  describe('findByUser', () => {
    it('returns all progress records for a user', async () => {
      const records = [
        { userId: 'u1', courseId: 'c1', progressPct: 80 },
        { userId: 'u1', courseId: 'c2', progressPct: 30 },
      ];
      mockProgressRepository.findByUser.mockResolvedValue(records);

      const result = await service.findByUser('u1');

      expect(result).toEqual(records);
    });

    it('returns empty array when user has no progress', async () => {
      mockProgressRepository.findByUser.mockResolvedValue([]);

      const result = await service.findByUser('u2');

      expect(result).toEqual([]);
    });
  });
});
