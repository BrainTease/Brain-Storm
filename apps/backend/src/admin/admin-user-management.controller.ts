import { Body, Controller, Param, Patch, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './admin.dto';
import { AdminAuditInterceptor } from '../audit/admin-audit.interceptor';
import { AuditLog } from '../audit/audit-log.decorator';
import { AuditAction } from '../audit/audit-log.entity';

/**
 * Platform-level user moderation actions (ban / suspend / role change).
 * Split out of the former AdminController (#973) so user-management and
 * dispute-resolution each own a focused route file.
 *
 * `AdminAuditInterceptor` auto-logs every handler below that carries
 * `@AuditLog(...)` — new mutation endpoints are covered as soon as they
 * add the decorator, without touching the interceptor itself.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller('v1/admin/users')
export class AdminUserManagementController {
  constructor(private readonly adminService: AdminService) {}

  @Patch(':id/ban')
  @Roles('admin')
  @AuditLog(AuditAction.USER_BANNED)
  @ApiOperation({ summary: 'Ban or unban a user' })
  banUser(
    @Param('id') id: string,
    @Body('isBanned') isBanned: boolean,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.banUser(id, isBanned, req.user.id);
  }

  @Patch(':id/suspend')
  @Roles('admin')
  @AuditLog(AuditAction.ADMIN_ACTION)
  @ApiOperation({ summary: 'Suspend a user' })
  suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.suspendUser(id, dto, req.user.id);
  }

  @Patch(':id/role')
  @Roles('admin')
  @AuditLog(AuditAction.ROLE_CHANGED)
  @ApiOperation({ summary: 'Change user role' })
  changeRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.changeRole(id, role, req.user.id);
  }
}
