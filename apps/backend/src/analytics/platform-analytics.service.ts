import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { PlatformAnalytics } from './platform-analytics.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';

@Injectable()
export class PlatformAnalyticsService {
  private readonly logger = new Logger(PlatformAnalyticsService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(AnalyticsEvent) private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(PlatformAnalytics) private readonly platformAnalyticsRepo: Repository<PlatformAnalytics>,
  ) {}

  async aggregatePlatform(): Promise<PlatformAnalytics> {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCompletions,
      reviewStats,
      progressStats,
      activeCount,
      newUsersLast30Days,
      newEnrollmentsLast30Days,
    ] = await Promise.all([
      this.userRepo.count(),
      this.courseRepo.count(),
      this.enrollmentRepo.count(),
      this.enrollmentRepo
        .createQueryBuilder('e')
        .where('e.completedAt IS NOT NULL')
        .getCount(),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(*)', 'cnt')
        .getRawOne<{ avg: string; cnt: string }>(),
      this.progressRepo
        .createQueryBuilder('p')
        .select('AVG(p.progressPct)', 'avg')
        .getRawOne<{ avg: string }>(),
      this.progressRepo
        .createQueryBuilder('p')
        .where('p.updatedAt > :since', { since: new Date(Date.now() - 30 * 86400_000) })
        .select('COUNT(DISTINCT p.userId)', 'cnt')
        .getRawOne<{ cnt: string }>(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt > :since', { since: new Date(Date.now() - 30 * 86400_000) })
        .getCount(),
      this.enrollmentRepo
        .createQueryBuilder('e')
        .where('e.createdAt > :since', { since: new Date(Date.now() - 30 * 86400_000) })
        .getCount(),
    ]);

    const completionRate =
      totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    const platformAnalytics = this.platformAnalyticsRepo.create({
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCompletions,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating: Math.round(Number(reviewStats?.avg ?? 0) * 100) / 100,
      totalReviews: Number(reviewStats?.cnt ?? 0),
      averageProgressPct: Math.round(Number(progressStats?.avg ?? 0) * 100) / 100,
      activeLearnersLast30Days: Number(activeCount?.cnt ?? 0),
      newUsersLast30Days,
      newEnrollmentsLast30Days,
    });

    return await this.platformAnalyticsRepo.save(platformAnalytics);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async aggregatePlatformDaily(): Promise<void> {
    this.logger.log('Running daily platform analytics aggregation');
    try {
      await this.aggregatePlatform();
    } catch (err) {
      this.logger.error(`Failed to aggregate platform analytics: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND_AT_2AM)
  async aggregatePlatformWeekly(): Promise<void> {
    this.logger.log('Running weekly platform analytics aggregation');
    try {
      await this.aggregatePlatform();
    } catch (err) {
      this.logger.error(`Failed to aggregate platform analytics: ${err.message}`);
    }
  }

  /**
   * Data retention: delete analytics events older than 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldAnalyticsEvents(): Promise<void> {
    this.logger.log('Running data retention for analytics events');
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);
    await this.analyticsEventRepo.delete({ timestamp: LessThan(ninetyDaysAgo) });
  }
}