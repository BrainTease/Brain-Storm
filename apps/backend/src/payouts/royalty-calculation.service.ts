/**
 * RoyaltyCalculationService (#815)
 *
 * Responsibility: Encapsulates all royalty / revenue-share calculation logic
 * for instructor payouts. This service is pure computation — it receives the
 * inputs it needs and returns a structured result without performing any I/O.
 *
 * Seams extracted from PayoutsService.calculatePayouts:
 *   • Platform-fee percentage retrieval
 *   • Per-course revenue calculation (completions × price)
 *   • Platform-fee deduction
 *   • Instructor-share computation
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RoyaltyInput {
  /** Number of completed enrollments within the reporting window. */
  completions: number;
  /** Unit price for the course (e.g. from config). */
  coursePrice: number;
  /** Course identifier — passed through for traceability. */
  courseId: string;
  /** Instructor identifier — passed through for traceability. */
  instructorId: string;
}

export interface RoyaltyResult {
  courseId: string;
  instructorId: string;
  /** Gross revenue = completions × coursePrice */
  totalRevenue: number;
  /** Platform's share = totalRevenue × (platformFeePercent / 100) */
  platformFee: number;
  /** Instructor's net share = totalRevenue − platformFee */
  instructorShare: number;
  /** Platform fee percentage used for this calculation. */
  platformFeePercent: number;
}

@Injectable()
export class RoyaltyCalculationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Return the configured platform fee percentage.
   * Falls back to 20 % if the environment variable is not set.
   */
  getPlatformFeePercent(): number {
    return this.configService.get<number>('PLATFORM_FEE_PERCENT', 20);
  }

  /**
   * Return the configured price for a given course.
   * Falls back to 0 if no price is configured for this course.
   */
  getCoursePrice(courseId: string): number {
    return this.configService.get<number>(`COURSE_PRICE_${courseId}`, 0);
  }

  /**
   * Calculate royalty figures for a single course/instructor combination.
   *
   * @param input  The raw data needed for the calculation.
   * @returns      A RoyaltyResult with all derived values.
   */
  calculate(input: RoyaltyInput): RoyaltyResult {
    const platformFeePercent = this.getPlatformFeePercent();
    const totalRevenue = input.completions * input.coursePrice;
    const platformFee = (totalRevenue * platformFeePercent) / 100;
    const instructorShare = totalRevenue - platformFee;

    return {
      courseId: input.courseId,
      instructorId: input.instructorId,
      totalRevenue,
      platformFee,
      instructorShare,
      platformFeePercent,
    };
  }

  /**
   * Calculate royalties for multiple courses in one call.
   * Courses with zero completions are excluded from the result.
   *
   * @param inputs  Array of per-course royalty inputs.
   * @returns       Array of RoyaltyResults (only for courses with completions > 0).
   */
  calculateBatch(inputs: RoyaltyInput[]): RoyaltyResult[] {
    return inputs
      .filter((input) => input.completions > 0)
      .map((input) => this.calculate(input));
  }
}
