import { IsOptional, IsDateString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  courseId?: string;
}

export class AnalyticsReportDto {
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  monthlyRevenue: number[];
  monthlyPayouts: number[];
  revenueByMonth: { month: string; revenue: number }[];
  courses: CourseAnalyticsSummary[];
}

export class CourseAnalyticsSummary {
  courseId: string;
  courseName: string;
  enrollments: number;
  completions: number;
  completionRate: number;
  averageRating: number;
  revenue: number;
  payout: number;
}
