import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CourseAnalytics } from './course-analytics.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { PlatformAnalytics } from './platform-analytics.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { EventsService } from './events.service';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([CourseAnalytics, Enrollment, Progress, Review, AnalyticsEvent, PlatformAnalytics]),
  ],
  providers: [AnalyticsService, EventsService, PlatformAnalyticsService],
  controllers: [AnalyticsController, PlatformAnalyticsController],
  exports: [AnalyticsService, EventsService, PlatformAnalyticsService],
})
export class AnalyticsModule {}
