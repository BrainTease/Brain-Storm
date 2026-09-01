import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Credential } from '../credentials/credential.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { TypeOrmUsersRepository } from './typeorm-users.repository';
import { TypeOrmCoursesRepository } from './typeorm-courses.repository';
import { TypeOrmCredentialsRepository } from './typeorm-credentials.repository';
import { TypeOrmEnrollmentsRepository } from './typeorm-enrollments.repository';
import { TypeOrmProgressRepository } from './typeorm-progress.repository';
import { USERS_REPOSITORY_TOKEN } from './users-repository.interface';
import { COURSES_REPOSITORY_TOKEN } from './courses-repository.interface';

// Re-export tokens so consumers can import from this module.
export { USERS_REPOSITORY_TOKEN } from './users-repository.interface';
export { COURSES_REPOSITORY_TOKEN } from './courses-repository.interface';
export const CREDENTIALS_REPOSITORY_TOKEN = 'CREDENTIALS_REPOSITORY';
export const ENROLLMENTS_REPOSITORY_TOKEN = 'ENROLLMENTS_REPOSITORY';
export const PROGRESS_REPOSITORY_TOKEN = 'PROGRESS_REPOSITORY';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Credential, Enrollment, Progress])],
  providers: [
    {
      provide: USERS_REPOSITORY_TOKEN,
      useClass: TypeOrmUsersRepository,
    },
    {
      provide: COURSES_REPOSITORY_TOKEN,
      useClass: TypeOrmCoursesRepository,
    },
    {
      provide: CREDENTIALS_REPOSITORY_TOKEN,
      useClass: TypeOrmCredentialsRepository,
    },
    {
      provide: ENROLLMENTS_REPOSITORY_TOKEN,
      useClass: TypeOrmEnrollmentsRepository,
    },
    {
      provide: PROGRESS_REPOSITORY_TOKEN,
      useClass: TypeOrmProgressRepository,
    },
  ],
  exports: [
    USERS_REPOSITORY_TOKEN,
    COURSES_REPOSITORY_TOKEN,
    CREDENTIALS_REPOSITORY_TOKEN,
    ENROLLMENTS_REPOSITORY_TOKEN,
    PROGRESS_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}
