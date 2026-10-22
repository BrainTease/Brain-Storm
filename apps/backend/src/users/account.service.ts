import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { User } from './user.entity';
import {
  UsersRepository,
  USERS_REPOSITORY_TOKEN,
} from '../repositories/users-repository.interface';

/**
 * Account and security actions on a user: ban, role change and soft delete. Profile reads and
 * edits stay in UsersService.
 */
@Injectable()
export class AccountService {
  constructor(
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: UsersRepository,
  ) {}

  private async findExisting(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async banUser(id: string, isBanned: boolean): Promise<User> {
    const user = await this.findExisting(id);
    return this.usersRepository.save({ ...user, isBanned });
  }

  async changeRole(id: string, role: string): Promise<User> {
    const user = await this.findExisting(id);
    return this.usersRepository.save({ ...user, role });
  }

  async softDelete(id: string): Promise<User> {
    const user = await this.findExisting(id);
    return this.usersRepository.save({ ...user, deletedAt: new Date() });
  }
}
