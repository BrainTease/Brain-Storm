import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './certificate.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificatePdfService } from './certificate-pdf.service';
import { CredentialsModule } from '../credentials/credentials.module';

/**
 * CertificatesModule
 *
 * Issue #818: StellarModule import removed — CertificatesService no longer
 * calls StellarService directly.  On-chain issuance now delegates to
 * BadgeAwardService (provided by CredentialsModule).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Enrollment]), CredentialsModule],
  providers: [CertificatesService, CertificatePdfService],
  controllers: [CertificatesController],
  exports: [CertificatesService],
})
export class CertificatesModule {}
