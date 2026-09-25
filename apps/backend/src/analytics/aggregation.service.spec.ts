/**
 * Unit tests for AggregationService (#1131).
 *
 * Covers: AggregationService
 *   - aggregateMetrics
 *   - calculateCompletionRate
 *   - calculateAverageRating
 *   - calculateAverageProgress
 *   - calculateActiveLearnersCount
 *
 * The AggregationService handles pure transformation and calculation
 * of raw data into metrics — no I/O dependencies.
 */

// AggregationService will be created as part of the refactor
// eslint-disable-next-line import/no-unresolved
import { AggregationService } from './aggregation.service';

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    service = new AggregationService();
  });

  describe('aggregateMetrics', () => {
    it('should aggregate all raw data into metrics', () => {
      const rawData = {
        courseId: 'course-123',
        totalEnrollments: 20,
        totalCompletions: 5,
        reviewStats: { avg: '4.2', cnt: '8' },
        progressStats: { avg: '60' },
        activeLearnersLast30Days: { cnt: '3' },
      };

      const metrics = service.aggregateMetrics(rawData);

      expect(metrics.courseId).toBe('course-123');
      expect(metrics.totalEnrollments).toBe(20);
      expect(metrics.totalCompletions).toBe(5);
      expect(metrics.completionRate).toBe(25);
      expect(metrics.averageRating).toBe(4.2);
      expect(metrics.totalReviews).toBe(8);
      expect(metrics.averageProgressPct).toBe(60);
      expect(metrics.activeLearnersLast30Days).toBe(3);
    });

    it('should calculate completion rate as 0 when there are no enrollments', () => {
      const rawData = {
        courseId: 'course-456',
        totalEnrollments: 0,
        totalCompletions: 0,
        reviewStats: null,
        progressStats: null,
        activeLearnersLast30Days: null,
      };

      const metrics = service.aggregateMetrics(rawData);

      expect(metrics.completionRate).toBe(0);
      expect(metrics.totalEnrollments).toBe(0);
    });

    it('should round completion rate to two decimal places', () => {
      const rawData = {
        courseId: 'course-789',
        totalEnrollments: 3,
        totalCompletions: 1,
        reviewStats: null,
        progressStats: null,
        activeLearnersLast30Days: null,
      };

      const metrics = service.aggregateMetrics(rawData);

      // 1/3 * 100 = 33.33
      expect(metrics.completionRate).toBe(33.33);
    });
  });

  describe('calculateCompletionRate', () => {
    it('should calculate completion rate correctly', () => {
      const rate = service.calculateCompletionRate(10, 5);
      expect(rate).toBe(50);
    });

    it('should return 0 when enrollments are 0', () => {
      const rate = service.calculateCompletionRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should round to two decimal places', () => {
      const rate = service.calculateCompletionRate(3, 1);
      expect(rate).toBe(33.33);
    });

    it('should handle 100% completion', () => {
      const rate = service.calculateCompletionRate(10, 10);
      expect(rate).toBe(100);
    });
  });

  describe('calculateAverageRating', () => {
    it('should calculate average rating from string value', () => {
      const rating = service.calculateAverageRating('4.333333');
      expect(rating).toBe(4.33);
    });

    it('should default to 0 when rating stats are null', () => {
      const rating = service.calculateAverageRating(null);
      expect(rating).toBe(0);
    });

    it('should handle already-rounded ratings', () => {
      const rating = service.calculateAverageRating('4.5');
      expect(rating).toBe(4.5);
    });

    it('should handle 0 rating', () => {
      const rating = service.calculateAverageRating('0');
      expect(rating).toBe(0);
    });

    it('should handle 5.0 rating', () => {
      const rating = service.calculateAverageRating('5.0');
      expect(rating).toBe(5);
    });
  });

  describe('calculateAverageProgress', () => {
    it('should extract average progress percentage from stats', () => {
      const progress = service.calculateAverageProgress('75.5');
      expect(progress).toBe(75.5);
    });

    it('should default to 0 when progress stats are null', () => {
      const progress = service.calculateAverageProgress(null);
      expect(progress).toBe(0);
    });

    it('should handle 0 progress', () => {
      const progress = service.calculateAverageProgress('0');
      expect(progress).toBe(0);
    });

    it('should handle 100 progress', () => {
      const progress = service.calculateAverageProgress('100');
      expect(progress).toBe(100);
    });
  });

  describe('calculateActiveLearnersCount', () => {
    it('should extract active learners count from stats', () => {
      const count = service.calculateActiveLearnersCount('12');
      expect(count).toBe(12);
    });

    it('should default to 0 when stats are null', () => {
      const count = service.calculateActiveLearnersCount(null);
      expect(count).toBe(0);
    });

    it('should handle string numbers', () => {
      const count = service.calculateActiveLearnersCount('42');
      expect(count).toBe(42);
    });

    it('should handle zero active learners', () => {
      const count = service.calculateActiveLearnersCount('0');
      expect(count).toBe(0);
    });
  });

  describe('calculateTotalReviewCount', () => {
    it('should extract review count from stats', () => {
      const count = service.calculateTotalReviewCount('8');
      expect(count).toBe(8);
    });

    it('should default to 0 when stats are null', () => {
      const count = service.calculateTotalReviewCount(null);
      expect(count).toBe(0);
    });

    it('should handle large review counts', () => {
      const count = service.calculateTotalReviewCount('1500');
      expect(count).toBe(1500);
    });
  });
});
