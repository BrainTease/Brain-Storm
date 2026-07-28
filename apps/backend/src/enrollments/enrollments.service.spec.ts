import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './enrollment.entity';
import { PrerequisitesService } from '../courses/prerequisites.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockPrereqService = {
    enforcePrerequisites: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: getRepositoryToken(Enrollment), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrerequisitesService, useValue: mockPrereqService },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    const userId = 'user-1';
    const courseId = 'course-1';

    it('creates a new enrollment on the happy path', async () => {
      const created = { id: 'enr-1', userId, courseId, enrolledAt: new Date() } as Enrollment;

      mockRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.enroll(userId, courseId);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId, courseId } });
      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(userId, courseId, false);
      expect(mockRepo.create).toHaveBeenCalledWith({ userId, courseId });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('emits enrollment.created event on successful enroll', async () => {
      const created = { id: 'enr-1', userId, courseId, enrolledAt: new Date() } as Enrollment;

      mockRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      await service.enroll(userId, courseId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: created.id,
        userId,
        courseId,
        enrolledAt: created.enrolledAt,
      });
    });

    it('throws ConflictException when already enrolled', async () => {
      const existing = { id: 'enr-1', userId, courseId } as Enrollment;
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(service.enroll(userId, courseId)).rejects.toThrow(ConflictException);
      expect(mockPrereqService.enforcePrerequisites).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('passes adminOverride flag to prerequisites check', async () => {
      const created = { id: 'enr-1', userId, courseId, enrolledAt: new Date() } as Enrollment;

      mockRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      await service.enroll(userId, courseId, true);

      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(userId, courseId, true);
    });
  });

  describe('unenroll', () => {
    it('removes enrollment when found', async () => {
      const enrollment = { id: 'enr-1', userId: 'u1', courseId: 'c1' } as Enrollment;
      mockRepo.findOne.mockResolvedValue(enrollment);
      mockRepo.remove.mockResolvedValue(enrollment);

      await service.unenroll('u1', 'c1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1', courseId: 'c1' } });
      expect(mockRepo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('throws NotFoundException when enrollment not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.unenroll('u1', 'missing-course')).rejects.toThrow(NotFoundException);
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns enrollment with relations when found', async () => {
      const enrollment = {
        id: 'enr-1',
        userId: 'u1',
        courseId: 'c1',
        user: { id: 'u1' },
        course: { id: 'c1' },
      } as unknown as Enrollment;

      mockRepo.findOne.mockResolvedValue(enrollment);

      const result = await service.findById('enr-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'enr-1' },
        relations: ['user', 'course'],
      });
      expect(result).toEqual(enrollment);
    });

    it('throws NotFoundException when enrollment id not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteById', () => {
    it('removes enrollment found by id', async () => {
      const enrollment = { id: 'enr-1', userId: 'u1', courseId: 'c1' } as Enrollment;
      // findById is called internally, which calls repo.findOne with relations
      mockRepo.findOne.mockResolvedValue(enrollment);
      mockRepo.remove.mockResolvedValue(enrollment);

      await service.deleteById('enr-1');

      expect(mockRepo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('throws NotFoundException when id does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('returns all enrollments for user ordered by enrolledAt DESC', async () => {
      const enrollments = [
        { id: 'enr-1', userId: 'u1', course: {} } as Enrollment,
        { id: 'enr-2', userId: 'u1', course: {} } as Enrollment,
      ];
      mockRepo.find.mockResolvedValue(enrollments);

      const result = await service.findByUser('u1');

      expect(result).toEqual(enrollments);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        relations: ['course'],
        order: { enrolledAt: 'DESC' },
      });
    });

    it('returns empty array when user has no enrollments', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findByUser('u1');
      expect(result).toEqual([]);
    });
  });
});
