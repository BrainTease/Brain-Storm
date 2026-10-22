import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CoursesService } from '../../courses/courses.service';
import { DataLoaderProvider } from '../dataloader.provider';

@Resolver('Course')
export class CourseResolver {
  constructor(
    private coursesService: CoursesService,
    private loaders: DataLoaderProvider
  ) {}

  @Query()
  @UseGuards(JwtAuthGuard)
  async course(@Args('id') id: string) {
    return this.loaders.courseLoader.load(id);
  }

  @Query()
  @UseGuards(JwtAuthGuard)
  async courses(@Args('page') page = 1, @Args('limit') limit = 20) {
    return this.coursesService.findAll({ page, limit });
  }

  @ResolveField()
  async instructor(@Parent() course: { instructorId?: string | null }) {
    if (!course.instructorId) return null;
    return this.loaders.userLoader.load(course.instructorId);
  }
}
