import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EncryptionService } from '../common/encryption.service';
import { LoggerModule } from '../common/logger';

import { AuditLog } from './audit-log.entity';
import { AuditRetentionService } from './audit-retention.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), LoggerModule, ScheduleModule.forRoot()],
  providers: [AuditService, AuditRetentionService, EncryptionService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
