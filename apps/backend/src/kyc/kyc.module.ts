import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { KycCustomer } from './kyc-customer.entity';
import { KycDocument } from './kyc-document.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KYC_PROVIDER } from './providers/kyc-provider.interface';
import { SynapsKycProvider } from './providers/synaps-kyc.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycCustomer, KycDocument]),
    MulterModule.register({ storage: undefined }),
  ],
  providers: [
    KycService,
    SynapsKycProvider,
    { provide: KYC_PROVIDER, useExisting: SynapsKycProvider },
  ],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}
