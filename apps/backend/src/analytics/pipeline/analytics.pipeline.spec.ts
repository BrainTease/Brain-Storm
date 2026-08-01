/**
 * Unit tests for the analytics ingestion pipeline (#821).
 *
 * Covers each discrete stage independently and the orchestrating pipeline.
 *
 * All I/O is replaced with jest mocks — no database or cache required.
 */

import { AggregationStage } from './aggregation.stage';
import { CacheStage } from './cache.stage';
import { PersistenceStage } from './persistence.stage';
import { DataCollectionStage } from './data-collection.stage';
import { AnalyticsPipeline } from './analytics.pipeline';
import { PipelineContext } from './pipeline.types';
import { CourseAnalytics } from '../course-analytics.entity';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return {
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation(async (r: any) => r),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// AggregationStage
// ═════════════════════════════════════════════════════════════════════════════

describe('AggregationStage', () => {
  const stage = new AggregationStage();

  it('calculates completionRate as 0 when there are no enrollments', async () => {
    const ctx: PipelineContext = {
      courseId: 'c1',
      rawData: {
        courseId: 'c1',
        totalEnrollments: 0,
        totalCompletions: 0,
        reviewStats: null,
        progressStats: null,
        activeLearnersLast30Days: null,
      },
    };
    await stage.execute(ctx);
    expect(ctx.metrics!.completionRate).toBe(0);
  });

  it('calculates completionRate correctly', async () => {
    const ctx: PipelineContext = {
      courseId: 'c2',
      rawData: {
        courseId: 'c2',
        totalEnrollments: 20,
        totalCompletions: 5,
        reviewStats: null,
        progressStats: null,
        activeLearnersLast30Days: null,
      },
    };
    await stage.execute(ctx);
    // 5/20 * 100 = 25.00
    expect(ctx.metrics!.completionRate).toBe(25);
  });

  it('rounds averageRating to two decimal places', async () => {
    const ctx: PipelineContext = {
      courseId: 'c3',
      rawData: {
        courseId: 'c3',
        totalEnrollments: 10,
        totalCompletions: 3,
        reviewStats: { avg: '4.333333', cnt: '3' },
        progressStats: { avg: '55' },
        activeLearnersLast30Days: { cnt: '2' },
      },
    };
    await stage.execute(ctx);
    expect(ctx.metrics!.averageRating).toBe(4.33);
    expect(ctx.metrics!.totalReviews).toBe(3);
  });

  it('defaults to 0 when reviewStats is null', async () => {
    const ctx: PipelineContext = {
      courseId: 'c4',
      rawData: {
        courseId: 'c4',
        totalEnrollments: 5,
        totalCompletions: 0,
        reviewStats: null,
        progressStats: null,
        activeLearnersLast30Days: null,
      },
    };
    await stage.execute(ctx);
    expect(ctx.metrics!.averageRating).toBe(0);
    expect(ctx.metrics!.totalReviews).toBe(0);
    expect(ctx.metrics!.averageProgressPct).toBe(0);
    expect(ctx.metrics!.activeLearnersLast30Days).toBe(0);
  });

  it('throws when rawData is missing', async () => {
    const ctx: PipelineContext = { courseId: 'c5' };
    await expect(stage.execute(ctx)).rejects.toThrow('AggregationStage requires rawData');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PersistenceStage
// ═════════════════════════════════════════════════════════════════════════════

describe('PersistenceStage', () => {
  it('creates a new record when no existing record is found', async () => {
    const analyticsRepo = makeRepo();
    const stage = new PersistenceStage(analyticsRepo as any);

    const ctx: PipelineContext = {
      courseId: 'c10',
      metrics: {
        courseId: 'c10',
        totalEnrollments: 10,
        totalCompletions: 5,
        completionRate: 50,
        averageRating: 4.2,
        totalReviews: 8,
        averageProgressPct: 60,
        activeLearnersLast30Days: 3,
      },
    };

    await stage.execute(ctx);

    expect(analyticsRepo.create).toHaveBeenCalledWith({ courseId: 'c10' });
    expect(analyticsRepo.save).toHaveBeenCalledTimes(1);
    expect(ctx.record).toBeDefined();
  });

  it('updates an existing record instead of creating a new one', async () => {
    const existing = { courseId: 'c11', totalEnrollments: 1 } as CourseAnalytics;
    const saveMock = jest.fn().mockImplementation(async (r: any) => r);
    const analyticsRepo = makeRepo({
      findOne: jest.fn().mockResolvedValue(existing),
      save: saveMock,
    });
    const stage = new PersistenceStage(analyticsRepo as any);

    const ctx: PipelineContext = {
      courseId: 'c11',
      metrics: {
        courseId: 'c11',
        totalEnrollments: 20,
        totalCompletions: 10,
        completionRate: 50,
        averageRating: 4.5,
        totalReviews: 12,
        averageProgressPct: 70,
        activeLearnersLast30Days: 5,
      },
    };

    await stage.execute(ctx);

    // create() must NOT have been called — we're updating an existing record
    expect(analyticsRepo.create).not.toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(ctx.record!.totalEnrollments).toBe(20);
  });

  it('throws when metrics are missing', async () => {
    const analyticsRepo = makeRepo();
    const stage = new PersistenceStage(analyticsRepo as any);
    const ctx: PipelineContext = { courseId: 'c12' };
    await expect(stage.execute(ctx)).rejects.toThrow('PersistenceStage requires metrics');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CacheStage
// ═════════════════════════════════════════════════════════════════════════════

describe('CacheStage', () => {
  it('deletes the cache key for the course', async () => {
    const cache = { del: jest.fn().mockResolvedValue(undefined) };
    const stage = new CacheStage(cache as any);
    const ctx: PipelineContext = { courseId: 'c20' };

    await stage.execute(ctx);

    expect(cache.del).toHaveBeenCalledWith('analytics:c20');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AnalyticsPipeline (orchestrator)
// ═════════════════════════════════════════════════════════════════════════════

describe('AnalyticsPipeline', () => {
  it('runs all four stages in order and returns ctx.record', async () => {
    const order: string[] = [];
    const expectedRecord = { courseId: 'pipeline-test' } as CourseAnalytics;

    const dataCollectionStage = {
      execute: jest.fn().mockImplementation(async (ctx: PipelineContext) => {
        order.push('collection');
        ctx.rawData = {
          courseId: ctx.courseId,
          totalEnrollments: 10,
          totalCompletions: 5,
          reviewStats: { avg: '4', cnt: '8' },
          progressStats: { avg: '60' },
          activeLearnersLast30Days: { cnt: '3' },
        };
      }),
    };

    const aggregationStage = {
      execute: jest.fn().mockImplementation(async (ctx: PipelineContext) => {
        order.push('aggregation');
        ctx.metrics = {
          courseId: ctx.courseId,
          totalEnrollments: 10,
          totalCompletions: 5,
          completionRate: 50,
          averageRating: 4,
          totalReviews: 8,
          averageProgressPct: 60,
          activeLearnersLast30Days: 3,
        };
      }),
    };

    const persistenceStage = {
      execute: jest.fn().mockImplementation(async (ctx: PipelineContext) => {
        order.push('persistence');
        ctx.record = expectedRecord;
      }),
    };

    const cacheStage = {
      execute: jest.fn().mockImplementation(async () => {
        order.push('cache');
      }),
    };

    const pipeline = new AnalyticsPipeline(
      dataCollectionStage as any,
      aggregationStage as any,
      persistenceStage as any,
      cacheStage as any
    );

    const result = await pipeline.run('pipeline-test');

    expect(order).toEqual(['collection', 'aggregation', 'persistence', 'cache']);
    expect(result).toEqual(expectedRecord);
  });

  it('throws when no record is produced after all stages', async () => {
    const noop = { execute: jest.fn().mockResolvedValue(undefined) };
    const pipeline = new AnalyticsPipeline(noop as any, noop as any, noop as any, noop as any);
    await expect(pipeline.run('no-record')).rejects.toThrow(
      'Pipeline did not produce a record for course no-record'
    );
  });
});
