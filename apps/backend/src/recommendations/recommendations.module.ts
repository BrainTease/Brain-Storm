import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { Progress } from '../progress/progress.entity';
import { RecommendationSignal } from './recommendation-signal.entity';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationSignalsService } from './recommendation-signals.service';
import { RecommendationSignalsController } from './recommendation-signals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Course, Progress, RecommendationSignal])],
  providers: [RecommendationsService, RecommendationSignalsService],
  controllers: [RecommendationsController, RecommendationSignalsController],
  exports: [RecommendationsService, RecommendationSignalsService],
})
export class RecommendationsModule {}
