import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { StellarModule } from '../stellar/stellar.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { UsersModule } from '../users/users.module';
import { RepositoriesModule } from '../repositories/repositories.module';

/**
 * ProgressModule
 *
 * Uses RepositoriesModule for all DB access (#800) — no direct
 * TypeOrmModule.forFeature([Progress]) in this module.
 */
@Module({
  imports: [RepositoriesModule, StellarModule, CredentialsModule, UsersModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
