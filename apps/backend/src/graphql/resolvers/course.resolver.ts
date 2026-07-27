import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { CoursesService } from '../../courses/courses.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../gql-auth.guard';
import { DataLoaderProvider } from '../dataloader.provider';

@Resolver('Course')
export class CourseResolver {
  constructor(private coursesService: CoursesService, private loaders: DataLoaderProvider) {}

  @Query()
  @UseGuards(GqlAuthGuard)
  async course(@Args('id') id: string) {
    return this.loaders.courseLoader.load(id);
  }

  @Query()
  @UseGuards(GqlAuthGuard)
  async courses(@Args('page') page = 1, @Args('limit') limit = 20) {
    // reuse service listing
    return this.coursesService.findAll ? this.coursesService.findAll({ page, limit }) : { data: [], meta: {} };
  }

  @ResolveField()
  async instructor(@Parent() course: any) {
    if (!course.instructorId) return null;
    return this.loaders.userLoader.load(course.instructorId);
  }
}
