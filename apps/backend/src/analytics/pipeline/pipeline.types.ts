/**
 * Shared types and interfaces for the analytics ingestion pipeline.
 *
 * The pipeline processes a single course through four discrete stages:
 *   DataCollectionStage → AggregationStage → PersistenceStage → CacheStage
 */

import { CourseAnalytics } from '../course-analytics.entity';

/** Raw query results gathered by the DataCollectionStage. */
export interface RawCourseData {
  courseId: string;
  totalEnrollments: number;
  totalCompletions: number;
  reviewStats: { avg: string; cnt: string } | null;
  progressStats: { avg: string } | null;
  activeLearnersLast30Days: { cnt: string } | null;
}

/** Calculated metrics produced by the AggregationStage. */
export interface AggregatedMetrics {
  courseId: string;
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  averageProgressPct: number;
  activeLearnersLast30Days: number;
}

/** Pipeline context passed between stages. */
export interface PipelineContext {
  courseId: string;
  rawData?: RawCourseData;
  metrics?: AggregatedMetrics;
  record?: CourseAnalytics;
}

/** A single stage in the analytics ingestion pipeline. */
export interface PipelineStage {
  execute(ctx: PipelineContext): Promise<void>;
}
