import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Enrollment } from './enrollment.entity';
import { PrerequisitesService } from '../courses/prerequisites.service';
import { ENROLLMENTS_REPOSITORY_TOKEN } from '../repositories/repositories.module';
import { EnrollmentsRepository } from '../repositories/enrollments-repository.interface';

/**
 * EnrollmentsService
 *
 * All database access is delegated to EnrollmentsRepository (#800).
 * No direct @InjectRepository(Enrollment) — the repository abstraction
 * is the single seam for enrollment query logic.
 */
@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(ENROLLMENTS_REPOSITORY_TOKEN)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prereqService: PrerequisitesService
  ) {}

  async enroll(userId: string, courseId: string, adminOverride = false): Promise<Enrollment> {
    const existing = await this.enrollmentsRepository.findByUserAndCourse(userId, courseId);
    if (existing) throw new ConflictException('Already enrolled in this course');

    await this.prereqService.enforcePrerequisites(userId, courseId, adminOverride);

    const enrollment = await this.enrollmentsRepository.save({ userId, courseId });

    this.eventEmitter.emit('enrollment.created', {
      enrollmentId: enrollment.id,
      userId,
      courseId,
      enrolledAt: enrollment.enrolledAt,
    });

    return enrollment;
  }

  async unenroll(userId: string, courseId: string): Promise<void> {
    const enrollment = await this.enrollmentsRepository.findByUserAndCourse(userId, courseId);
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.enrollmentsRepository.remove(enrollment);
  }

  async findById(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findByIdWithRelations(id);
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async deleteById(id: string): Promise<void> {
    const enrollment = await this.findById(id);
    await this.enrollmentsRepository.remove(enrollment);
  }

  findByUser(userId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.findByUser(userId);
  }
}
