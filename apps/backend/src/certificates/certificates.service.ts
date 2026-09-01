/**
 * #808 — Modularised Certificate-Issuance Orchestrator
 *
 * `issueCertificate` now delegates each distinct concern to a focused service:
 *   1. `CertificateValidationService` — enrollment + completion check
 *   2. hash generation               — pure crypto, kept inline (one line)
 *   3. DB save                        — kept inline (direct repo call)
 *   4. `CertificateMintingService`   — Stellar network interaction
 *
 * All other query/verify methods are unchanged.
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Certificate } from './certificate.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { BadgeAwardService } from './badge-award.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { CertificateValidationService } from './certificate-validation.service';
import { CertificateMintingService } from './certificate-minting.service';

/**
 * CertificatesService
 *
 * Issue #818: on-chain credential issuance now delegates to `BadgeAwardService`
 * instead of calling `StellarService.issueCredential()` directly.  This ensures:
 *
 *  - Idempotency (CredentialsService deduplicates on userId+courseId).
 *  - KYC gate is enforced consistently.
 *  - Referral reward minting is not silently skipped.
 *  - A single unit test covers the award path (badge-award.service.spec.ts).
 */
@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly repo: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    private readonly badgeAwardService: BadgeAwardService
  ) {}

  // ── Step-based issuance ────────────────────────────────────────────────────

  async issueCertificate(dto: IssueCertificateDto): Promise<Certificate> {
    const { userId, courseId } = dto;

    // Step 1: Validate enrollment and completion
    const { enrollment } = await this.validationService.validate(userId, courseId);

    // Step 2: Guard against duplicates
    const existing = await this.repo.findOne({ where: { userId, courseId } });
    if (existing) {
      throw new BadRequestException('Certificate already issued for this course');
    }

    // Step 3: Persist the certificate record (status = 'pending')
    const certificateHash = this.generateHash(userId, courseId);
    const certificate = this.repo.create({ userId, courseId, certificateHash, status: 'pending' });
    const saved = await this.repo.save(certificate);

    // Delegate on-chain issuance + referral reward to BadgeAwardService (#818).
    const stellarPublicKey = enrollment.user?.stellarPublicKey;
    if (stellarPublicKey) {
      try {
        await this.badgeAwardService.awardOnCompletion(userId, courseId, stellarPublicKey);
        saved.status = 'minted';
        await this.repo.save(saved);
        this.logger.log(`Certificate minted for user=${userId} course=${courseId}`);
      } catch (error) {
        this.logger.error(
          `Badge award failed for user=${userId} course=${courseId}: ${(error as Error).message}`
        );
      }
    }

    return saved;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getCertificate(id: string): Promise<Certificate> {
    const cert = await this.repo.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.repo.find({
      where: { userId },
      relations: ['course'],
      order: { issuedAt: 'DESC' },
    });
  }

  async verifyCertificate(
    certificateHash: string
  ): Promise<{ valid: boolean; certificate?: Certificate }> {
    const cert = await this.repo.findOne({
      where: { certificateHash },
      relations: ['user', 'course'],
    });

    if (!cert) return { valid: false };

    return {
      valid: cert.status === 'minted' || cert.status === 'verified',
      certificate: cert,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private generateHash(userId: string, courseId: string): string {
    return crypto.createHash('sha256').update(`${userId}:${courseId}:${Date.now()}`).digest('hex');
  }
}
