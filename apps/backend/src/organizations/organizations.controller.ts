import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto, InviteMemberDto } from './dto/organization.dto';
import { OrgRole } from './organization.entity';

@Controller('v1/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  async createOrganization(
    @CurrentUser() user: any,
    @Body() dto: CreateOrgDto,
  ) {
    return this.orgsService.createOrganization(user.id, dto);
  }

  @Get()
  async getMyOrganizations(@CurrentUser() user: any) {
    return this.orgsService.getUserOrganizations(user.id);
  }

  @Get(':orgId')
  async getOrganization(@Param('orgId') orgId: string) {
    return this.orgsService.getOrganization(orgId);
  }

  @Get(':orgId/members')
  async getMembers(@Param('orgId') orgId: string) {
    return this.orgsService.getOrganizationMembers(orgId);
  }

  @Post(':orgId/invite')
  async inviteMember(
    @Param('orgId') orgId: string,
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgsService.inviteMember(orgId, user.id, dto);
  }

  @Post('invite/:token/accept')
  async acceptInvite(
    @Param('token') inviteToken: string,
    @Query('email') email: string,
    @CurrentUser() user: any,
  ) {
    if (!email) throw new BadRequestException('Email is required');
    return this.orgsService.acceptInvite(inviteToken, user.id, email);
  }

  @Put(':orgId/members/:memberId/role')
  async changeRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body('role') role: OrgRole,
    @CurrentUser() user: any,
  ) {
    return this.orgsService.assignRoleToMember(orgId, memberId, role, user.id);
  }

  @Delete(':orgId/members/:memberId')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    await this.orgsService.removeMember(orgId, memberId, user.id);
    return { success: true };
  }

  @Get(':orgId/billing')
  async getBillingProfile(@Param('orgId') orgId: string) {
    return this.orgsService.getOrgBillingProfile(orgId);
  }

  @Put(':orgId/billing/budget')
  async updateBudget(
    @Param('orgId') orgId: string,
    @Body('monthlyBudget') monthlyBudget: number,
  ) {
    await this.orgsService.updateBillingBudget(orgId, monthlyBudget);
    return { success: true };
  }
}
