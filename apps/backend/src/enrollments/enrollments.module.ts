import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { CoursesModule } from '../courses/courses.module';
import { RepositoriesModule } from '../repositories/repositories.module';

/**
 * EnrollmentsModule
 *
 * Uses RepositoriesModule for all DB access (#800) — no direct
 * TypeOrmModule.forFeature([Enrollment]) in this module.
 */
@Module({
  imports: [RepositoriesModule, CoursesModule],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
