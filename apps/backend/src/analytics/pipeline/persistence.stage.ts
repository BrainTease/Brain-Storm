/**
 * PersistenceStage — Stage 3 of the analytics ingestion pipeline.
 *
 * Responsibility: Upsert the computed `ctx.metrics` into the
 * `course_analytics` table and store the resulting entity in `ctx.record`.
 * This stage performs exactly one database write per course.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseAnalytics } from '../course-analytics.entity';
import { PipelineContext, PipelineStage } from './pipeline.types';

@Injectable()
export class PersistenceStage implements PipelineStage {
  constructor(
    @InjectRepository(CourseAnalytics)
    private readonly analyticsRepo: Repository<CourseAnalytics>
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    if (!ctx.metrics) {
      throw new Error('PersistenceStage requires metrics from AggregationStage');
    }

    const { courseId, ...metrics } = ctx.metrics;

    const existing = await this.analyticsRepo.findOne({ where: { courseId } });
    const record = existing ?? this.analyticsRepo.create({ courseId });

    Object.assign(record, metrics);

    ctx.record = await this.analyticsRepo.save(record);
  }
}
