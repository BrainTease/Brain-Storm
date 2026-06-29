import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { CourseModule } from '../courses/course-module.entity';
import { Lesson } from '../courses/lesson.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';
import { Notification } from '../notifications/notification.entity';
import { SeedService } from './seed.service';
import { SoftDeletePurgeService } from './soft-delete-purge.service';
import { ReadReplicaService } from './read-replica.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseModule,
      Lesson,
      Enrollment,
      Progress,
      Review,
      Notification,
    ]),
  ],
  providers: [SeedService, SoftDeletePurgeService, ReadReplicaService],
  exports: [SeedService, SoftDeletePurgeService, ReadReplicaService],
})
export class DatabaseModule {}
