import { Resolver, Query, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UsersService } from '../../users/users.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../gql-auth.guard';
import { DataLoaderProvider } from '../dataloader.provider';

@Resolver('User')
export class UserResolver {
  constructor(private usersService: UsersService, private loaders: DataLoaderProvider) {}

  @Query()
  @UseGuards(GqlAuthGuard)
  async user(@Args('id') id: string) {
    return this.loaders.userLoader.load(id);
  }

  @Query()
  @UseGuards(GqlAuthGuard)
  async users(@Args('page') page = 1, @Args('limit') limit = 20) {
    return this.usersService.findAll({ page, limit });
  }

  @ResolveField()
  async progress(@Parent() user: any) {
    return this.loaders.progressByUserLoader.load(user.id);
  }
}
