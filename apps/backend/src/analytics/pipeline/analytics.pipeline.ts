/**
 * AnalyticsPipeline — Orchestrates the four ingestion stages for a course.
 *
 * Stages run in sequence:
 *   1. DataCollectionStage  — parallel DB queries
 *   2. AggregationStage     — pure calculation / transformation
 *   3. PersistenceStage     — upsert to the database
 *   4. CacheStage           — invalidate stale cache entry
 *
 * The pipeline returns the persisted CourseAnalytics record.
 */

import { Injectable } from '@nestjs/common';
import { CourseAnalytics } from '../course-analytics.entity';
import { DataCollectionStage } from './data-collection.stage';
import { AggregationStage } from './aggregation.stage';
import { PersistenceStage } from './persistence.stage';
import { CacheStage } from './cache.stage';
import { PipelineContext } from './pipeline.types';

@Injectable()
export class AnalyticsPipeline {
  constructor(
    private readonly dataCollectionStage: DataCollectionStage,
    private readonly aggregationStage: AggregationStage,
    private readonly persistenceStage: PersistenceStage,
    private readonly cacheStage: CacheStage,
  ) {}

  async run(courseId: string): Promise<CourseAnalytics> {
    const ctx: PipelineContext = { courseId };

    await this.dataCollectionStage.execute(ctx);
    await this.aggregationStage.execute(ctx);
    await this.persistenceStage.execute(ctx);
    await this.cacheStage.execute(ctx);

    if (!ctx.record) {
      throw new Error(`Pipeline did not produce a record for course ${courseId}`);
    }

    return ctx.record;
  }
}
