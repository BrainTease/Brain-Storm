import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from '../enrollments/enrollment.entity';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheManagementModule } from '../cache/cache-management.module';
import { RepositoriesModule } from '../repositories';

import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';
import { Lesson } from './lesson.entity';
import { CoursesService } from './courses.service';
import { CoursesBusinessService } from './courses-business.service';
import { ModulesService } from './modules.service';
import { LessonsService } from './lessons.service';
import { CoursesController } from './courses.controller';
import { ModulesController } from './modules.controller';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { CourseVersion } from './course-version.entity';
import { CourseVersioningService } from './course-versioning.service';
import { CourseVersioningController } from './course-versioning.controller';
import { CoursePrerequisite } from './course-prerequisite.entity';
import { PrerequisitesService } from './prerequisites.service';
import { PrerequisitesController } from './prerequisites.controller';
import { CourseSchedulerService } from './course-scheduler.service';
import { CoursesRepository } from './repositories/courses.repository';
import { LessonsRepository } from './repositories/lessons.repository';
import { ModulesRepository } from './repositories/modules.repository';
import { ReviewsRepository } from './repositories/reviews.repository';
import { PrerequisitesRepository } from './repositories/prerequisites.repository';
import { CourseVersioningRepository } from './repositories/course-versioning.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Lesson,
      Review,
      Enrollment,
      CourseVersion,
      CoursePrerequisite,
    ]),
    SearchModule,
    NotificationsModule,
    CacheManagementModule,
    RepositoriesModule,
  ],
  providers: [
    CoursesRepository,
    LessonsRepository,
    ModulesRepository,
    ReviewsRepository,
    PrerequisitesRepository,
    CourseVersioningRepository,
    CoursesService,
    CoursesBusinessService,
    ModulesService,
    LessonsService,
    ReviewsService,
    CourseVersioningService,
    PrerequisitesService,
    CourseSchedulerService,
  ],
  controllers: [
    CoursesController,
    ModulesController,
    ReviewsController,
    CourseVersioningController,
    PrerequisitesController,
  ],
  exports: [
    CoursesService,
    CoursesBusinessService,
    PrerequisitesService,
    LessonsService,
    ModulesService,
    ReviewsService,
    CourseVersioningService,
  ],
})
export class CoursesModule {}
