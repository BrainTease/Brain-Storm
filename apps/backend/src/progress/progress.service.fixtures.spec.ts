/**
 * Unit tests for ProgressService — migrated to shared fixtures (#1193).
 *
 * Replaces the inline mock objects in progress.service.spec.ts with
 * ProgressFactory, UserFactory, and CourseFactory from the shared
 * @brain-storm/types/test-utils module.
 *
 * Closes #1193.
 */
import { ProgressFactory, UserFactory, CourseFactory } from '@brain-storm/types/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StellarService } from '../stellar/stellar.service';
import { BadgeAwardService } from '../credentials/badge-award.service';
import { PROGRESS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

describe('ProgressService — shared fixtures (#1193)', () => {
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

  // ── record ─────────────────────────────────────────────────────────────────

  describe('record', () => {
    it('creates a new progress record when none exists', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create({ status: 'published' });
      const dto = { courseId: course.id, progressPct: 50 };
      const savedFixture = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 50,
      });

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(null);
      mockStellarService.recordProgress.mockResolvedValue(savedFixture.txHash);
      mockProgressRepository.save.mockResolvedValue(savedFixture);

      const result = await service.record(user.id, dto as any, 'GDUMMY...STELLAR');

      expect(result.progressPct).toBe(50);
    });

    it('updates an existing progress record', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 30,
      });
      const updated = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 75,
      });
      const dto = { courseId: course.id, progressPct: 75 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue(updated.txHash);
      mockProgressRepository.save.mockResolvedValue(updated);

      const result = await service.record(user.id, dto as any, 'GDUMMY...STELLAR');

      expect(result.progressPct).toBe(75);
    });

    it('sets completedAt when progressPct reaches 100', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 80,
      }) as any;
      const dto = { courseId: course.id, progressPct: 100 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx-complete');
      mockProgressRepository.save.mockResolvedValue({
        ...existing,
        progressPct: 100,
        completed: true,
      });
      mockBadgeAwardService.awardOnCompletion.mockResolvedValue(undefined);

      await service.record(user.id, dto as any, 'GDUMMY...STELLAR');

      expect(existing.completedAt).toBeDefined();
    });

    it('delegates to BadgeAwardService at 100%', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 80,
      });
      const dto = { courseId: course.id, progressPct: 100 };
      const stellarKey = 'GDUMMY...STELLAR';

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx-badge');
      mockProgressRepository.save.mockResolvedValue({
        ...existing,
        progressPct: 100,
        completed: true,
      });
      mockBadgeAwardService.awardOnCompletion.mockResolvedValue(undefined);

      await service.record(user.id, dto as any, stellarKey);

      expect(mockBadgeAwardService.awardOnCompletion).toHaveBeenCalledWith(
        user.id,
        course.id,
        stellarKey
      );
    });

    it('does NOT call BadgeAwardService when progressPct < 100', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 80,
      });
      const dto = { courseId: course.id, progressPct: 99 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('txX');
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 99 });

      await service.record(user.id, dto as any, 'GDUMMY...STELLAR');

      expect(mockBadgeAwardService.awardOnCompletion).not.toHaveBeenCalled();
    });

    it('continues gracefully when on-chain progress recording fails', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 20,
      });
      const dto = { courseId: course.id, progressPct: 50 };

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockRejectedValue(new Error('Network timeout'));
      mockProgressRepository.save.mockResolvedValue({ ...existing, progressPct: 50 });

      await expect(
        service.record(user.id, dto as any, 'GDUMMY...STELLAR')
      ).resolves.toBeDefined();
      expect(mockProgressRepository.save).toHaveBeenCalled();
    });
  });

  // ── findByCourse ───────────────────────────────────────────────────────────

  describe('findByCourse', () => {
    it('returns the progress record when found', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const record = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 60,
      });

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(record);

      const result = await service.findByCourse(user.id, course.id);

      expect(result).toBe(record);
    });

    it('throws NotFoundException when progress not found', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();

      mockProgressRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(service.findByCourse(user.id, course.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns all progress records for a user', async () => {
      const user = UserFactory.create();
      const courses = CourseFactory.createMany(3);
      const records = courses.map((c) =>
        ProgressFactory.create({ userId: user.id, courseId: c.id })
      );

      mockProgressRepository.findByUser.mockResolvedValue(records);

      const result = await service.findByUser(user.id);

      expect(result).toEqual(records);
      expect(result).toHaveLength(3);
    });

    it('returns empty array when user has no progress', async () => {
      const user = UserFactory.create();
      mockProgressRepository.findByUser.mockResolvedValue([]);

      const result = await service.findByUser(user.id);

      expect(result).toEqual([]);
    });
  });

  // ── factory correctness assertions ────────────────────────────────────────

  describe('ProgressFactory correctness (contract tests)', () => {
    it('factory creates a completed record when progressPct=100', () => {
      const record = ProgressFactory.create({ progressPct: 100, completed: true });
      expect(record.progressPct).toBe(100);
      expect(record.completed).toBe(true);
    });

    it('factory creates distinct records without ID collisions', () => {
      const records = ProgressFactory.createMany(10);
      const ids = new Set(records.map((r) => r.id));
      expect(ids.size).toBe(10);
    });

    it('factory userId and courseId can be pinned for cross-entity tests', () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const progress = ProgressFactory.create({
        userId: user.id,
        courseId: course.id,
        progressPct: 75,
      });

      expect(progress.userId).toBe(user.id);
      expect(progress.courseId).toBe(course.id);
    });
  });
});
