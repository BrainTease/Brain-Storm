import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UsersService } from '../../users/users.service';
import { DataLoaderProvider } from '../dataloader.provider';

@Resolver('User')
export class UserResolver {
  constructor(
    private usersService: UsersService,
    private loaders: DataLoaderProvider
  ) {}

  @Query()
  @UseGuards(JwtAuthGuard)
  async user(@Args('id') id: string) {
    return this.loaders.userLoader.load(id);
  }

  @Query()
  @UseGuards(JwtAuthGuard)
  async users(@Args('page') page = 1, @Args('limit') limit = 20) {
    return this.usersService.findAll({ page, limit });
  }

  @ResolveField()
  async progress(@Parent() user: { id: string }) {
    return this.loaders.progressByUserLoader.load(user.id);
  }
}
