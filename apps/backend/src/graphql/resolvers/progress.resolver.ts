import { Resolver, Query, Args } from '@nestjs/graphql';
import { ProgressService } from '../../progress/progress.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../gql-auth.guard';

@Resolver('Progress')
export class ProgressResolver {
  constructor(private progressService: ProgressService) {}

  @Query()
  @UseGuards(GqlAuthGuard)
  async progressByUser(@Args('userId') userId: string) {
    return this.progressService.findByUser(userId);
  }
}
