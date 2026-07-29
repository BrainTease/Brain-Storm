/**
 * AggregationStage — Stage 2 of the analytics ingestion pipeline.
 *
 * Responsibility: Transform `ctx.rawData` into `ctx.metrics` by applying
 * business-logic calculations (completion rate, rounding, defaults).
 * This stage does NO I/O — it is purely computational.
 */

import { Injectable } from '@nestjs/common';
import { AggregatedMetrics, PipelineContext, PipelineStage } from './pipeline.types';

@Injectable()
export class AggregationStage implements PipelineStage {
  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.rawData) {
      throw new Error('AggregationStage requires rawData from DataCollectionStage');
    }

    const {
      courseId,
      totalEnrollments,
      totalCompletions,
      reviewStats,
      progressStats,
      activeLearnersLast30Days: activeLearners,
    } = ctx.rawData;

    const completionRate =
      totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    const metrics: AggregatedMetrics = {
      courseId,
      totalEnrollments,
      totalCompletions,
      completionRate: this.round2(completionRate),
      averageRating: this.round2(Number(reviewStats?.avg ?? 0)),
      totalReviews: Number(reviewStats?.cnt ?? 0),
      averageProgressPct: this.round2(Number(progressStats?.avg ?? 0)),
      activeLearnersLast30Days: Number(activeLearners?.cnt ?? 0),
    };

    ctx.metrics = metrics;
  }

  /** Round a number to two decimal places. */
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
