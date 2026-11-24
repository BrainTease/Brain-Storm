import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from '../enrollments/enrollment.entity';
import { CredentialsModule } from '../credentials/credentials.module';

import { Certificate } from './certificate.entity';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';

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
