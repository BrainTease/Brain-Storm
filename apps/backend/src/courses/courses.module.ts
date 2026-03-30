import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';
import { Lesson } from './lesson.entity';
import { CoursesService } from './courses.service';
import { ModulesService } from './modules.service';
import { LessonsService } from './lessons.service';
import { CoursesController } from './courses.controller';
import { ModulesController } from './modules.controller';
import { Review } from './review.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseModule, Lesson, Review, Enrollment])],
  providers: [CoursesService, ModulesService, LessonsService, ReviewsService],
  controllers: [CoursesController, ModulesController, ReviewsController],
  exports: [CoursesService],
})
export class CoursesModule {}
