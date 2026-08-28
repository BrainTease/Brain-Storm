import { User } from '../users/user.entity';
import { BaseRepository } from './base-repository.interface';

export const USERS_REPOSITORY_TOKEN = 'USERS_REPOSITORY';

export interface UsersRepository extends BaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(hash: string): Promise<User | null>;
  findByStellarPublicKey(stellarPublicKey: string): Promise<User | null>;
  findByReferralCode(code: string): Promise<User | null>;
  countReferredBy(userId: string): Promise<number>;
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
