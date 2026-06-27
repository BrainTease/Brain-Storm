import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuditModule } from '../audit/audit.module';
import { ExportService } from './export.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditModule],
  providers: [ExportService],
  controllers: [PrivacyController],
})
export class GdprModule {}
