/**
 * Unit tests for EnrollmentsService — migrated to shared fixtures (#1193).
 *
 * Previously used inline `{ id: 'enroll-1', userId, courseId } as Enrollment`
 * constructs.  Now all test data is seeded via EnrollmentFactory and UserFactory
 * from the shared @brain-storm/types/test-utils module so that shape changes in
 * shared types propagate automatically.
 *
 * Note: EnrollmentsService uses ENROLLMENTS_REPOSITORY_TOKEN (repository pattern)
 * not getRepositoryToken(Enrollment).  The mock must satisfy the
 * EnrollmentsRepository interface.
 *
 * Closes #1193.
 */
import { EnrollmentFactory, UserFactory, CourseFactory } from '@brain-storm/types/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './enrollment.entity';
import { PrerequisitesService } from '../courses/prerequisites.service';
import { ENROLLMENTS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

describe('EnrollmentsService — shared fixtures (#1193)', () => {
  let service: EnrollmentsService;

  // EnrollmentsRepository interface mock
  const mockEnrollmentsRepository = {
    findByUserAndCourse: jest.fn(),
    findByUser: jest.fn(),
    findByIdWithRelations: jest.fn(),
    save: jest.fn(),
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
        {
          provide: ENROLLMENTS_REPOSITORY_TOKEN,
          useValue: mockEnrollmentsRepository,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrerequisitesService, useValue: mockPrereqService },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── enroll ─────────────────────────────────────────────────────────────────

  describe('enroll', () => {
    it('successfully enrolls when no existing enrollment exists', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create({ status: 'published' });
      const fixture = EnrollmentFactory.create({
        userId: user.id,
        courseId: course.id,
        status: 'active',
        progress: 0,
      });
      const enrollment = fixture as unknown as Enrollment;

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentsRepository.save.mockResolvedValue(enrollment);

      const result = await service.enroll(user.id, course.id);

      expect(result).toBe(enrollment);
      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(user.id, course.id, false);
      expect(mockEnrollmentsRepository.save).toHaveBeenCalledTimes(1);
    });

    it('emits enrollment.created event after successful enrollment', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const enrolledAt = new Date();
      const fixture = EnrollmentFactory.create({
        userId: user.id,
        courseId: course.id,
        enrolledAt,
      });
      const enrollment = { ...fixture, enrolledAt } as unknown as Enrollment;

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentsRepository.save.mockResolvedValue(enrollment);

      await service.enroll(user.id, course.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: enrollment.id,
        userId: user.id,
        courseId: course.id,
        enrolledAt: (enrollment as any).enrolledAt,
      });
    });

    it('throws ConflictException when user is already enrolled', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();
      const existing = EnrollmentFactory.create({
        userId: user.id,
        courseId: course.id,
      }) as unknown as Enrollment;

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(existing);

      await expect(service.enroll(user.id, course.id)).rejects.toThrow(ConflictException);
      await expect(service.enroll(user.id, course.id)).rejects.toThrow(
        'Already enrolled in this course'
      );
      expect(mockPrereqService.enforcePrerequisites).not.toHaveBeenCalled();
    });

    it('passes adminOverride=true to prerequisites check', async () => {
      const user = UserFactory.create({ role: 'admin' });
      const course = CourseFactory.create();
      const enrollment = EnrollmentFactory.create({
        userId: user.id,
        courseId: course.id,
      }) as unknown as Enrollment;

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockResolvedValue(undefined);
      mockEnrollmentsRepository.save.mockResolvedValue(enrollment);

      await service.enroll(user.id, course.id, true);

      expect(mockPrereqService.enforcePrerequisites).toHaveBeenCalledWith(user.id, course.id, true);
    });

    it('propagates error when prerequisites check fails', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(null);
      mockPrereqService.enforcePrerequisites.mockRejectedValue(
        new Error('Prerequisites not met')
      );

      await expect(service.enroll(user.id, course.id)).rejects.toThrow('Prerequisites not met');
      expect(mockEnrollmentsRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── unenroll ──────────────────────────────────────────────────────────────

  describe('unenroll', () => {
    it('removes enrollment when it exists', async () => {
      const fixture = EnrollmentFactory.create();
      const enrollment = fixture as unknown as Enrollment;

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(enrollment);
      mockEnrollmentsRepository.remove.mockResolvedValue(undefined);

      await service.unenroll(fixture.userId, fixture.courseId);

      expect(mockEnrollmentsRepository.remove).toHaveBeenCalledWith(enrollment);
    });

    it('throws NotFoundException when enrollment not found', async () => {
      const user = UserFactory.create();
      const course = CourseFactory.create();

      mockEnrollmentsRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(service.unenroll(user.id, course.id)).rejects.toThrow(NotFoundException);
      await expect(service.unenroll(user.id, course.id)).rejects.toThrow('Enrollment not found');
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns enrollment when found', async () => {
      const fixture = EnrollmentFactory.create({ progress: 50 });
      const enrollment = fixture as unknown as Enrollment;

      mockEnrollmentsRepository.findByIdWithRelations.mockResolvedValue(enrollment);

      const result = await service.findById(fixture.id);

      expect(result).toBe(enrollment);
      expect(mockEnrollmentsRepository.findByIdWithRelations).toHaveBeenCalledWith(fixture.id);
    });

    it('throws NotFoundException when enrollment not found', async () => {
      mockEnrollmentsRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('missing-id')).rejects.toThrow('Enrollment not found');
    });
  });

  // ── deleteById ────────────────────────────────────────────────────────────

  describe('deleteById', () => {
    it('finds and removes enrollment by id', async () => {
      const fixture = EnrollmentFactory.create({ status: 'active' });
      const enrollment = fixture as unknown as Enrollment;

      mockEnrollmentsRepository.findByIdWithRelations.mockResolvedValue(enrollment);
      mockEnrollmentsRepository.remove.mockResolvedValue(undefined);

      await service.deleteById(fixture.id);

      expect(mockEnrollmentsRepository.findByIdWithRelations).toHaveBeenCalledWith(fixture.id);
      expect(mockEnrollmentsRepository.remove).toHaveBeenCalledWith(enrollment);
    });

    it('throws NotFoundException when enrollment does not exist', async () => {
      mockEnrollmentsRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.deleteById('no-such-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns all enrollments for a user', async () => {
      const user = UserFactory.create({ role: 'student' });
      const courses = CourseFactory.createMany(3);
      const enrollments = courses.map((c) =>
        EnrollmentFactory.create({ userId: user.id, courseId: c.id }) as unknown as Enrollment
      );

      mockEnrollmentsRepository.findByUser.mockResolvedValue(enrollments);

      const result = await service.findByUser(user.id);

      expect(result).toEqual(enrollments);
      expect(mockEnrollmentsRepository.findByUser).toHaveBeenCalledWith(user.id);
    });

    it('returns empty array when user has no enrollments', async () => {
      const user = UserFactory.create();
      mockEnrollmentsRepository.findByUser.mockResolvedValue([]);

      const result = await service.findByUser(user.id);

      expect(result).toEqual([]);
    });
  });

  // ── cross-entity relationship via factories ───────────────────────────────

  describe('cross-entity relationship via factories', () => {
    it('creates consistent userId/courseId across User, Course, and Enrollment', () => {
      const user = UserFactory.create({ role: 'student' });
      const course = CourseFactory.create({ status: 'published' });
      const enrollment = EnrollmentFactory.create({
        userId: user.id,
        courseId: course.id,
        status: 'active',
      });

      expect(enrollment.userId).toBe(user.id);
      expect(enrollment.courseId).toBe(course.id);
      expect(enrollment.status).toBe('active');
    });

    it('createMany produces distinct enrollment IDs', () => {
      const enrollments = EnrollmentFactory.createMany(5);
      const ids = new Set(enrollments.map((e) => e.id));
      expect(ids.size).toBe(5);
    });

    it('completed enrollment has progress 100 and a non-null completedAt', () => {
      const enrollment = EnrollmentFactory.create({
        status: 'completed',
        progress: 100,
        completedAt: new Date('2026-06-01'),
      });

      expect(enrollment.progress).toBe(100);
      expect(enrollment.completedAt).toBeInstanceOf(Date);
    });
  });
});
