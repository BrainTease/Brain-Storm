import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './dispute.entity';
import { AdminService } from './admin.service';
import { AdminUserManagementController } from './admin-user-management.controller';
import { DisputesController } from './disputes.controller';
import { DisputeResolutionService } from './dispute-resolution.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute]), AuditModule, UsersModule],
  providers: [DisputeResolutionService, AdminService],
  controllers: [AdminUserManagementController, DisputesController],
  exports: [AdminService, DisputeResolutionService],
})
export class AdminModule {}
