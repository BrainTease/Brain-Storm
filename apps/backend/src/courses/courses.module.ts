import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheManagementModule } from '../cache/cache-management.module';
import { Enrollment } from '../enrollments/enrollment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RepositoriesModule } from '../repositories';
import { SearchModule } from '../search/search.module';

import { CourseModule } from './course-module.entity';
import { CoursePrerequisite } from './course-prerequisite.entity';
import { CourseSchedulerService } from './course-scheduler.service';
import { CourseVersion } from './course-version.entity';
import { CourseVersioningController } from './course-versioning.controller';
import { CourseVersioningService } from './course-versioning.service';
import { Course } from './course.entity';
import { CoursesBusinessService } from './courses-business.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Lesson } from './lesson.entity';
import { LessonsService } from './lessons.service';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { PrerequisitesController } from './prerequisites.controller';
import { PrerequisitesService } from './prerequisites.service';
import { CourseVersioningRepository } from './repositories/course-versioning.repository';
import { CoursesRepository } from './repositories/courses.repository';
import { LessonsRepository } from './repositories/lessons.repository';
import { ModulesRepository } from './repositories/modules.repository';
import { PrerequisitesRepository } from './repositories/prerequisites.repository';
import { ReviewsRepository } from './repositories/reviews.repository';
import { Review } from './review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

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
