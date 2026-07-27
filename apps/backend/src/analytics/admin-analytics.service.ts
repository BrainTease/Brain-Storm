import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AdminAggregationQueryDto, AdminDashboardQueryDto } from './admin-analytics.dto';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';
import { AnalyticsEvent } from './analytics-event.entity';

export interface DashboardMetrics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  activeLearnersLast30Days: number;
  newUsersLast30Days: number;
  newEnrollmentsLast30Days: number;
  growth: number;
  activeWorkers: number;
  tipVolume: number;
  disputeRate: number;
}

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);
  private readonly CACHE_TTL = 600;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(AnalyticsEvent) private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  private getDateRange(query: AdminDashboardQueryDto): { startDate: Date; endDate: Date } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 86400_000);
    return { startDate, endDate };
  }

  async getDashboardMetrics(query: AdminDashboardQueryDto = {}): Promise<DashboardMetrics> {
    const cacheKey = `admin:dashboard:${query.startDate || 'default'}:${query.endDate || 'default'}`;
    const cached = await this.cache.get<DashboardMetrics>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getDateRange(query);
    const prevStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const prevEndDate = new Date(startDate.getTime() - 1);

    const [current, previous] = await Promise.all([
      this.aggregateMetrics(startDate, endDate),
      this.aggregateMetrics(prevStartDate, prevEndDate),
    ]);

    const growth = previous.totalUsers > 0 
      ? ((current.totalUsers - previous.totalUsers) / previous.totalUsers) * 100 
      : 0;

    const metrics: DashboardMetrics = {
      ...current,
      growth: Math.round(growth * 100) / 100,
      activeWorkers: current.activeLearnersLast30Days,
      tipVolume: await this.calculateTipVolume(startDate, endDate),
      disputeRate: await this.calculateDisputeRate(startDate, endDate),
    };

    await this.cache.set(cacheKey, metrics, this.CACHE_TTL);
    return metrics;
  }

  private async aggregateMetrics(startDate: Date, endDate: Date): Promise<Omit<DashboardMetrics, 'growth' | 'activeWorkers' | 'tipVolume' | 'disputeRate'>> {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCompletions,
      reviewStats,
      progressStats,
      activeCount,
      newUsers,
      newEnrollments,
    ] = await Promise.all([
      this.userRepo.count(),
      this.courseRepo.count(),
      this.enrollmentRepo.count(),
      this.enrollmentRepo
        .createQueryBuilder('e')
        .where('e.completedAt IS NOT NULL')
        .andWhere('e.completedAt >= :start AND e.completedAt <= :end', { start: startDate, end: endDate })
        .getCount(),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(*)', 'cnt')
        .where('r.createdAt >= :start AND r.createdAt <= :end', { start: startDate, end: endDate })
        .getRawOne<{ avg: string; cnt: string }>(),
      this.progressRepo
        .createQueryBuilder('p')
        .select('AVG(p.progressPct)', 'avg')
        .where('p.updatedAt >= :start AND p.updatedAt <= :end', { start: startDate, end: endDate })
        .getRawOne<{ avg: string }>(),
      this.progressRepo
        .createQueryBuilder('p')
        .where('p.updatedAt >= :since', { since: new Date(Date.now() - 30 * 86400_000) })
        .select('COUNT(DISTINCT p.userId)', 'cnt')
        .getRawOne<{ cnt: string }>(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :start AND u.createdAt <= :end', { start: startDate, end: endDate })
        .getCount(),
      this.enrollmentRepo
        .createQueryBuilder('e')
        .where('e.createdAt >= :start AND e.createdAt <= :end', { start: startDate, end: endDate })
        .getCount(),
    ]);

    const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCompletions,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating: Math.round(Number(reviewStats?.avg ?? 0) * 100) / 100,
      totalReviews: Number(reviewStats?.cnt ?? 0),
      activeLearnersLast30Days: Number(activeCount?.cnt ?? 0),
      newUsersLast30Days: newUsers,
      newEnrollmentsLast30Days: newEnrollments,
    };
  }

  private async calculateTipVolume(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.analyticsEventRepo
      .createQueryBuilder('e')
      .select('SUM(CAST(e.payload->>\'amount\' AS numeric))', 'total')
      .where('e.eventType = :type', { type: 'tip_received' })
      .andWhere('e.timestamp >= :start AND e.timestamp <= :end', { start: startDate, end: endDate })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  private async calculateDisputeRate(startDate: Date, endDate: Date): Promise<number> {
    const [totalDisputes, totalTransactions] = await Promise.all([
      this.analyticsEventRepo
        .createQueryBuilder('e')
        .where('e.eventType = :type', { type: 'dispute_opened' })
        .andWhere('e.timestamp >= :start AND e.timestamp <= :end', { start: startDate, end: endDate })
        .getCount(),
      this.analyticsEventRepo
        .createQueryBuilder('e')
        .where('e.eventType IN (:...types)', { types: ['tip_sent', 'tip_received', 'payment_completed'] })
        .andWhere('e.timestamp >= :start AND e.timestamp <= :end', { start: startDate, end: endDate })
        .getCount(),
    ]);
    return totalTransactions > 0 ? Math.round((totalDisputes / totalTransactions) * 10000) / 100 : 0;
  }

  async exportMetrics(query: AdminDashboardQueryDto = {}): Promise<string> {
    const metrics = await this.getDashboardMetrics(query);
    const header = 'metric,value\n';
    const rows = Object.entries(metrics)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');
    return header + rows;
  }
}