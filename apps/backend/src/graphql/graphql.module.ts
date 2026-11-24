import { join } from 'path';

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import depthLimit from 'graphql-depth-limit';

import { Course } from '../courses/course.entity';
import { CoursesModule } from '../courses/courses.module';
import { Progress } from '../progress/progress.entity';
import { ProgressModule } from '../progress/progress.module';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';

import { DataLoaderProvider } from './dataloader.provider';
import { CourseResolver } from './resolvers/course.resolver';
import { ProgressResolver } from './resolvers/progress.resolver';
import { UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'packages/types/src/schema.gql'),
      sortSchema: true,
      context: ({ req }) => ({ req }),
      validationRules: [depthLimit(6)],
    }),
    TypeOrmModule.forFeature([User, Progress, Course]),
    UsersModule,
    CoursesModule,
    ProgressModule,
  ],
  providers: [UserResolver, CourseResolver, ProgressResolver, DataLoaderProvider],
})
export class AppGraphQLModule {}
