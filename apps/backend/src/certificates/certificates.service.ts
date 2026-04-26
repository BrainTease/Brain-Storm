import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './certificate.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { StellarService } from '../stellar/stellar.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate)
    private certificatesRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    private stellarService: StellarService,
    private configService: ConfigService,
  ) {}

  async issueCertificate(userId: string, courseId: string): Promise<Certificate> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { userId, courseId, completedAt: null },
      relations: ['user', 'course'],
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found or course not completed');
    }

    const existingCert = await this.certificatesRepository.findOne({
      where: { userId, courseId },
    });

    if (existingCert) {
      throw new BadRequestException('Certificate already issued for this course');
    }

    const certificateHash = this.generateCertificateHash(userId, courseId);
    const certificate = this.certificatesRepository.create({
      userId,
      courseId,
      certificateHash,
      status: 'pending',
    });

    const saved = await this.certificatesRepository.save(certificate);

    try {
      const txId = await this.stellarService.mintCertificateNFT(
        enrollment.user.stellarPublicKey,
        certificateHash,
        enrollment.course.title,
      );

      saved.stellarTransactionId = txId;
      saved.status = 'minted';
      await this.certificatesRepository.save(saved);
      this.logger.log(`Certificate minted for user ${userId} on course ${courseId}`);
    } catch (error) {
      this.logger.error(`Failed to mint certificate: ${error.message}`);
    }

    return saved;
  }

  async getCertificate(id: string): Promise<Certificate> {
    const cert = await this.certificatesRepository.findOne({ where: { id } });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }
    return cert;
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.certificatesRepository.find({
      where: { userId },
      relations: ['course'],
    });
  }

  async verifyCertificate(certificateHash: string): Promise<{ valid: boolean; certificate?: Certificate }> {
    const cert = await this.certificatesRepository.findOne({
      where: { certificateHash },
      relations: ['user', 'course'],
    });

    if (!cert) {
      return { valid: false };
    }

    return {
      valid: cert.status === 'minted' || cert.status === 'verified',
      certificate: cert,
    };
  }

  private generateCertificateHash(userId: string, courseId: string): string {
    const data = `${userId}:${courseId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
