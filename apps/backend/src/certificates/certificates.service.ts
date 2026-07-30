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
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Certificate } from './certificate.entity';
import { StellarService } from '../stellar/stellar.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { CertificateValidationService } from './certificate-validation.service';
import { CertificateMintingService } from './certificate-minting.service';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly repo: Repository<Certificate>,
    // StellarService is kept for backward-compatible injection; minting is
    // delegated to CertificateMintingService.
    private readonly stellarService: StellarService,
    private readonly validationService: CertificateValidationService,
    private readonly mintingService: CertificateMintingService,
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

    // Step 4: Mint on Stellar (non-fatal on failure)
    return this.mintingService.mint(saved, enrollment.user?.stellarPublicKey);
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
    certificateHash: string,
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
    return crypto
      .createHash('sha256')
      .update(`${userId}:${courseId}:${Date.now()}`)
      .digest('hex');
  }
}
