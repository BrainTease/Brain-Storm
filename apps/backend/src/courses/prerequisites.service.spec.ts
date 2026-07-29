import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PrerequisitesService } from './prerequisites.service';
import { CoursePrerequisite } from './course-prerequisite.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from './course.entity';

describe('PrerequisitesService', () => {
  let service: PrerequisitesService;

  const mockPrereqRepo = {
    create: jest.fn(), save: jest.fn(), findOne: jest.fn(),
    find: jest.fn(), remove: jest.fn(),
  };
  const mockEnrollmentRepo = { find: jest.fn() };
  const mockCourseRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrerequisitesService,
        { provide: getRepositoryToken(CoursePrerequisite), useValue: mockPrereqRepo },
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
        { provide: getRepositoryToken(Course), useValue: mockCourseRepo },
      ],
    }).compile();
    service = module.get<PrerequisitesService>(PrerequisitesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── addPrerequisite ──────────────────────────────────────────────────────────

  describe('addPrerequisite', () => {
    it('creates prerequisite relationship between two valid courses', async () => {
      mockCourseRepo.findOne
        .mockResolvedValueOnce({ id: 'c1' } as Course)  // course
        .mockResolvedValueOnce({ id: 'c2' } as Course); // prereq
      const record = { courseId: 'c1', prerequisiteId: 'c2' } as CoursePrerequisite;
      mockPrereqRepo.create.mockReturnValue(record);
      mockPrereqRepo.save.mockResolvedValue(record);

      const result = await service.addPrerequisite('c1', 'c2');

      expect(result).toEqual(record);
      expect(mockPrereqRepo.create).toHaveBeenCalledWith({ courseId: 'c1', prerequisiteId: 'c2' });
    });

    it('throws BadRequestException when course is its own prerequisite', async () => {
      await expect(service.addPrerequisite('c1', 'c1')).rejects.toThrow(BadRequestException);
      expect(mockCourseRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the main course does not exist', async () => {
      mockCourseRepo.findOne
        .mockResolvedValueOnce(null)          // course missing
        .mockResolvedValueOnce({ id: 'c2' }); // prereq exists

      await expect(service.addPrerequisite('c1', 'c2')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the prerequisite course does not exist', async () => {
      mockCourseRepo.findOne
        .mockResolvedValueOnce({ id: 'c1' }) // course exists
        .mockResolvedValueOnce(null);         // prereq missing

      await expect(service.addPrerequisite('c1', 'c2')).rejects.toThrow(NotFoundException);
    });
  });

  // ── removePrerequisite ───────────────────────────────────────────────────────

  describe('removePrerequisite', () => {
    it('removes an existing prerequisite record', async () => {
      const record = { courseId: 'c1', prerequisiteId: 'c2' } as CoursePrerequisite;
      mockPrereqRepo.findOne.mockResolvedValue(record);
      mockPrereqRepo.remove.mockResolvedValue(record);

      await service.removePrerequisite('c1', 'c2');

      expect(mockPrereqRepo.remove).toHaveBeenCalledWith(record);
    });

    it('throws NotFoundException when relationship does not exist', async () => {
      mockPrereqRepo.findOne.mockResolvedValue(null);

      await expect(service.removePrerequisite('c1', 'c2')).rejects.toThrow(NotFoundException);
    });
  });

  // ── validatePrerequisites ────────────────────────────────────────────────────

  describe('validatePrerequisites', () => {
    it('returns satisfied:true when adminOverride is true', async () => {
      const result = await service.validatePrerequisites('u1', 'c1', true);
      expect(result).toEqual({ satisfied: true, missing: [] });
      expect(mockPrereqRepo.find).not.toHaveBeenCalled();
    });

    it('returns satisfied:true when course has no prerequisites', async () => {
      mockPrereqRepo.find.mockResolvedValue([]);
      const result = await service.validatePrerequisites('u1', 'c1');
      expect(result).toEqual({ satisfied: true, missing: [] });
    });

    it('returns satisfied:true when all prerequisites are completed', async () => {
      mockPrereqRepo.find.mockResolvedValue([
        { prerequisiteId: 'pre-1' } as CoursePrerequisite,
        { prerequisiteId: 'pre-2' } as CoursePrerequisite,
      ]);
      mockEnrollmentRepo.find.mockResolvedValue([
        { courseId: 'pre-1', completedAt: new Date() } as Enrollment,
        { courseId: 'pre-2', completedAt: new Date() } as Enrollment,
      ]);

      const result = await service.validatePrerequisites('u1', 'c1');

      expect(result).toEqual({ satisfied: true, missing: [] });
    });

    it('returns missing ids when some prerequisites are not completed', async () => {
      mockPrereqRepo.find.mockResolvedValue([
        { prerequisiteId: 'pre-1' } as CoursePrerequisite,
        { prerequisiteId: 'pre-2' } as CoursePrerequisite,
      ]);
      mockEnrollmentRepo.find.mockResolvedValue([
        { courseId: 'pre-1', completedAt: new Date() } as Enrollment,
        { courseId: 'pre-2', completedAt: null } as Enrollment, // not completed
      ]);

      const result = await service.validatePrerequisites('u1', 'c1');

      expect(result.satisfied).toBe(false);
      expect(result.missing).toContain('pre-2');
    });

    it('treats enrollment without completedAt as not completed', async () => {
      mockPrereqRepo.find.mockResolvedValue([
        { prerequisiteId: 'pre-1' } as CoursePrerequisite,
      ]);
      mockEnrollmentRepo.find.mockResolvedValue([
        { courseId: 'pre-1', completedAt: null } as Enrollment,
      ]);

      const result = await service.validatePrerequisites('u1', 'c1');

      expect(result.satisfied).toBe(false);
    });
  });

  // ── enforcePrerequisites ─────────────────────────────────────────────────────

  describe('enforcePrerequisites', () => {
    it('resolves without throwing when all prerequisites are met', async () => {
      mockPrereqRepo.find.mockResolvedValue([]);

      await expect(service.enforcePrerequisites('u1', 'c1')).resolves.toBeUndefined();
    });

    it('throws ForbiddenException listing missing course ids', async () => {
      mockPrereqRepo.find.mockResolvedValue([
        { prerequisiteId: 'pre-x' } as CoursePrerequisite,
      ]);
      mockEnrollmentRepo.find.mockResolvedValue([]);

      await expect(service.enforcePrerequisites('u1', 'c1')).rejects.toThrow(ForbiddenException);
    });

    it('resolves when adminOverride bypasses all checks', async () => {
      await expect(service.enforcePrerequisites('u1', 'c1', true)).resolves.toBeUndefined();
      expect(mockPrereqRepo.find).not.toHaveBeenCalled();
    });
  });
});
