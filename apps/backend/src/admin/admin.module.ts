import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuditInterceptor } from '../audit/admin-audit.interceptor';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

import { AdminUserManagementController } from './admin-user-management.controller';
import { AdminService } from './admin.service';
import { DisputeResolutionService } from './dispute-resolution.service';
import { Dispute } from './dispute.entity';
import { DisputesController } from './disputes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute]), AuditModule, UsersModule],
  providers: [DisputeResolutionService, AdminService, AdminAuditInterceptor],
  controllers: [AdminUserManagementController, DisputesController],
  exports: [AdminService, DisputeResolutionService],
})
export class AdminModule {}
