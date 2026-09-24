/**
 * Unit tests for QueryService (#1131).
 *
 * Covers: QueryService
 *   - getAnalyticsByCourse
 *   - getAnalyticsByInstructor
 *   - getAnalyticsByPlatform
 *   - listRecentAnalytics
 *
 * All I/O operations (TypeORM repository access) are mocked.
 */

import { Repository } from 'typeorm';

import { CourseAnalytics } from './course-analytics.entity';

// QueryService will be created as part of the refactor
// eslint-disable-next-line import/no-unresolved
import { QueryService } from './query.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRepo(
  overrides: Partial<Repository<CourseAnalytics>> = {}
): jest.Mocked<Repository<CourseAnalytics>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as any;
}

describe('QueryService', () => {
  describe('getAnalyticsByCourse', () => {
    it('should retrieve analytics for a specific course', async () => {
      const courseAnalytics = {
        courseId: 'course-123',
        totalEnrollments: 50,
        completionRate: 60,
      } as CourseAnalytics;

      const analyticsRepo = makeRepo({
        findOne: jest.fn().mockResolvedValue(courseAnalytics),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByCourse('course-123');

      expect(result).toEqual(courseAnalytics);
      expect(analyticsRepo.findOne).toHaveBeenCalledWith({
        where: { courseId: 'course-123' },
      });
    });

    it('should return null when course analytics do not exist', async () => {
      const analyticsRepo = makeRepo({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByCourse('non-existent-course');

      expect(result).toBeNull();
    });

    it('should throw on database errors', async () => {
      const analyticsRepo = makeRepo({
        findOne: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const service = new QueryService(analyticsRepo);

      await expect(service.getAnalyticsByCourse('course-999')).rejects.toThrow('DB error');
    });
  });

  describe('getAnalyticsByInstructor', () => {
    it('should retrieve analytics for courses by instructor', async () => {
      const courseAnalytics = [
        {
          courseId: 'course-1',
          instructorId: 'instr-abc',
          totalEnrollments: 30,
        },
        {
          courseId: 'course-2',
          instructorId: 'instr-abc',
          totalEnrollments: 45,
        },
      ] as CourseAnalytics[];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(courseAnalytics),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByInstructor('instr-abc');

      expect(result).toHaveLength(2);
      expect(result).toEqual(courseAnalytics);
    });

    it('should return empty array when instructor has no courses', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByInstructor('no-courses-instr');

      expect(result).toEqual([]);
    });
  });

  describe('getAnalyticsByPlatform', () => {
    it('should aggregate platform-wide analytics', async () => {
      const analyticsRecords = [
        { totalEnrollments: 100, completionRate: 50 },
        { totalEnrollments: 150, completionRate: 60 },
      ] as CourseAnalytics[];

      const analyticsRepo = makeRepo({
        find: jest.fn().mockResolvedValue(analyticsRecords),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByPlatform();

      expect(result).toBeDefined();
      expect(analyticsRepo.find).toHaveBeenCalled();
    });

    it('should handle empty platform analytics', async () => {
      const analyticsRepo = makeRepo({
        find: jest.fn().mockResolvedValue([]),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.getAnalyticsByPlatform();

      expect(result).toBeDefined();
    });
  });

  describe('listRecentAnalytics', () => {
    it('should retrieve recently updated records', async () => {
      const recentAnalytics = [
        { courseId: 'course-1', updatedAt: new Date() },
        { courseId: 'course-2', updatedAt: new Date() },
      ] as CourseAnalytics[];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(recentAnalytics),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.listRecentAnalytics(10);

      expect(result).toHaveLength(2);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should support limiting result count', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      await service.listRecentAnalytics(5);

      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

;

  describe('queryAnalyticsWithFilters', () => {
    it('should filter analytics by completion rate', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { courseId: 'course-1', completionRate: 75 },
        ]),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.queryAnalyticsWithFilters({
        minCompletionRate: 70,
      });

      expect(result).toHaveLength(1);
      expect(result[0].completionRate).toBeGreaterThanOrEqual(70);
    });

    it('should filter by minimum enrollment count', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { courseId: 'course-1', totalEnrollments: 100 },
        ]),
      };

      const analyticsRepo = makeRepo({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const service = new QueryService(analyticsRepo);
      const result = await service.queryAnalyticsWithFilters({
        minEnrollments: 50,
      });

      expect(result).toHaveLength(1);
    });
  });
});
