import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CourseAnalytics } from './course-analytics.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    @InjectRepository(CourseAnalytics) private analyticsRepo: Repository<CourseAnalytics>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Progress) private progressRepo: Repository<Progress>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @Inject(CACHE_MANAGER) private cache: Cache,
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

  async aggregateCourse(courseId: string): Promise<CourseAnalytics> {
    const [totalEnrollments, totalCompletions, reviewStats, progressStats, activeCount] =
      await Promise.all([
        this.enrollmentRepo.count({ where: { courseId } }),
        this.enrollmentRepo.count({ where: { courseId } }).then(async () => {
          const res = await this.enrollmentRepo
            .createQueryBuilder('e')
            .where('e.courseId = :courseId', { courseId })
            .andWhere('e.completedAt IS NOT NULL')
            .getCount();
          return res;
        }),
        this.reviewRepo
          .createQueryBuilder('r')
          .select('AVG(r.rating)', 'avg')
          .addSelect('COUNT(*)', 'cnt')
          .where('r.courseId = :courseId', { courseId })
          .getRawOne<{ avg: string; cnt: string }>(),
        this.progressRepo
          .createQueryBuilder('p')
          .select('AVG(p.progressPct)', 'avg')
          .where('p.courseId = :courseId', { courseId })
          .getRawOne<{ avg: string }>(),
        this.progressRepo
          .createQueryBuilder('p')
          .where('p.courseId = :courseId', { courseId })
          .andWhere('p.updatedAt > :since', { since: new Date(Date.now() - 30 * 86400_000) })
          .select('COUNT(DISTINCT p.userId)', 'cnt')
          .getRawOne<{ cnt: string }>(),
      ]);

    const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    const existing = await this.analyticsRepo.findOne({ where: { courseId } });
    const record = existing ?? this.analyticsRepo.create({ courseId });

    Object.assign(record, {
      totalEnrollments,
      totalCompletions,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating: Math.round(Number(reviewStats?.avg ?? 0) * 100) / 100,
      totalReviews: Number(reviewStats?.cnt ?? 0),
      averageProgressPct: Math.round(Number(progressStats?.avg ?? 0) * 100) / 100,
      activeLearnersLast30Days: Number(activeCount?.cnt ?? 0),
    });

    const saved = await this.analyticsRepo.save(record);
    await this.cache.del(`analytics:${courseId}`);
    return saved;
  }

  /** Hourly: aggregate all courses */
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
