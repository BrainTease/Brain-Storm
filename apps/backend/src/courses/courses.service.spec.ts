import { CoursesService } from './courses.service';
import { Course } from './course.entity';
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
});
