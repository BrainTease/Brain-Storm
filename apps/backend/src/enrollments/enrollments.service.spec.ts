import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './enrollment.entity';

const mockRepo = () => ({
  findByUserAndCourse: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findByUser: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockEventEmitter = () => ({ emit: jest.fn() });
const mockPrereqService = () => ({ enforcePrerequisites: jest.fn().mockResolvedValue(undefined) });

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let repo: ReturnType<typeof mockRepo>;
  let events: ReturnType<typeof mockEventEmitter>;
  let prereq: ReturnType<typeof mockPrereqService>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = mockRepo();
    events = mockEventEmitter();
    prereq = mockPrereqService();
    service = new EnrollmentsService(repo as any, events as any, prereq as any);
  });

  // ── enroll ─────────────────────────────────────────────────────────────────

  describe('enroll', () => {
    it('should create enrollment and emit event', async () => {
      repo.findByUserAndCourse.mockResolvedValue(null);
      const saved = { id: 'e1', userId: 'u1', courseId: 'c1', enrolledAt: new Date() } as Enrollment;
      repo.save.mockResolvedValue(saved);

      const result = await service.enroll('u1', 'c1');

      expect(repo.findByUserAndCourse).toHaveBeenCalledWith('u1', 'c1');
      expect(prereq.enforcePrerequisites).toHaveBeenCalledWith('u1', 'c1', false);
      expect(repo.save).toHaveBeenCalledWith({ userId: 'u1', courseId: 'c1' });
      expect(events.emit).toHaveBeenCalledWith('enrollment.created', expect.objectContaining({
        enrollmentId: 'e1',
        userId: 'u1',
        courseId: 'c1',
      }));
      expect(result).toBe(saved);
    });

    it('should throw ConflictException if already enrolled', async () => {
      repo.findByUserAndCourse.mockResolvedValue({ id: 'existing' } as Enrollment);

      await expect(service.enroll('u1', 'c1')).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should pass adminOverride=true to prerequisites check', async () => {
      repo.findByUserAndCourse.mockResolvedValue(null);
      repo.save.mockResolvedValue({ id: 'e2', userId: 'u1', courseId: 'c1', enrolledAt: new Date() } as Enrollment);

      await service.enroll('u1', 'c1', true);

      expect(prereq.enforcePrerequisites).toHaveBeenCalledWith('u1', 'c1', true);
    });
  });

  // ── unenroll ───────────────────────────────────────────────────────────────

  describe('unenroll', () => {
    it('should remove enrollment when found', async () => {
      const enrollment = { id: 'e1' } as Enrollment;
      repo.findByUserAndCourse.mockResolvedValue(enrollment);
      repo.remove.mockResolvedValue(enrollment);

      await service.unenroll('u1', 'c1');

      expect(repo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('should throw NotFoundException when enrollment missing', async () => {
      repo.findByUserAndCourse.mockResolvedValue(null);

      await expect(service.unenroll('u1', 'c1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return enrollment with relations', async () => {
      const enrollment = { id: 'e1', user: {}, course: {} } as Enrollment;
      repo.findByIdWithRelations.mockResolvedValue(enrollment);

      const result = await service.findById('e1');

      expect(repo.findByIdWithRelations).toHaveBeenCalledWith('e1');
      expect(result).toBe(enrollment);
    });

    it('should throw NotFoundException when enrollment is not found', async () => {
      repo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByUser ─────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('should return all enrollments for the user', async () => {
      const enrollments = [{ id: 'e1' }, { id: 'e2' }] as Enrollment[];
      repo.findByUser.mockResolvedValue(enrollments);

      const result = await service.findByUser('u1');

      expect(repo.findByUser).toHaveBeenCalledWith('u1');
      expect(result).toBe(enrollments);
    });
  });
});
