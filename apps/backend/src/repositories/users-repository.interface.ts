import { User } from '../users/user.entity';
import { BaseRepository } from './base-repository.interface';

export interface UsersRepository extends BaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(hash: string): Promise<User | null>;
  findAll(options: {
    page?: number;
    limit?: number;
    role?: string;
    isVerified?: boolean;
    search?: string;
  }): Promise<{
    data: User[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>;
}