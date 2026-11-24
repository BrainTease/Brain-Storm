import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { LoggerModule } from '../common/logger';
import { EncryptionService } from '../common/encryption.service';

import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditRetentionService } from './audit-retention.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), LoggerModule, ScheduleModule.forRoot()],
  providers: [AuditService, AuditRetentionService, EncryptionService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
