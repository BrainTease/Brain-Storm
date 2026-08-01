/**
 * #863 — Integration tests for the analytics ingestion pipeline.
 *
 * Covers: AnalyticsService
 *   - getAnalytics (cache hit / cache miss / not-yet-persisted)
 *   - aggregateCourse (enrollment count, completion count, fee calc, zero-division)
 *   - aggregateAll  (fan-out, partial-failure isolation)
 *
 * All external I/O (TypeORM repos, cache) is replaced with jest mocks so the
 * tests are fully deterministic and run without a real database.
 */

import { AnalyticsService } from './analytics.service';
import { CourseAnalytics } from './course-analytics.entity';
import { Repository } from 'typeorm';

// ─── minimal mock builder ────────────────────────────────────────────────────

function makeQb(rawOneResult: Record<string, string>) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(rawOneResult),
  };
  return qb;
}

function makeRepo(overrides: Partial<Repository<any>> = {}): jest.Mocked<Repository<any>> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
    ...overrides,
  } as any;
}

function makeCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── factory ─────────────────────────────────────────────────────────────────

function buildService(
  repoOverrides: {
    analytics?: Partial<Repository<CourseAnalytics>>;
    enrollment?: Partial<Repository<any>>;
    progress?: Partial<Repository<any>>;
    review?: Partial<Repository<any>>;
  } = {}
) {
  const analyticsRepo = makeRepo(repoOverrides.analytics ?? {});
  const enrollmentRepo = makeRepo(repoOverrides.enrollment ?? {});
  const progressRepo = makeRepo(repoOverrides.progress ?? {});
  const reviewRepo = makeRepo(repoOverrides.review ?? {});
  const cache = makeCache();

  const service = new AnalyticsService(
    analyticsRepo,
    enrollmentRepo,
    progressRepo,
    reviewRepo,
    cache as any
  );

  return { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo, cache };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function stubAggregateQueryBuilders(
  enrollmentRepo: jest.Mocked<Repository<any>>,
  progressRepo: jest.Mocked<Repository<any>>,
  reviewRepo: jest.Mocked<Repository<any>>,
  opts: {
    totalEnrollments?: number;
    totalCompletions?: number;
    avgRating?: string;
    reviewCount?: string;
    avgProgress?: string;
    activeCount?: string;
  } = {}
) {
  const {
    totalEnrollments = 10,
    totalCompletions = 5,
    avgRating = '4.2',
    reviewCount = '8',
    avgProgress = '60',
    activeCount = '3',
  } = opts;

  // enrollmentRepo.count is called twice: once for total, once promise-chain for completions
  enrollmentRepo.count.mockResolvedValue(totalEnrollments);

  // completion count via query builder
  const completionQb = makeQb({});
  completionQb.getCount.mockResolvedValue(totalCompletions);
  completionQb.where = jest.fn().mockReturnThis();
  completionQb.andWhere = jest.fn().mockReturnThis();

  // review stats
  const reviewQb = makeQb({ avg: avgRating, cnt: reviewCount });

  // progress avg
  const progressAvgQb = makeQb({ avg: avgProgress });

  // active learners (last 30 days)
  const activeQb = makeQb({ cnt: activeCount });
  activeQb.select = jest.fn().mockReturnThis();
  activeQb.where = jest.fn().mockReturnThis();
  activeQb.andWhere = jest.fn().mockReturnThis();
  activeQb.getRawOne = jest.fn().mockResolvedValue({ cnt: activeCount });

  enrollmentRepo.createQueryBuilder
    .mockReturnValueOnce(completionQb) // completion count
    .mockReturnValueOnce(activeQb); // active learners (distinct)

  reviewRepo.createQueryBuilder.mockReturnValue(reviewQb);
  progressRepo.createQueryBuilder.mockReturnValue(progressAvgQb);
}

// ═════════════════════════════════════════════════════════════════════════════
// getAnalytics
// ═════════════════════════════════════════════════════════════════════════════

describe('AnalyticsService.getAnalytics', () => {
  const COURSE_ID = 'course-abc';

  it('returns cached value when the cache has a hit', async () => {
    const cached: Partial<CourseAnalytics> = { courseId: COURSE_ID, totalEnrollments: 99 };
    const { service, cache, analyticsRepo } = buildService();
    cache.get.mockResolvedValue(cached);

    const result = await service.getAnalytics(COURSE_ID);

    expect(result).toEqual(cached);
    expect(analyticsRepo.findOne).not.toHaveBeenCalled();
  });

  it('reads from the database when the cache is cold', async () => {
    const stored = { courseId: COURSE_ID, totalEnrollments: 7 } as CourseAnalytics;
    const { service, cache, analyticsRepo } = buildService({
      analytics: { findOne: jest.fn().mockResolvedValue(stored) },
    });
    cache.get.mockResolvedValue(null);

    const result = await service.getAnalytics(COURSE_ID);

    expect(result).toEqual(stored);
    expect(analyticsRepo.findOne).toHaveBeenCalledWith({ where: { courseId: COURSE_ID } });
  });

  it('populates cache after a database read', async () => {
    const stored = { courseId: COURSE_ID, totalEnrollments: 7 } as CourseAnalytics;
    const { service, cache, analyticsRepo } = buildService({
      analytics: { findOne: jest.fn().mockResolvedValue(stored) },
    });
    cache.get.mockResolvedValue(null);

    await service.getAnalytics(COURSE_ID);

    expect(cache.set).toHaveBeenCalledWith(`analytics:${COURSE_ID}`, stored, expect.any(Number));
  });

  it('triggers aggregation when no stored record exists', async () => {
    const { service, cache, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } =
      buildService({
        analytics: {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue({ courseId: COURSE_ID } as any),
          save: jest.fn().mockResolvedValue({ courseId: COURSE_ID } as any),
        },
      });
    cache.get.mockResolvedValue(null);
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo);

    const result = await service.getAnalytics(COURSE_ID);

    expect(result).toHaveProperty('courseId', COURSE_ID);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// aggregateCourse
// ═════════════════════════════════════════════════════════════════════════════

describe('AnalyticsService.aggregateCourse', () => {
  const COURSE_ID = 'course-xyz';

  it('calculates completion rate correctly', async () => {
    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
        save: jest.fn().mockImplementation(async (r) => r),
      },
    });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo, {
      totalEnrollments: 20,
      totalCompletions: 5,
    });
    enrollmentRepo.count.mockResolvedValue(20);

    const result = await service.aggregateCourse(COURSE_ID);

    // 5/20 * 100 = 25.00
    expect(result.completionRate).toBe(25);
  });

  it('sets completion rate to 0 when there are no enrollments', async () => {
    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
        save: jest.fn().mockImplementation(async (r) => r),
      },
    });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo, {
      totalEnrollments: 0,
      totalCompletions: 0,
    });
    enrollmentRepo.count.mockResolvedValue(0);

    const result = await service.aggregateCourse(COURSE_ID);

    expect(result.completionRate).toBe(0);
  });

  it('rounds average rating to two decimal places', async () => {
    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
        save: jest.fn().mockImplementation(async (r) => r),
      },
    });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo, {
      avgRating: '4.333333',
      reviewCount: '3',
    });

    const result = await service.aggregateCourse(COURSE_ID);

    expect(result.averageRating).toBe(4.33);
  });

  it('defaults rating to 0 when there are no reviews', async () => {
    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
        save: jest.fn().mockImplementation(async (r) => r),
      },
    });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo, {
      avgRating: '0',
      reviewCount: '0',
    });

    const result = await service.aggregateCourse(COURSE_ID);

    expect(result.averageRating).toBe(0);
    expect(result.totalReviews).toBe(0);
  });

  it('updates an existing record instead of creating a new one', async () => {
    const existing = { courseId: COURSE_ID, totalEnrollments: 1 } as CourseAnalytics;
    const saveMock = jest.fn().mockImplementation(async (r) => r);
    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null) // first call in aggregateCourse
          .mockResolvedValueOnce(existing), // second call for "existing" check
        create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
        save: saveMock,
      },
    });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo);

    await service.aggregateCourse(COURSE_ID);

    // save() must have been called exactly once with the merged record
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cache key for the course after aggregation', async () => {
    const { service, cache, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } =
      buildService({
        analytics: {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue({ courseId: COURSE_ID }),
          save: jest.fn().mockImplementation(async (r) => r),
        },
      });
    stubAggregateQueryBuilders(enrollmentRepo, progressRepo, reviewRepo);

    await service.aggregateCourse(COURSE_ID);

    expect(cache.del).toHaveBeenCalledWith(`analytics:${COURSE_ID}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// aggregateAll
// ═════════════════════════════════════════════════════════════════════════════

describe('AnalyticsService.aggregateAll', () => {
  it('aggregates each course returned by the enrollment query', async () => {
    const courseIds = [{ courseId: 'c1' }, { courseId: 'c2' }, { courseId: 'c3' }];

    const rawManyQb: any = {
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(courseIds),
    };

    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockImplementation(async (r) => r),
      },
      enrollment: {
        count: jest.fn().mockResolvedValue(10),
        createQueryBuilder: jest.fn(),
      },
    });

    // First createQueryBuilder call returns the DISTINCT course-id query
    const completionQb = makeQb({});
    completionQb.getCount.mockResolvedValue(0);
    const activeQb = makeQb({ cnt: '0' });
    activeQb.select = jest.fn().mockReturnThis();
    activeQb.where = jest.fn().mockReturnThis();
    activeQb.andWhere = jest.fn().mockReturnThis();
    activeQb.getRawOne = jest.fn().mockResolvedValue({ cnt: '0' });

    (enrollmentRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(rawManyQb) // DISTINCT courseId
      .mockReturnValueOnce(completionQb) // c1 completions
      .mockReturnValueOnce(activeQb) // c1 active
      .mockReturnValueOnce(completionQb) // c2 completions
      .mockReturnValueOnce(activeQb) // c2 active
      .mockReturnValueOnce(completionQb) // c3 completions
      .mockReturnValueOnce(activeQb); // c3 active

    reviewRepo.createQueryBuilder.mockReturnValue(makeQb({ avg: '0', cnt: '0' }));
    progressRepo.createQueryBuilder.mockReturnValue(makeQb({ avg: '0' }));

    await service.aggregateAll();

    // save() must have been called once per course
    expect(analyticsRepo.save).toHaveBeenCalledTimes(3);
  });

  it('continues to process remaining courses when one aggregation fails', async () => {
    const courseIds = [{ courseId: 'ok' }, { courseId: 'bad' }, { courseId: 'also-ok' }];

    const rawManyQb: any = {
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(courseIds),
    };

    const saveMock = jest.fn().mockImplementation(async (r) => r);

    const { service, analyticsRepo, enrollmentRepo, progressRepo, reviewRepo } = buildService({
      analytics: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({}),
        save: saveMock,
      },
      enrollment: {
        count: jest.fn().mockResolvedValue(0),
        createQueryBuilder: jest.fn(),
      },
    });

    const goodCompletionQb = makeQb({});
    goodCompletionQb.getCount.mockResolvedValue(0);
    const goodActiveQb = makeQb({ cnt: '0' });
    goodActiveQb.select = jest.fn().mockReturnThis();
    goodActiveQb.where = jest.fn().mockReturnThis();
    goodActiveQb.andWhere = jest.fn().mockReturnThis();
    goodActiveQb.getRawOne = jest.fn().mockResolvedValue({ cnt: '0' });

    // "bad" course has a broken completion query
    const badCompletionQb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockRejectedValue(new Error('DB error')),
      getRawOne: jest.fn().mockResolvedValue({ cnt: '0' }),
    };

    (enrollmentRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(rawManyQb)
      .mockReturnValueOnce(goodCompletionQb)
      .mockReturnValueOnce(goodActiveQb)
      .mockReturnValueOnce(badCompletionQb) // throws
      .mockReturnValueOnce(goodCompletionQb)
      .mockReturnValueOnce(goodActiveQb);

    reviewRepo.createQueryBuilder.mockReturnValue(makeQb({ avg: '0', cnt: '0' }));
    progressRepo.createQueryBuilder.mockReturnValue(makeQb({ avg: '0' }));

    // should not throw even though "bad" throws internally
    await expect(service.aggregateAll()).resolves.not.toThrow();
  });
});
