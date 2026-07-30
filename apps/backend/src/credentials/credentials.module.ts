import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { PublicCredentialVerificationController } from './public-credential-verification.controller';
import { BadgeAwardService } from './badge-award.service';
import { StellarModule } from '../stellar/stellar.module';
import { KycModule } from '../kyc/kyc.module';
import { CoursesModule } from '../courses/courses.module';
import { CertificatePdfService } from './certificate-pdf.service';
import { UsersModule } from '../users/users.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credential]),
    forwardRef(() => StellarModule),
    KycModule,
    CoursesModule,
    UsersModule,
    RepositoriesModule,
  ],
  providers: [CredentialsService, CertificatePdfService, BadgeAwardService],
  controllers: [CredentialsController, PublicCredentialVerificationController],
  exports: [CredentialsService, BadgeAwardService],
})
export class CredentialsModule {}
