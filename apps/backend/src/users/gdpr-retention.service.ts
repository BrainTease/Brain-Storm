import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../users/user.entity';

const RETENTION_DAYS = 30; // soft-deleted records recoverable for 30 days

@Injectable()
export class GdprRetentionService {
  private readonly logger = new Logger(GdprRetentionService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** Soft-delete: sets deletedAt, does NOT erase data yet */
  async softDeleteUser(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.save({ ...user, deletedAt: new Date() });
  }

  /** Recover a soft-deleted user within the retention window */
  async recoverUser(id: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('u.deletedAt IS NOT NULL')
      .getOne();
    if (!user) throw new NotFoundException('No soft-deleted user found');
    return this.userRepo.save({ ...user, deletedAt: null });
  }

  /** GDPR export: return all data held for a user */
  async exportUserData(id: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    // Omit sensitive hashes from export
    const { passwordHash, verificationToken, ...exportData } = user as any;
    return exportData;
  }

  /** Hard purge: called by scheduler after retention window expires */
  async purgeExpiredUsers(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const expired = await this.userRepo.find({
      where: { deletedAt: LessThan(cutoff) },
    });
    if (!expired.length) return 0;

    // Anonymize before hard delete
    for (const user of expired) {
      await this.userRepo.save({
        ...user,
        email: `purged-${user.id}@deleted.invalid`,
        username: null,
        avatar: null,
        bio: null,
        stellarPublicKey: null,
        passwordHash: '',
        verificationToken: null,
      });
    }
    await this.userRepo.remove(expired);
    this.logger.log(`Purged ${expired.length} expired soft-deleted users`);
    return expired.length;
  }

  /** Scheduled job: runs nightly */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledPurge() {
    await this.purgeExpiredUsers();
  }
}
