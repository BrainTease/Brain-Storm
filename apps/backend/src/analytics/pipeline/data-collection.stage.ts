/**
 * DataCollectionStage — Stage 1 of the analytics ingestion pipeline.
 *
 * Responsibility: Execute all raw database queries for a given course in
 * parallel and populate `ctx.rawData` with the results.  This stage does
 * NO computation — it is purely I/O.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../enrollments/enrollment.entity';
import { Progress } from '../../progress/progress.entity';
import { Review } from '../../courses/review.entity';
import { PipelineContext, PipelineStage, RawCourseData } from './pipeline.types';

@Injectable()
export class DataCollectionStage implements PipelineStage {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Progress)
    private readonly progressRepo: Repository<Progress>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>
  ) {}

  async execute(ctx: PipelineContext): Promise<void> {
    const { courseId } = ctx;

    const [
      totalEnrollments,
      totalCompletions,
      reviewStats,
      progressStats,
      activeLearnersLast30Days,
    ] = await Promise.all([
      this.countTotalEnrollments(courseId),
      this.countTotalCompletions(courseId),
      this.fetchReviewStats(courseId),
      this.fetchProgressStats(courseId),
      this.fetchActiveLearners(courseId),
    ]);

    const rawData: RawCourseData = {
      courseId,
      totalEnrollments,
      totalCompletions,
      reviewStats,
      progressStats,
      activeLearnersLast30Days,
    };

    ctx.rawData = rawData;
  }

  private countTotalEnrollments(courseId: string): Promise<number> {
    return this.enrollmentRepo.count({ where: { courseId } });
  }

  private async countTotalCompletions(courseId: string): Promise<number> {
    return this.enrollmentRepo
      .createQueryBuilder('e')
      .where('e.courseId = :courseId', { courseId })
      .andWhere('e.completedAt IS NOT NULL')
      .getCount();
  }

  private async fetchReviewStats(courseId: string): Promise<{ avg: string; cnt: string } | null> {
    return this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.courseId = :courseId', { courseId })
      .getRawOne<{ avg: string; cnt: string }>();
  }

  private async fetchProgressStats(courseId: string): Promise<{ avg: string } | null> {
    return this.progressRepo
      .createQueryBuilder('p')
      .select('AVG(p.progressPct)', 'avg')
      .where('p.courseId = :courseId', { courseId })
      .getRawOne<{ avg: string }>();
  }

  private async fetchActiveLearners(courseId: string): Promise<{ cnt: string } | null> {
    return this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId = :courseId', { courseId })
      .andWhere('p.updatedAt > :since', {
        since: new Date(Date.now() - 30 * 86_400_000),
      })
      .select('COUNT(DISTINCT p.userId)', 'cnt')
      .getRawOne<{ cnt: string }>();
  }
}
