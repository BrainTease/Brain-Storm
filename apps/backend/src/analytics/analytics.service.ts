import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CourseAnalytics } from './course-analytics.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { AnalyticsPipeline } from './pipeline/analytics.pipeline';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    @InjectRepository(CourseAnalytics)
    private readonly analyticsRepo: Repository<CourseAnalytics>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly pipeline: AnalyticsPipeline
  ) {}

  async getAnalytics(courseId: string): Promise<CourseAnalytics> {
    const cacheKey = `analytics:${courseId}`;
    const cached = await this.cache.get<CourseAnalytics>(cacheKey);
    if (cached) return cached;

    let analytics = await this.analyticsRepo.findOne({ where: { courseId } });
    if (!analytics) {
      analytics = await this.aggregateCourse(courseId);
    }

    await this.cache.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  /** Run the full ingestion pipeline for a single course. */
  async aggregateCourse(courseId: string): Promise<CourseAnalytics> {
    return this.pipeline.run(courseId);
  }

  /** Hourly: aggregate all courses that have at least one enrollment. */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateAll(): Promise<void> {
    this.logger.log('Running hourly analytics aggregation');

    const courseIds = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.courseId', 'courseId')
      .getRawMany<{ courseId: string }>();

    for (const { courseId } of courseIds) {
      try {
        await this.aggregateCourse(courseId);
      } catch (err: any) {
        this.logger.error(`Failed to aggregate course ${courseId}: ${err.message}`);
      }
    }
  }
}
