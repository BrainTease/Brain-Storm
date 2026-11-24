import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from '../courses/course.entity';
import { Review } from '../courses/review.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { User } from '../users/user.entity';

import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsEvent } from './analytics-event.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CourseAnalytics } from './course-analytics.entity';
import { EventsService } from './events.service';
import { InstructorAnalyticsController } from './instructor-analytics.controller';
import { InstructorAnalytics } from './instructor-analytics.entity';
import { InstructorAnalyticsService } from './instructor-analytics.service';
import { AggregationStage } from './pipeline/aggregation.stage';
import { AnalyticsPipeline } from './pipeline/analytics.pipeline';
import { CacheStage } from './pipeline/cache.stage';
// Pipeline stages
import { DataCollectionStage } from './pipeline/data-collection.stage';
import { PersistenceStage } from './pipeline/persistence.stage';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformAnalytics } from './platform-analytics.entity';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { ProtocolMetricsController } from './protocol-metrics.controller';
import { ProtocolMetric } from './protocol-metrics.entity';
import { ProtocolMetricsService } from './protocol-metrics.service';

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
  providers: [
    // Pipeline stages
    DataCollectionStage,
    AggregationStage,
    PersistenceStage,
    CacheStage,
    AnalyticsPipeline,
    // Feature services
    AnalyticsService,
    EventsService,
    PlatformAnalyticsService,
    InstructorAnalyticsService,
    AdminAnalyticsService,
    ProtocolMetricsService,
  ],
  controllers: [
    AnalyticsController,
    PlatformAnalyticsController,
    InstructorAnalyticsController,
    AdminAnalyticsController,
    ProtocolMetricsController,
  ],
  exports: [
    AnalyticsPipeline,
    AnalyticsService,
    EventsService,
    PlatformAnalyticsService,
    InstructorAnalyticsService,
    AdminAnalyticsService,
    ProtocolMetricsService,
  ],
})
export class AnalyticsModule {}
