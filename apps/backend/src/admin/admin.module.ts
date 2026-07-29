import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './dispute.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DisputeResolutionService } from './dispute-resolution.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute]), AuditModule, UsersModule],
  providers: [DisputeResolutionService, AdminService],
  controllers: [AdminController],
  exports: [AdminService, DisputeResolutionService],
})
export class AdminModule {}
