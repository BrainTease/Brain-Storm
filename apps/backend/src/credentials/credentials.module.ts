import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { StellarModule } from '../stellar/stellar.module';
import { CertificatePdfService } from './certificate-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Credential]), forwardRef(() => StellarModule)],
  providers: [CredentialsService],
  controllers: [CredentialsController],
  exports: [CredentialsService],
})
export class CredentialsModule {}
