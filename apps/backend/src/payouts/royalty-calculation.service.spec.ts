/**
 * Unit tests for RoyaltyCalculationService (#815).
 *
 * Verifies the royalty calculation logic in isolation — no I/O required.
 */

import { RoyaltyCalculationService, RoyaltyInput } from './royalty-calculation.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeConfigService(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    PLATFORM_FEE_PERCENT: 20,
  };
  return {
    get: jest.fn().mockImplementation((key: string, fallback: any) => {
      return key in { ...defaults, ...overrides }
        ? ({ ...defaults, ...overrides })[key]
        : fallback;
    }),
  };
}

function makeService(configOverrides: Record<string, any> = {}) {
  const configService = makeConfigService(configOverrides);
  return new RoyaltyCalculationService(configService as any);
}

// ═════════════════════════════════════════════════════════════════════════════
// calculate
// ═════════════════════════════════════════════════════════════════════════════

describe('RoyaltyCalculationService.calculate', () => {
  it('correctly computes totalRevenue, platformFee, and instructorShare', () => {
    const service = makeService({ PLATFORM_FEE_PERCENT: 20 });
    const input: RoyaltyInput = {
      completions: 10,
      coursePrice: 100,
      courseId: 'course-1',
      instructorId: 'inst-1',
    };

    const result = service.calculate(input);

    expect(result.totalRevenue).toBe(1000);         // 10 × 100
    expect(result.platformFee).toBe(200);           // 1000 × 20%
    expect(result.instructorShare).toBe(800);       // 1000 – 200
    expect(result.platformFeePercent).toBe(20);
    expect(result.courseId).toBe('course-1');
    expect(result.instructorId).toBe('inst-1');
  });

  it('returns zero values when completions are zero', () => {
    const service = makeService();
    const result = service.calculate({
      completions: 0,
      coursePrice: 100,
      courseId: 'c',
      instructorId: 'i',
    });
    expect(result.totalRevenue).toBe(0);
    expect(result.platformFee).toBe(0);
    expect(result.instructorShare).toBe(0);
  });

  it('returns zero values when coursePrice is zero', () => {
    const service = makeService();
    const result = service.calculate({
      completions: 50,
      coursePrice: 0,
      courseId: 'c',
      instructorId: 'i',
    });
    expect(result.totalRevenue).toBe(0);
    expect(result.platformFee).toBe(0);
    expect(result.instructorShare).toBe(0);
  });

  it('respects a custom platform fee percentage', () => {
    const service = makeService({ PLATFORM_FEE_PERCENT: 30 });
    const result = service.calculate({
      completions: 10,
      coursePrice: 200,
      courseId: 'c',
      instructorId: 'i',
    });
    // totalRevenue = 2000, platformFee = 600 (30%), instructorShare = 1400
    expect(result.totalRevenue).toBe(2000);
    expect(result.platformFee).toBe(600);
    expect(result.instructorShare).toBe(1400);
  });

  it('falls back to 20% fee when PLATFORM_FEE_PERCENT is not configured', () => {
    const configService = {
      get: jest.fn().mockImplementation((_key: string, fallback: any) => fallback),
    };
    const service = new RoyaltyCalculationService(configService as any);
    const result = service.calculate({
      completions: 10,
      coursePrice: 50,
      courseId: 'c',
      instructorId: 'i',
    });
    expect(result.platformFeePercent).toBe(20);
    expect(result.platformFee).toBe(100); // 500 × 20%
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// calculateBatch
// ═════════════════════════════════════════════════════════════════════════════

describe('RoyaltyCalculationService.calculateBatch', () => {
  it('excludes courses with zero completions', () => {
    const service = makeService();
    const inputs: RoyaltyInput[] = [
      { completions: 5, coursePrice: 100, courseId: 'c1', instructorId: 'i1' },
      { completions: 0, coursePrice: 100, courseId: 'c2', instructorId: 'i2' },
      { completions: 3, coursePrice: 200, courseId: 'c3', instructorId: 'i3' },
    ];

    const results = service.calculateBatch(inputs);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.courseId)).toEqual(['c1', 'c3']);
  });

  it('returns an empty array when all completions are zero', () => {
    const service = makeService();
    const results = service.calculateBatch([
      { completions: 0, coursePrice: 100, courseId: 'c1', instructorId: 'i1' },
    ]);
    expect(results).toHaveLength(0);
  });

  it('calculates correct values for each course in the batch', () => {
    const service = makeService({ PLATFORM_FEE_PERCENT: 25 });
    const results = service.calculateBatch([
      { completions: 4, coursePrice: 100, courseId: 'c1', instructorId: 'i1' },
      { completions: 2, coursePrice: 50, courseId: 'c2', instructorId: 'i2' },
    ]);

    // c1: 4×100=400, fee=100 (25%), share=300
    expect(results[0].totalRevenue).toBe(400);
    expect(results[0].instructorShare).toBe(300);

    // c2: 2×50=100, fee=25 (25%), share=75
    expect(results[1].totalRevenue).toBe(100);
    expect(results[1].instructorShare).toBe(75);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getCoursePrice
// ═════════════════════════════════════════════════════════════════════════════

describe('RoyaltyCalculationService.getCoursePrice', () => {
  it('returns the configured price for a course', () => {
    const service = makeService({ 'COURSE_PRICE_course-abc': 149 });
    expect(service.getCoursePrice('course-abc')).toBe(149);
  });

  it('falls back to 0 when no price is configured', () => {
    const configService = {
      get: jest.fn().mockImplementation((_key: string, fallback: any) => fallback),
    };
    const service = new RoyaltyCalculationService(configService as any);
    expect(service.getCoursePrice('unknown-course')).toBe(0);
  });
});
