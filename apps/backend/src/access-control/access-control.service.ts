import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CourseAccessControl, AccessRole } from './course-access-control.entity';
import { AccessLog } from './access-log.entity';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(CourseAccessControl) private accessRepo: Repository<CourseAccessControl>,
    @InjectRepository(AccessLog) private logRepo: Repository<AccessLog>,
  ) {}

  async grantAccess(
    courseId: string,
    userId: string,
    role: AccessRole,
    subscriptionExpiryDate?: Date,
    allowedIpAddresses?: string[],
  ) {
    const access = this.accessRepo.create({
      courseId,
      userId,
      role,
      subscriptionExpiryDate,
      allowedIpAddresses,
    });
    return this.accessRepo.save(access);
  }

  async checkAccess(
    courseId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const access = await this.accessRepo.findOne({
      where: { courseId, userId, isActive: true },
    });

    if (!access) {
      await this.logAccess(courseId, userId, 'access_denied', ipAddress, false, 'No access granted');
      return { allowed: false, reason: 'No access granted' };
    }

    if (access.subscriptionExpiryDate && new Date() > access.subscriptionExpiryDate) {
      await this.logAccess(courseId, userId, 'access_denied', ipAddress, false, 'Subscription expired');
      return { allowed: false, reason: 'Subscription expired' };
    }

    if (access.allowedIpAddresses && access.allowedIpAddresses.length > 0) {
      if (!access.allowedIpAddresses.includes(ipAddress)) {
        await this.logAccess(courseId, userId, 'access_denied', ipAddress, false, 'IP not allowed');
        return { allowed: false, reason: 'IP not allowed' };
      }
    }

    await this.logAccess(courseId, userId, 'access_granted', ipAddress, true);
    return { allowed: true };
  }

  async revokeAccess(courseId: string, userId: string) {
    return this.accessRepo.update(
      { courseId, userId },
      { isActive: false },
    );
  }

  async updateSubscription(courseId: string, userId: string, expiryDate: Date) {
    return this.accessRepo.update(
      { courseId, userId },
      { subscriptionExpiryDate: expiryDate },
    );
  }

  async logAccess(
    courseId: string,
    userId: string,
    action: string,
    ipAddress?: string,
    isAllowed: boolean = true,
    denialReason?: string,
  ) {
    const log = this.logRepo.create({
      courseId,
      userId,
      action,
      ipAddress,
      isAllowed,
      denialReason,
    });
    return this.logRepo.save(log);
  }

  async getAccessLogs(courseId: string, userId?: string, days: number = 30) {
    const query = this.logRepo.createQueryBuilder('log').where('log.courseId = :courseId', { courseId });

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    query.andWhere('log.timestamp >= :startDate', { startDate });

    return query.orderBy('log.timestamp', 'DESC').getMany();
  }

  async getAccessControl(courseId: string, userId: string) {
    return this.accessRepo.findOne({
      where: { courseId, userId },
    });
  }

  async getCourseAccessList(courseId: string) {
    return this.accessRepo.find({
      where: { courseId, isActive: true },
      relations: ['user'],
    });
  }
}
