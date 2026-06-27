import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { InstructorAnalytics } from './instructor-analytics.entity';
import { AnalyticsQueryDto, AnalyticsReportDto, CourseAnalyticsSummary } from './dto/instructor-analytics.dto.ts';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Review } from '../courses/review.entity';
import { Course } from '../courses/course.entity';
import { Parser } from 'json2csv';

@Injectable()
export class InstructorAnalyticsService {
  private readonly logger = new Logger(InstructorAnalyticsService.name);

  constructor(
    @InjectRepository(InstructorAnalytics) private analyticsRepo: Repository<InstructorAnalytics>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
  ) {}

  async getInstructorAnalytics(
    instructorId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsReportDto> {
    const courses = await this.courseRepo.find({
      where: { instructorId },
    });

    if (!courses.length) {
      throw new NotFoundException('No courses found for instructor');
    }

    const courseIds = courses.map((c) => c.id);
    const { startDate, endDate } = this.getDateRange(query);

    // Aggregate analytics by course and month
    let analytics = await this.analyticsRepo.find({
      where: {
        instructorId,
        month: startDate && endDate
          ? Between(this.getMonthString(startDate), this.getMonthString(endDate))
          : undefined,
      },
    });

    // Compute current month if not cached
    const currentMonth = this.getCurrentMonthString();
    if (!analytics.find((a) => a.month === currentMonth)) {
      await this.computeAnalytics(instructorId, courseIds, currentMonth);
      analytics = await this.analyticsRepo.find({
        where: { instructorId },
      });
    }

    return this.buildReport(analytics, courses);
  }

  async computeAnalytics(instructorId: string, courseIds: string[], month: string): Promise<void> {
    for (const courseId of courseIds) {
      const startDate = this.parseMonthString(month);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Count enrollments and completions
      const enrollments = await this.enrollmentRepo.count({
        where: {
          courseId,
          createdAt: Between(startDate, endDate),
        },
      });

      const completions = await this.enrollmentRepo.count({
        where: {
          courseId,
          completedAt: MoreThanOrEqual(startDate),
          completedAt: LessThanOrEqual(endDate),
        },
      });

      // Get reviews and rating
      const reviews = await this.reviewRepo.find({
        where: {
          courseId,
          createdAt: Between(startDate, endDate),
        },
      });

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      // Compute revenue from payouts module (linked to completions)
      const payoutInfo = await this.getPayoutInfo(instructorId, courseId, month);

      const analytics = this.analyticsRepo.create({
        instructorId,
        courseId,
        month,
        enrollments,
        completions,
        averageRating: Math.round(avgRating * 100) / 100,
        totalReviews: reviews.length,
        revenue: payoutInfo.revenue,
        payout: payoutInfo.payout,
      });

      await this.analyticsRepo.save(analytics);
    }
  }

  private async getPayoutInfo(instructorId: string, courseId: string, month: string) {
    // TODO: Integrate with payouts module
    // For now, return placeholder
    return { revenue: 0, payout: 0 };
  }

  private buildReport(
    analytics: InstructorAnalytics[],
    courses: Course[],
  ): AnalyticsReportDto {
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const courses Summary: CourseAnalyticsSummary[] = Array.from(
      new Map(
        analytics.map((a) => [
          a.courseId,
          {
            courseId: a.courseId,
            courseName: courseMap.get(a.courseId)?.name || 'Unknown',
            enrollments: analytics
              .filter((x) => x.courseId === a.courseId)
              .reduce((sum, x) => sum + x.enrollments, 0),
            completions: analytics
              .filter((x) => x.courseId === a.courseId)
              .reduce((sum, x) => sum + x.completions, 0),
            completionRate: 0,
            averageRating: analytics
              .filter((x) => x.courseId === a.courseId)
              .reduce((sum, x) => sum + x.averageRating, 0) / analytics.filter((x) => x.courseId === a.courseId).length,
            revenue: analytics
              .filter((x) => x.courseId === a.courseId)
              .reduce((sum, x) => sum + parseFloat(x.revenue.toString()), 0),
            payout: analytics
              .filter((x) => x.courseId === a.courseId)
              .reduce((sum, x) => sum + parseFloat(x.payout.toString()), 0),
          },
        ]),
      ).values(),
    );

    coursesSummary.forEach((c) => {
      c.completionRate =
        c.enrollments > 0
          ? Math.round((c.completions / c.enrollments) * 10000) / 100
          : 0;
    });

    const totalEnrollments = coursesSummary.reduce((sum, c) => sum + c.enrollments, 0);
    const totalCompletions = coursesSummary.reduce((sum, c) => sum + c.completions, 0);
    const monthlyRevenue = analytics.map((a) => parseFloat(a.revenue.toString()));
    const monthlyPayouts = analytics.map((a) => parseFloat(a.payout.toString()));

    return {
      totalEnrollments,
      totalCompletions,
      completionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
      averageRating:
        coursesSummary.reduce((sum, c) => sum + c.averageRating, 0) / coursesSummary.length,
      totalReviews: analytics.reduce((sum, a) => sum + a.totalReviews, 0),
      monthlyRevenue,
      monthlyPayouts,
      revenueByMonth: analytics.map((a) => ({
        month: a.month,
        revenue: parseFloat(a.revenue.toString()),
      })),
      courses: coursesSummary,
    };
  }

  async exportAnalyticsToCSV(
    instructorId: string,
    query: AnalyticsQueryDto,
  ): Promise<string> {
    const report = await this.getInstructorAnalytics(instructorId, query);

    const csvData = report.courses.map((c) => ({
      courseId: c.courseId,
      courseName: c.courseName,
      enrollments: c.enrollments,
      completions: c.completions,
      completionRate: `${c.completionRate.toFixed(2)}%`,
      averageRating: c.averageRating.toFixed(2),
      revenue: `$${c.revenue.toFixed(2)}`,
      payout: `$${c.payout.toFixed(2)}`,
    }));

    const parser = new Parser();
    return parser.parse(csvData);
  }

  private getDateRange(query: AnalyticsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    return { startDate, endDate };
  }

  private getMonthString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private getCurrentMonthString(): string {
    return this.getMonthString(new Date());
  }

  private parseMonthString(month: string): Date {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m - 1, 1);
  }
}
