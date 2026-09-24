/**
 * Unit tests for IngestionService (#1131).
 *
 * Covers: IngestionService
 *   - collectEnrollmentData
 *   - collectReviewData
 *   - collectProgressData
 *   - collectActiveLearnersData
 *
 * All external I/O (TypeORM repos) is replaced with jest mocks so the
 * tests are fully deterministic and run without a real database.
 */

import { Repository } from 'typeorm';

// IngestionService will be created as part of the refactor
// eslint-disable-next-line import/no-unresolved
import { IngestionService } from './ingestion.service';

function makeQueryBuilder(mockResult: any = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(mockResult),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRepo(
  overrides: Partial<Repository<any>> = {}
): jest.Mocked<Repository<any>> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()),
    ...overrides,
  } as any;
}

describe('IngestionService', () => {
  it('should collect total enrollment count for a course', async () => {
    const enrollmentRepo = makeRepo({
      count: jest.fn().mockResolvedValue(15),
    });

    const service = new IngestionService(enrollmentRepo as any);
    const result = await service.collectEnrollmentData('course-123');

    expect(result.totalEnrollments).toBe(15);
    expect(enrollmentRepo.count).toHaveBeenCalledWith({ where: { courseId: 'course-123' } });
  });

  it('should collect completion count for a course', async () => {
    const qb = makeQueryBuilder();
    qb.getCount = jest.fn().mockResolvedValue(5);

    const enrollmentRepo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    const service = new IngestionService(enrollmentRepo as any);
    const result = await service.collectEnrollmentData('course-123');

    expect(result.totalCompletions).toBe(5);
  });

  it('should handle zero enrollments gracefully', async () => {
    const enrollmentRepo = makeRepo({
      count: jest.fn().mockResolvedValue(0),
    });

    const service = new IngestionService(enrollmentRepo as any);
    const result = await service.collectEnrollmentData('course-456');

    expect(result.totalEnrollments).toBe(0);
    expect(result.totalCompletions).toBe(0);
  });

  it('should collect review statistics (average rating and count)', async () => {
    const qb = makeQueryBuilder({ avg: '4.2', cnt: '8' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewRepo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new IngestionService(makeRepo() as any, reviewRepo as any);
    const result = await service.collectReviewData('course-789');

    expect(result.reviewStats).toEqual({ avg: '4.2', cnt: '8' });
  });

  it('should default review stats to null when no reviews exist', async () => {
    const qb = makeQueryBuilder(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewRepo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new IngestionService(makeRepo() as any, reviewRepo as any);
    const result = await service.collectReviewData('course-001');

    expect(result.reviewStats).toBeNull();
  });

  it('should collect progress statistics (average progress %)', async () => {
    const qb = makeQueryBuilder({ avg: '65.5' });
    const progressRepo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new IngestionService(
      makeRepo() as any,
      makeRepo() as any,
      progressRepo as any
    );
    const result = await service.collectProgressData('course-222');

    expect(result.progressStats).toEqual({ avg: '65.5' });
  });

  it('should collect active learners count from last 30 days', async () => {
    const qb = makeQueryBuilder({ cnt: '12' });
    const enrollmentRepo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    const service = new IngestionService(enrollmentRepo as any);
    const result = await service.collectActiveLearnersData('course-333');

    expect(result.activeLearnersLast30Days).toEqual({ cnt: '12' });
  });

  it('should handle database errors gracefully', async () => {
    const enrollmentRepo = makeRepo({
      count: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    });

    const service = new IngestionService(enrollmentRepo as any);

    await expect(service.collectEnrollmentData('course-999')).rejects.toThrow(
      'DB connection failed'
    );
  });
});
