import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './certificate.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { CertificateValidationService } from './certificate-validation.service';
import { CertificateMintingService } from './certificate-minting.service';
import { CertificatesController } from './certificates.controller';
import { StellarModule } from '../stellar/stellar.module';
import { PdfBuilderService } from '../common/services/pdf-builder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Enrollment]), StellarModule],
  providers: [
    PdfBuilderService,
    CertificatePdfService,
    CertificateValidationService,
    CertificateMintingService,
    CertificatesService,
  ],
  controllers: [CertificatesController],
  exports: [CertificatesService],
})
export class CertificatesModule {}
