import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Enrollment } from './enrollment.entity';
import { PrerequisitesService } from '../courses/prerequisites.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private repo: Repository<Enrollment>,
    private eventEmitter: EventEmitter2,
    private prereqService: PrerequisitesService,
  ) {}

  async enroll(userId: string, courseId: string, adminOverride = false): Promise<Enrollment> {
    const existing = await this.repo.findOne({ where: { userId, courseId } });
    if (existing) throw new ConflictException('Already enrolled in this course');

    await this.prereqService.enforcePrerequisites(userId, courseId, adminOverride);

    const enrollment = await this.repo.save(this.repo.create({ userId, courseId }));

    this.eventEmitter.emit('enrollment.created', {
      enrollmentId: enrollment.id,
      userId,
      courseId,
      enrolledAt: enrollment.enrolledAt,
    });

    return enrollment;
  }

  async unenroll(userId: string, courseId: string): Promise<void> {
    const enrollment = await this.repo.findOne({ where: { userId, courseId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.repo.remove(enrollment);
  }

  findByUser(userId: string): Promise<Enrollment[]> {
    return this.repo.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }
}
