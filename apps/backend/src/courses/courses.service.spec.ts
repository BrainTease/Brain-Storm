import { CoursesService } from './courses.service';
import { Course } from './course.entity';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

/** Minimal Query Builder stub used by CoursesService.queryCourses */
const makeQb = (courses: Course[], total: number) => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getCount: jest.fn().mockResolvedValue(total),
    getMany: jest.fn().mockResolvedValue(courses),
    select: jest.fn().mockReturnThis(),
  };
  // clone() must return a qb that also has getCount
  qb.clone.mockReturnValue({ ...qb, getCount: jest.fn().mockResolvedValue(total) });
  return qb;
};

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

  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb(courses, 2)),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((d) => ({ ...d })),
      remove: jest.fn(),
    };

    // Simulate cache miss: delegate to the factory function directly
    mockCacheManager.wrap.mockImplementation(
      (_key: string, factory: () => Promise<unknown>) => factory(),
    );

    service = new CoursesService(
      mockRepo,
      mockCacheManager as unknown as any,
      mockSearchService as unknown as any,
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

  it('findAll should honour search and level query params', async () => {
    await service.findAll({ search: 'stellar', level: 'beginner' });

    const qb = mockRepo.createQueryBuilder.mock.results[0].value;
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      expect.objectContaining({ search: '%stellar%' }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('level'),
      expect.objectContaining({ level: 'beginner' }),
    );
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  it('findOne should return a course when found', async () => {
    const course = { id: '1', title: 'A', isDeleted: false } as Course;
    mockRepo.findOne.mockResolvedValue(course);
    // Bypass cache for findOne too
    mockCacheManager.wrap.mockImplementation(
      (_key: string, factory: () => Promise<unknown>) => factory(),
    );

    const result = await service.findOne('1');

    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: '1', isDeleted: false } });
    expect(result).toBe(course);
  });

  it('findOne should throw NotFoundException when course is missing', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockCacheManager.wrap.mockImplementation(
      (_key: string, factory: () => Promise<unknown>) => factory(),
    );

    await expect(service.findOne('missing')).rejects.toThrow('Course not found');
  });

  // ── create ─────────────────────────────────────────────────────────────────

  it('create should persist and index the new course', async () => {
    const payload: Partial<Course> = { title: 'New Course' };
    const persisted = { id: 'new', title: 'New Course' } as Course;
    mockRepo.create.mockReturnValue(persisted);
    mockRepo.save.mockResolvedValue(persisted);

    const result = await service.create(payload);

    expect(mockRepo.create).toHaveBeenCalledWith(payload);
    expect(mockRepo.save).toHaveBeenCalledWith(persisted);
    expect(mockSearchService.indexCourse).toHaveBeenCalledWith(persisted);
    expect(result).toBe(persisted);
  });
});
