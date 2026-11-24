import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiKey } from '../auth/api-key.entity';

import { AwsSecretsService } from './aws-secrets.service';
import { SecretAccessLog } from './secret-access-log.entity';
import { SecretRotationController } from './secret-rotation.controller';
import { SecretRotation } from './secret-rotation.entity';
import { SecretRotationService } from './secret-rotation.service';
import { SecretsAccessor } from './secrets.accessor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([SecretRotation, ApiKey, SecretAccessLog]),
  ],
  providers: [SecretRotationService, AwsSecretsService, SecretsAccessor],
  controllers: [SecretRotationController],
  exports: [SecretRotationService, AwsSecretsService, SecretsAccessor],
})
export class SecretRotationModule {}
