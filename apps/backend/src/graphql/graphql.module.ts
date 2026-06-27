import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import depthLimit from 'graphql-depth-limit';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { ProgressModule } from '../progress/progress.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { Course } from '../courses/course.entity';
import { UserResolver } from './resolvers/user.resolver';
import { CourseResolver } from './resolvers/course.resolver';
import { ProgressResolver } from './resolvers/progress.resolver';
import { DataLoaderProvider } from './dataloader.provider';

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
