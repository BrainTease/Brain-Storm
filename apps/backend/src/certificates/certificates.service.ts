import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Certificate } from './certificate.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { StellarService } from '../stellar/stellar.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly repo: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepo: Repository<Enrollment>,
    private readonly stellarService: StellarService,
  ) {}

  async issueCertificate(dto: IssueCertificateDto): Promise<Certificate> {
    const { userId, courseId } = dto;

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

    const existing = await this.repo.findOne({ where: { userId, courseId } });
    if (existing) {
      throw new BadRequestException('Certificate already issued for this course');
    }

    const certificateHash = this.generateHash(userId, courseId);
    const certificate = this.repo.create({
      userId,
      courseId,
      certificateHash,
      status: 'pending',
    });
    const saved = await this.repo.save(certificate);

    try {
      const stellarPublicKey = enrollment.user?.stellarPublicKey;
      if (stellarPublicKey) {
        const txId = await this.stellarService.issueCredential(
          stellarPublicKey,
          courseId,
        );
        saved.stellarTransactionId = txId;
        saved.status = 'minted';
        await this.repo.save(saved);
      }
      this.logger.log(`Certificate issued for user ${userId}, course ${courseId}`);
    } catch (error) {
      this.logger.error(`Stellar minting failed: ${error.message}`);
    }

    return saved;
  }

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

  private generateHash(userId: string, courseId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userId}:${courseId}:${Date.now()}`)
      .digest('hex');
  }
}
