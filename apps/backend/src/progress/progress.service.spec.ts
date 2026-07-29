import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not, IsNull } from 'typeorm';
import { ProgressService } from './progress.service';
import { Progress } from './progress.entity';
import { StellarService } from '../stellar/stellar.service';
import { CredentialsService } from '../credentials/credentials.service';
import { UsersService } from '../users/users.service';
import { RecordProgressDto } from './dto/record-progress.dto';

describe('ProgressService', () => {
  let service: ProgressService;

  const mockRepo = {
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
        { provide: getRepositoryToken(Progress), useValue: mockRepo },
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

  describe('record', () => {
    const userId = 'user-1';
    const stellarKey = 'GSTELLAR123';
    const dto: RecordProgressDto = { courseId: 'course-1', progressPct: 50 };

    it('creates a new progress record when none exists', async () => {
      const newProgress = { userId, courseId: dto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 50, txHash: 'tx123' } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.record(userId, dto, stellarKey);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId, courseId: dto.courseId } });
      expect(mockRepo.create).toHaveBeenCalledWith({ userId, courseId: dto.courseId });
      expect(mockStellarService.recordProgress).toHaveBeenCalledWith(stellarKey, dto.courseId, dto.progressPct);
      expect(result).toEqual(saved);
    });

    it('updates an existing progress record', async () => {
      const existing = { id: 'p1', userId, courseId: dto.courseId, progressPct: 20 } as Progress;
      const saved = { ...existing, progressPct: 50 } as Progress;

      mockRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.record(userId, dto, stellarKey);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(saved);
    });

    it('stores progress off-chain when on-chain call fails (non-fatal)', async () => {
      const newProgress = { userId, courseId: dto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 50 } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockRejectedValue(new Error('network error'));
      mockRepo.save.mockResolvedValue(saved);

      // Should not throw even if stellar call fails
      const result = await service.record(userId, dto, stellarKey);

      expect(result).toEqual(saved);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('sets completedAt and issues credential at 100%', async () => {
      const completionDto: RecordProgressDto = { courseId: 'course-1', progressPct: 100 };
      const newProgress = { userId, courseId: completionDto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 100, completedAt: expect.any(Date) } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);
      mockRepo.count.mockResolvedValue(5); // not first completion
      mockCredentialsService.issue.mockResolvedValue(undefined);

      await service.record(userId, completionDto, stellarKey);

      expect(mockCredentialsService.issue).toHaveBeenCalledWith(userId, completionDto.courseId, stellarKey);
      expect(newProgress.completedAt).toBeInstanceOf(Date);
    });

    it('mints referral reward on first course completion', async () => {
      const completionDto: RecordProgressDto = { courseId: 'course-1', progressPct: 100 };
      const newProgress = { userId, courseId: completionDto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 100 } as Progress;
      const referrerId = 'ref-1';
      const referrerKey = 'GREFERRER456';

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);
      mockRepo.count.mockResolvedValue(1); // first completion
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId }) // the user
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: referrerKey }); // the referrer
      mockStellarService.mintReward.mockResolvedValue(undefined);

      await service.record(userId, completionDto, stellarKey);

      expect(mockRepo.count).toHaveBeenCalledWith({ where: { userId, completedAt: Not(IsNull()) } });
      expect(mockStellarService.mintReward).toHaveBeenCalledWith(referrerKey, 50);
    });

    it('skips referral mint when user has no referrer', async () => {
      const completionDto: RecordProgressDto = { courseId: 'course-1', progressPct: 100 };
      const newProgress = { userId, courseId: completionDto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 100 } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);
      mockRepo.count.mockResolvedValue(1);
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue({ id: userId, referredBy: null });

      await service.record(userId, completionDto, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('skips referral mint when referrer has no stellar key', async () => {
      const completionDto: RecordProgressDto = { courseId: 'course-1', progressPct: 100 };
      const newProgress = { userId, courseId: completionDto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 100 } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);
      mockRepo.count.mockResolvedValue(1);
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: 'ref-1' })
        .mockResolvedValueOnce({ id: 'ref-1', stellarPublicKey: null }); // no key

      await service.record(userId, completionDto, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('does not issue credential below 100%', async () => {
      const partialDto: RecordProgressDto = { courseId: 'course-1', progressPct: 99 };
      const newProgress = { userId, courseId: partialDto.courseId } as Progress;
      const saved = { ...newProgress, progressPct: 99 } as Progress;

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newProgress);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);

      await service.record(userId, partialDto, stellarKey);

      expect(mockCredentialsService.issue).not.toHaveBeenCalled();
      expect(mockRepo.count).not.toHaveBeenCalled();
    });

    it('updates lessonId when provided in dto', async () => {
      const dtoWithLesson: RecordProgressDto = { courseId: 'course-1', progressPct: 30, lessonId: 'lesson-5' };
      const existing = { id: 'p1', userId, courseId: dtoWithLesson.courseId, progressPct: 20, lessonId: 'lesson-1' } as Progress;
      const saved = { ...existing, progressPct: 30, lessonId: 'lesson-5' } as Progress;

      mockRepo.findOne.mockResolvedValue(existing);
      mockStellarService.recordProgress.mockResolvedValue('tx123');
      mockRepo.save.mockResolvedValue(saved);

      await service.record(userId, dtoWithLesson, stellarKey);

      expect(existing.lessonId).toBe('lesson-5');
    });
  });

  describe('findByCourse', () => {
    it('returns progress when found', async () => {
      const progress = { id: 'p1', userId: 'u1', courseId: 'c1' } as Progress;
      mockRepo.findOne.mockResolvedValue(progress);

      const result = await service.findByCourse('u1', 'c1');

      expect(result).toEqual(progress);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1', courseId: 'c1' } });
    });

    it('throws NotFoundException when progress not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findByCourse('u1', 'missing-course')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('returns all progress records for a user ordered by updatedAt DESC', async () => {
      const records = [
        { id: 'p1', userId: 'u1', courseId: 'c1' } as Progress,
        { id: 'p2', userId: 'u1', courseId: 'c2' } as Progress,
      ];
      mockRepo.find.mockResolvedValue(records);

      const result = await service.findByUser('u1');

      expect(result).toEqual(records);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        order: { updatedAt: 'DESC' },
      });
    });

    it('returns empty array when user has no progress', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findByUser('u1');

      expect(result).toEqual([]);
    });
  });
});
