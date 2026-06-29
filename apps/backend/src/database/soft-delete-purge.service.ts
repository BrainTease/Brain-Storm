import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

@Injectable()
export class SoftDeletePurgeService {
  private readonly logger = new Logger(SoftDeletePurgeService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /**
   * Purge soft-deleted records older than the specified retention period.
   * @param retentionDays Number of days to retain soft-deleted records (default: 90)
   */
  async purgeExpired(retentionDays: number = 90): Promise<PurgeResult> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    this.logger.log(`Purging soft-deleted records older than ${retentionDays} days (cutoff: ${cutoff.toISOString()})`);

    const result: PurgeResult = {
      usersPurged: 0,
      coursesPurged: 0,
      retentionDays,
      cutoff,
    };

    // Purge soft-deleted users
    result.usersPurged = await this.purgeUsers(cutoff);

    // Purge soft-deleted courses
    result.coursesPurged = await this.purgeCourses(cutoff);

    this.logger.log(`Purge completed: ${result.usersPurged} users, ${result.coursesPurged} courses removed`);

    return result;
  }

  private async purgeUsers(cutoff: Date): Promise<number> {
    const expiredUsers = await this.userRepository.find({
      where: {
        deletedAt: LessThan(cutoff),
      },
      select: ['id'],
    });

    if (expiredUsers.length === 0) {
      this.logger.log('No expired users to purge');
      return 0;
    }

    this.logger.log(`Purging ${expiredUsers.length} expired users...`);
    const result = await this.userRepository.delete(expiredUsers.map(u => u.id));
    return result.affected || 0;
  }

  private async purgeCourses(cutoff: Date): Promise<number> {
    const expiredCourses = await this.courseRepository.find({
      where: {
        deletedAt: LessThan(cutoff),
      },
      select: ['id'],
    });

    if (expiredCourses.length === 0) {
      this.logger.log('No expired courses to purge');
      return 0;
    }

    this.logger.log(`Purging ${expiredCourses.length} expired courses...`);
    const result = await this.courseRepository.delete(expiredCourses.map(c => c.id));
    return result.affected || 0;
  }

  /**
   * Dry run to preview what would be purged without actually deleting.
   */
  async previewPurge(retentionDays: number = 90): Promise<PurgePreview> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const expiredUsers = await this.userRepository.count({
      where: { deletedAt: LessThan(cutoff) },
    });

    const expiredCourses = await this.courseRepository.count({
      where: { deletedAt: LessThan(cutoff) },
    });

    return {
      expiredUsers,
      expiredCourses,
      retentionDays,
      cutoff,
    };
  }
}

export interface PurgeResult {
  usersPurged: number;
  coursesPurged: number;
  retentionDays: number;
  cutoff: Date;
}

export interface PurgePreview {
  expiredUsers: number;
  expiredCourses: number;
  retentionDays: number;
  cutoff: Date;
}