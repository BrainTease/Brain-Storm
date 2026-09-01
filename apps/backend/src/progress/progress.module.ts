import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { StellarModule } from '../stellar/stellar.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { RepositoriesModule } from '../repositories/repositories.module';

/**
 * ProgressModule
 *
 * Uses RepositoriesModule for all DB access (#800).
 *
 * Issue #818: badge-award logic (credential issuance + referral rewards) is now
 * owned by BadgeAwardService, which is provided by CredentialsModule.
 * ProgressService no longer depends on UsersService or CredentialsService
 * directly — it delegates to BadgeAwardService instead.
 */
@Module({
  imports: [RepositoriesModule, StellarModule, CredentialsModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
