import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Args } from '@nestjs/graphql';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProgressService } from '../../progress/progress.service';

@Resolver('Progress')
export class ProgressResolver {
  constructor(private progressService: ProgressService) {}

  @Query()
  @UseGuards(JwtAuthGuard)
  async progressByUser(@Args('userId') userId: string) {
    return this.progressService.findByUser(userId);
  }
}
