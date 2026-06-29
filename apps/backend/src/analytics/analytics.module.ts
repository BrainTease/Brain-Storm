import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CourseAnalytics } from './course-analytics.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { PlatformAnalytics } from './platform-analytics.entity';
import { InstructorAnalytics } from './instructor-analytics.entity';
import { ProtocolMetric } from './protocol-metrics.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';
import { Course } from '../courses/course.entity';
import { User } from '../users/user.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { EventsService } from './events.service';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { InstructorAnalyticsService } from './instructor-analytics.service';
import { InstructorAnalyticsController } from './instructor-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { ProtocolMetricsService } from './protocol-metrics.service';
import { ProtocolMetricsController } from './protocol-metrics.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      CourseAnalytics,
      Enrollment,
      Progress,
      Review,
      AnalyticsEvent,
      PlatformAnalytics,
      InstructorAnalytics,
      ProtocolMetric,
      Course,
      User,
    ]),
  ],
  providers: [AnalyticsService, EventsService, PlatformAnalyticsService, InstructorAnalyticsService, AdminAnalyticsService, ProtocolMetricsService],
  controllers: [AnalyticsController, PlatformAnalyticsController, InstructorAnalyticsController, AdminAnalyticsController, ProtocolMetricsController],
  exports: [AnalyticsService, EventsService, PlatformAnalyticsService, InstructorAnalyticsService, AdminAnalyticsService, ProtocolMetricsService],
})
export class AnalyticsModule {}
