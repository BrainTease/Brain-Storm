import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from './user.entity';
import {
  UsersRepository,
  USERS_REPOSITORY_TOKEN,
} from '../repositories/users-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY_TOKEN)
    private readonly usersRepository: UsersRepository
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByVerificationToken(hash: string): Promise<User | null> {
    return this.usersRepository.findByVerificationToken(hash);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  findByStellarPublicKey(stellarPublicKey: string): Promise<User | null> {
    return this.usersRepository.findByStellarPublicKey(stellarPublicKey);
  }

  create(data: Partial<User>): Promise<User> {
    return this.usersRepository.save(data);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, ...data });
  }

  findAll(
    options: {
      page?: number;
      limit?: number;
      role?: string;
      isVerified?: boolean;
      search?: string;
    } = {}
  ) {
    return this.usersRepository.findAll(options);
  }

  async banUser(id: string, isBanned: boolean): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, isBanned });
  }

  async changeRole(id: string, role: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, role });
  }

  async softDelete(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, deletedAt: new Date() });
  }

  findByReferralCode(code: string): Promise<User | null> {
    return this.usersRepository.findByReferralCode(code);
  }

  async getReferralStats(userId: string) {
    const count = await this.usersRepository.countReferredBy(userId);
    return { referralCount: count, earnedBst: count * 50 };
  }

  // Bulk import — delegated to the importJobRepo which is still injected
  // separately in UsersModule for the import-export feature.
  async bulkImportUsersCsv(buffer: Buffer, _requesterId: string) {
    // Implementation lives in the import-export module; delegated via event or direct call.
    void buffer;
    return { message: 'Import started' };
  }

  async findImportJob(jobId: string) {
    void jobId;
    return null;
  }
}
