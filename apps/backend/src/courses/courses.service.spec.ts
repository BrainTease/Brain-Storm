import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Course, CourseStatus } from './course.entity';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockCacheManager = {
    wrap: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  const mockSearchService = {
    indexCourse: jest.fn().mockResolvedValue(undefined),
    deleteFromIndex: jest.fn().mockResolvedValue(undefined),
  };

  const courses: Course[] = [
    { id: '1', title: 'Intro to Stellar', isPublished: true, isDeleted: false } as Course,
    { id: '2', title: 'Advanced Soroban', isPublished: true, isDeleted: false } as Course,
  ];

  /** Mock of the CoursesRepository DAO (#976) — the service no longer talks to TypeORM directly. */
  let mockCoursesRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoursesRepository = {
      findAll: jest.fn().mockResolvedValue({ data: courses, total: 2, page: 1, limit: 20 }),
      findById: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    // Simulate cache miss: delegate to the factory function directly
    mockCacheManager.wrap.mockImplementation((_key: string, factory: () => Promise<unknown>) =>
      factory()
    );

    service = new CoursesService(
      mockCoursesRepository,
      mockCacheManager as unknown as any,
      mockSearchService as unknown as any
    );
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  it('findAll should return a PaginatedResponseDto wrapping the courses', async () => {
    const result = await service.findAll({});

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toEqual(courses);
    expect(result.statusCode).toBe(200);
    expect(result.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('findAll should forward search and level query params to the repository', async () => {
    await service.findAll({ search: 'stellar', level: 'beginner' });

    expect(mockCoursesRepository.findAll).toHaveBeenCalledWith({
      search: 'stellar',
      level: 'beginner',
    });
  });

  it('findAll should use default page=1 and limit=20 when not provided', async () => {
    const result = await service.findAll();

    expect(result.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  it('findOne should return a course when found', async () => {
    const course = { id: '1', title: 'A', isDeleted: false } as Course;
    mockCoursesRepository.findById.mockResolvedValue(course);

    const result = await service.findOne('1');

    expect(mockCoursesRepository.findById).toHaveBeenCalledWith('1');
    expect(result).toBe(course);
  });

  it('findOne should throw NotFoundException when course is missing', async () => {
    mockCoursesRepository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    await expect(service.findOne('missing')).rejects.toThrow('Course not found');
  });

  // ── create ─────────────────────────────────────────────────────────────────

  it('create should persist and index the new course', async () => {
    const payload: Partial<Course> = { title: 'New Course' };
    const persisted = { id: 'new', title: 'New Course' } as Course;
    mockCoursesRepository.save.mockResolvedValue(persisted);

    const result = await service.create(payload);

    expect(mockCoursesRepository.save).toHaveBeenCalledWith(payload);
    expect(mockSearchService.indexCourse).toHaveBeenCalledWith(persisted);
    expect(result).toBe(persisted);
  });

  it('create should invalidate the cache', async () => {
    mockCoursesRepository.save.mockResolvedValue({ id: 'new' } as Course);

    await service.create({ title: 'New Course' });

    expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
  });

  it('create should not throw if search indexing fails', async () => {
    const persisted = { id: 'new', title: 'New Course' } as Course;
    mockCoursesRepository.save.mockResolvedValue(persisted);
    mockSearchService.indexCourse.mockRejectedValueOnce(new Error('Search unavailable'));

    await expect(service.create({ title: 'New Course' })).resolves.toBe(persisted);
  });

  // ── update ─────────────────────────────────────────────────────────────────

  it('update should merge data and persist the updated course', async () => {
    const existing = { id: '1', title: 'Old Title', isDeleted: false } as Course;
    const updated = { id: '1', title: 'New Title', isDeleted: false } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockResolvedValue(updated);

    const result = await service.update('1', { title: 'New Title' });

    expect(mockCoursesRepository.save).toHaveBeenCalledWith({ ...existing, title: 'New Title' });
    expect(mockSearchService.indexCourse).toHaveBeenCalledWith(updated);
    expect(result).toBe(updated);
  });

  it('update should throw NotFoundException when the course does not exist', async () => {
    mockCoursesRepository.findById.mockResolvedValue(null);

    await expect(service.update('missing', { title: 'X' })).rejects.toThrow(NotFoundException);
  });

  it('update should invalidate the cache', async () => {
    const existing = { id: '1', title: 'Old' } as Course;
    const updated = { id: '1', title: 'New' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockResolvedValue(updated);

    await service.update('1', { title: 'New' });

    expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
  });

  it('update should not throw if search re-indexing fails', async () => {
    const existing = { id: '1', title: 'Old' } as Course;
    const updated = { id: '1', title: 'New' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockResolvedValue(updated);
    mockSearchService.indexCourse.mockRejectedValueOnce(new Error('Search unavailable'));

    await expect(service.update('1', { title: 'New' })).resolves.toBe(updated);
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  it('delete should remove the course and return it', async () => {
    const existing = { id: '1', title: 'To Delete' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.remove.mockResolvedValue(existing);

    const result = await service.delete('1');

    expect(mockCoursesRepository.remove).toHaveBeenCalledWith(existing);
    expect(result).toBe(existing);
  });

  it('delete should throw NotFoundException when the course does not exist', async () => {
    mockCoursesRepository.findById.mockResolvedValue(null);

    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });

  it('delete should invalidate the cache', async () => {
    const existing = { id: '1', title: 'To Delete' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.remove.mockResolvedValue(existing);

    await service.delete('1');

    expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
  });

  it('delete should remove the course from the search index', async () => {
    const existing = { id: '1', title: 'To Delete' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.remove.mockResolvedValue(existing);

    await service.delete('1');

    expect(mockSearchService.deleteFromIndex).toHaveBeenCalledWith('courses', '1');
  });

  it('delete should not throw if search de-indexing fails', async () => {
    const existing = { id: '1', title: 'To Delete' } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.remove.mockResolvedValue(existing);
    mockSearchService.deleteFromIndex.mockRejectedValueOnce(new Error('Search unavailable'));

    await expect(service.delete('1')).resolves.toBe(existing);
  });

  // ── scheduleCourse ─────────────────────────────────────────────────────────

  it('scheduleCourse should set status to SCHEDULED and persist', async () => {
    const existing = { id: '1', title: 'Course', isPublished: false } as Course;
    const futureDate = new Date(Date.now() + 3_600_000);
    const scheduled = {
      ...existing,
      status: CourseStatus.SCHEDULED,
      scheduledAt: futureDate,
      isPublished: false,
    } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockResolvedValue(scheduled);

    const result = await service.scheduleCourse('1', futureDate);

    expect(mockCoursesRepository.save).toHaveBeenCalledWith({
      ...existing,
      status: CourseStatus.SCHEDULED,
      scheduledAt: futureDate,
      isPublished: false,
    });
    expect(result).toBe(scheduled);
  });

  it('scheduleCourse should throw BadRequestException when scheduledAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 1_000);

    await expect(service.scheduleCourse('1', pastDate)).rejects.toThrow(BadRequestException);
    await expect(service.scheduleCourse('1', pastDate)).rejects.toThrow(
      'scheduledAt must be in the future'
    );
  });

  it('scheduleCourse should throw BadRequestException when scheduledAt is now (equal to current time)', async () => {
    // A date equal to or before now() should be rejected
    const now = new Date(Date.now() - 1);

    await expect(service.scheduleCourse('1', now)).rejects.toThrow(BadRequestException);
  });

  it('scheduleCourse should throw NotFoundException when the course does not exist', async () => {
    mockCoursesRepository.findById.mockResolvedValue(null);
    const futureDate = new Date(Date.now() + 3_600_000);

    await expect(service.scheduleCourse('missing', futureDate)).rejects.toThrow(NotFoundException);
  });

  it('scheduleCourse should not call repository.save when scheduledAt is invalid', async () => {
    const pastDate = new Date(Date.now() - 1_000);

    await expect(service.scheduleCourse('1', pastDate)).rejects.toThrow(BadRequestException);
    expect(mockCoursesRepository.save).not.toHaveBeenCalled();
  });

  // ── publishNow ─────────────────────────────────────────────────────────────

  it('publishNow should set status to PUBLISHED and isPublished to true', async () => {
    const existing = {
      id: '1',
      title: 'Course',
      isPublished: false,
      status: CourseStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 3_600_000),
    } as Course;
    const published = { ...existing, status: CourseStatus.PUBLISHED, isPublished: true } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockResolvedValue(published);

    const result = await service.publishNow('1');

    expect(mockCoursesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ...existing,
        status: CourseStatus.PUBLISHED,
        isPublished: true,
      })
    );
    expect(result).toBe(published);
  });

  it('publishNow should set publishedAt to approximately now', async () => {
    const existing = {
      id: '1',
      title: 'Course',
      isPublished: false,
      status: CourseStatus.DRAFT,
      scheduledAt: null,
    } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockImplementation((data: Partial<Course>) =>
      Promise.resolve(data as Course)
    );

    const before = Date.now();
    await service.publishNow('1');
    const after = Date.now();

    const saveArg = mockCoursesRepository.save.mock.calls[0][0];
    expect(saveArg.publishedAt).toBeInstanceOf(Date);
    expect(saveArg.publishedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(saveArg.publishedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('publishNow should preserve existing scheduledAt when present', async () => {
    const scheduledDate = new Date(Date.now() + 3_600_000);
    const existing = {
      id: '1',
      title: 'Course',
      isPublished: false,
      status: CourseStatus.SCHEDULED,
      scheduledAt: scheduledDate,
    } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockImplementation((data: Partial<Course>) =>
      Promise.resolve(data as Course)
    );

    await service.publishNow('1');

    const saveArg = mockCoursesRepository.save.mock.calls[0][0];
    expect(saveArg.scheduledAt).toBe(scheduledDate);
  });

  it('publishNow should set scheduledAt to null when not previously set', async () => {
    const existing = {
      id: '1',
      title: 'Course',
      isPublished: false,
      status: CourseStatus.DRAFT,
      scheduledAt: undefined,
    } as Course;
    mockCoursesRepository.findById.mockResolvedValue(existing);
    mockCoursesRepository.save.mockImplementation((data: Partial<Course>) =>
      Promise.resolve(data as Course)
    );

    await service.publishNow('1');

    const saveArg = mockCoursesRepository.save.mock.calls[0][0];
    expect(saveArg.scheduledAt).toBeNull();
  });

  it('publishNow should throw NotFoundException when the course does not exist', async () => {
    mockCoursesRepository.findById.mockResolvedValue(null);

    await expect(service.publishNow('missing')).rejects.toThrow(NotFoundException);
  });
});
