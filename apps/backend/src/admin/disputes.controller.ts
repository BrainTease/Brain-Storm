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
import { CreateDisputeDto, ResolveDisputeDto, DisputeQueryDto } from './admin.dto';
import { DisputeStatus } from './dispute.entity';

/**
 * Dispute resource routes. Split out of the former AdminController (#973)
 * so dispute-resolution owns a focused route file separate from user
 * moderation (see AdminUserManagementController).
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/admin/disputes')
export class DisputesController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Roles('admin', 'student', 'instructor')
  @ApiOperation({ summary: 'Create a dispute' })
  createDispute(@Body() dto: CreateDisputeDto, @Request() req: { user: { id: string } }) {
    return this.adminService.createDispute(dto, req.user.id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all disputes (admin)' })
  listDisputes(@Query() query: DisputeQueryDto) {
    return this.adminService.listDisputes(query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a dispute (admin)' })
  getDispute(@Param('id') id: string) {
    return this.adminService.getDisputeOrThrow(id);
  }

  @Patch(':id/resolve')
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
