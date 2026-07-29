import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './enrollment.entity';
import { PrerequisitesService } from '../courses/prerequisites.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const mockEnrollmentRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
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
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrerequisitesService, useValue: mockPrereqService },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // enroll
  // ---------------------------------------------------------------------------

  describe('enroll', () => {
    const userId = 'user-1';
    const courseId = 'course-1';

    it('should successfully enroll when no existing enrollment exists', async () => {
      const enrollment = { id: 'enroll-1', userId, courseId, enrolledAt: new Date() } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentRepo.create.mockReturnValue(enrollment);
      mockEnrollmentRepo.save.mockResolvedValue(enrollment);

      const result = await service.enroll(userId, courseId);

      expect(result).toBe(enrollment);
      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(userId, courseId, false);
      expect(mockEnrollmentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should emit enrollment.created event after successful enrollment', async () => {
      const enrolledAt = new Date();
      const enrollment = { id: 'enroll-2', userId, courseId, enrolledAt } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentRepo.create.mockReturnValue(enrollment);
      mockEnrollmentRepo.save.mockResolvedValue(enrollment);

      await service.enroll(userId, courseId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: enrollment.id,
        userId,
        courseId,
        enrolledAt,
      });
    });

    it('should throw ConflictException if user is already enrolled', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.enroll(userId, courseId)).rejects.toThrow(ConflictException);
      await expect(service.enroll(userId, courseId)).rejects.toThrow('Already enrolled in this course');
      expect(mockPrereqService.enforcePrerequisites).not.toHaveBeenCalled();
    });

    it('should pass adminOverride=true to prerequisites check', async () => {
      const enrollment = { id: 'enroll-3', userId, courseId, enrolledAt: new Date() } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentRepo.create.mockReturnValue(enrollment);
      mockEnrollmentRepo.save.mockResolvedValue(enrollment);

      await service.enroll(userId, courseId, true);

      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(userId, courseId, true);
    });

    it('should propagate error when prerequisites check fails', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockRejectedValue(
        new Error('Prerequisites not met'),
      );

      await expect(service.enroll(userId, courseId)).rejects.toThrow('Prerequisites not met');
      expect(mockEnrollmentRepo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // unenroll
  // ---------------------------------------------------------------------------

  describe('unenroll', () => {
    const userId = 'user-1';
    const courseId = 'course-1';

    it('should remove enrollment when it exists', async () => {
      const enrollment = { id: 'enroll-1', userId, courseId } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);
      mockEnrollmentRepo.remove.mockResolvedValue(undefined);

      await service.unenroll(userId, courseId);

      expect(mockEnrollmentRepo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(service.unenroll(userId, courseId)).rejects.toThrow(NotFoundException);
      await expect(service.unenroll(userId, courseId)).rejects.toThrow('Enrollment not found');
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('should return enrollment with relations when found', async () => {
      const enrollment = { id: 'enroll-1', userId: 'u1', courseId: 'c1' } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);

      const result = await service.findById('enroll-1');

      expect(result).toBe(enrollment);
      expect(mockEnrollmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'enroll-1' },
        relations: ['user', 'course'],
      });
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('missing-id')).rejects.toThrow('Enrollment not found');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteById
  // ---------------------------------------------------------------------------

  describe('deleteById', () => {
    it('should find and remove enrollment by id', async () => {
      const enrollment = { id: 'enroll-1', userId: 'u1', courseId: 'c1' } as Enrollment;

      mockEnrollmentRepo.findOne.mockResolvedValue(enrollment);
      mockEnrollmentRepo.remove.mockResolvedValue(undefined);

      await service.deleteById('enroll-1');

      expect(mockEnrollmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'enroll-1' },
        relations: ['user', 'course'],
      });
      expect(mockEnrollmentRepo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('should throw NotFoundException when enrollment does not exist', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteById('no-such-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------

  describe('findByUser', () => {
    it('should return all enrollments for a user ordered by enrolledAt DESC', async () => {
      const enrollments: Enrollment[] = [
        { id: '1', userId: 'u1', courseId: 'c1' } as Enrollment,
        { id: '2', userId: 'u1', courseId: 'c2' } as Enrollment,
      ];

      mockEnrollmentRepo.find.mockResolvedValue(enrollments);

      const result = await service.findByUser('u1');

      expect(result).toEqual(enrollments);
      expect(mockEnrollmentRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        relations: ['course'],
        order: { enrolledAt: 'DESC' },
      });
    });

    it('should return empty array when user has no enrollments', async () => {
      mockEnrollmentRepo.find.mockResolvedValue([]);

      const result = await service.findByUser('u2');

      expect(result).toEqual([]);
    });
  });
});
