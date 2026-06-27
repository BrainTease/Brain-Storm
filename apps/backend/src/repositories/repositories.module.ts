import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Credential } from '../credentials/credential.entity';
import { TypeOrmUsersRepository } from './typeorm-users.repository';
import { TypeOrmCoursesRepository } from './typeorm-courses.repository';
import { TypeOrmCredentialsRepository } from './typeorm-credentials.repository';

export const USERS_REPOSITORY_TOKEN = 'USERS_REPOSITORY';
export const COURSES_REPOSITORY_TOKEN = 'COURSES_REPOSITORY';
export const CREDENTIALS_REPOSITORY_TOKEN = 'CREDENTIALS_REPOSITORY';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Credential])],
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
  ],
  exports: [
    USERS_REPOSITORY_TOKEN,
    COURSES_REPOSITORY_TOKEN,
    CREDENTIALS_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}