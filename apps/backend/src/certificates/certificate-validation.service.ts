/**
 * #808 — Certificate-Issuance: Validation Step
 *
 * Responsible for checking that an enrollment exists and the course has been
 * completed before a certificate can be issued.  Extracted from the monolithic
 * `CertificatesService.issueCertificate` method to give each step a clear,
 * independently-testable boundary.
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity';

export interface ValidatedEnrollment {
  enrollment: Enrollment;
}

@Injectable()
export class CertificateValidationService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>
  ) {}

  /**
   * Validate that the user is enrolled in the given course and has completed it.
   *
   * @throws BadRequestException if the enrollment does not exist or the course
   *   has not been marked as completed.
   */
  async validate(userId: string, courseId: string): Promise<ValidatedEnrollment> {
    const enrollment = await this.enrollmentsRepo.findOne({
      where: { userId, courseId },
      relations: ['user', 'course'],
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found for this user and course');
    }

    if (!enrollment.completedAt) {
      throw new BadRequestException('Course has not been completed yet');
    }

    return { enrollment };
  }
}
