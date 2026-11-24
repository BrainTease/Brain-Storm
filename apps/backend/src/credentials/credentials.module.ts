import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoursesModule } from '../courses/courses.module';
import { KycModule } from '../kyc/kyc.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { StellarModule } from '../stellar/stellar.module';
import { UsersModule } from '../users/users.module';

import { BadgeAwardService } from './badge-award.service';
import { CertificateRenderer } from './certificate-pdf.service';
import { Credential } from './credential.entity';
import { CredentialsController } from './credentials.controller';
import { CredentialsRepository } from './credentials.repository';
import { CredentialsService } from './credentials.service';
import { PublicCredentialVerificationController } from './public-credential-verification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credential]),
    forwardRef(() => StellarModule),
    KycModule,
    CoursesModule,
    UsersModule,
    RepositoriesModule,
  ],
  providers: [
    CredentialsRepository,
    CredentialsService,
    CertificateRenderer,
    BadgeAwardService,
  ],
  controllers: [CredentialsController, PublicCredentialVerificationController],
  exports: [CredentialsService, BadgeAwardService],
})
export class CredentialsModule {}