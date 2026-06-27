import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { CreateDisputeDto, ResolveDisputeDto, SuspendUserDto } from './admin.dto';
import { DisputeStatus } from './dispute.entity';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── User management ───────────────────────────────────────────────────────

  @Patch('users/:id/ban')
  @Roles('admin')
  @ApiOperation({ summary: 'Ban or unban a user' })
  banUser(
    @Param('id') id: string,
    @Body('isBanned') isBanned: boolean,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.banUser(id, isBanned, req.user.id);
  }

  @Patch('users/:id/suspend')
  @Roles('admin')
  @ApiOperation({ summary: 'Suspend a user' })
  suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.suspendUser(id, dto, req.user.id);
  }

  @Patch('users/:id/role')
  @Roles('admin')
  @ApiOperation({ summary: 'Change user role' })
  changeRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.changeRole(id, role, req.user.id);
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  @Post('disputes')
  @Roles('admin', 'student', 'instructor')
  @ApiOperation({ summary: 'Create a dispute' })
  createDispute(@Body() dto: CreateDisputeDto, @Request() req: { user: { id: string } }) {
    return this.adminService.createDispute(dto, req.user.id);
  }

  @Get('disputes')
  @Roles('admin')
  @ApiOperation({ summary: 'List all disputes (admin)' })
  listDisputes(@Query('status') status?: DisputeStatus) {
    return this.adminService.listDisputes(status);
  }

  @Get('disputes/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a dispute (admin)' })
  getDispute(@Param('id') id: string) {
    return this.adminService.getDisputeOrThrow(id);
  }

  @Patch('disputes/:id/resolve')
  @Roles('admin')
  @ApiOperation({ summary: 'Resolve a dispute (admin)' })
  resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Request() req: { user: { id: string } }
  ) {
    return this.adminService.resolveDispute(id, dto, req.user.id);
  }
}
