import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrgRole } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationBillingProfile } from './organization-billing-profile.entity';
import { CreateOrgDto, InviteMemberDto } from './dto/organization.dto';
import { User } from '../users/user.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember) private memberRepo: Repository<OrganizationMember>,
    @InjectRepository(OrganizationBillingProfile) private billingRepo: Repository<OrganizationBillingProfile>,
  ) {}

  async createOrganization(userId: string, dto: CreateOrgDto) {
    // Check slug is unique
    const existing = await this.orgRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug already exists');

    const org = this.orgRepo.create({
      ...dto,
      seats: dto.seats || 10,
    });
    const saved = await this.orgRepo.save(org);

    // Add creator as OWNER
    const member = this.memberRepo.create({
      organizationId: saved.id,
      userId,
      role: OrgRole.OWNER,
    });
    await this.memberRepo.save(member);

    // Create billing profile
    const billing = this.billingRepo.create({
      organizationId: saved.id,
      stripeCustomerId: `org_${saved.id}`,
    });
    await this.billingRepo.save(billing);

    return saved;
  }

  async getOrganization(id: string) {
    return this.orgRepo.findOne({
      where: { id },
      relations: ['members', 'members.user', 'billingProfiles'],
    });
  }

  async getOrgBySlug(slug: string) {
    return this.orgRepo.findOne({
      where: { slug },
      relations: ['members', 'members.user'],
    });
  }

  async getUserOrganizations(userId: string) {
    const members = await this.memberRepo.find({
      where: { userId },
      relations: ['organization', 'organization.members'],
    });
    return members.map((m) => m.organization);
  }

  async inviteMember(orgId: string, userId: string, dto: InviteMemberDto) {
    // Check if invoker is org admin
    const invoker = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!invoker || ![OrgRole.OWNER, OrgRole.ADMIN].includes(invoker.role)) {
      throw new ForbiddenException('Only admins can invite members');
    }

    const org = await this.getOrganization(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    // Check seat availability
    if (org.usedSeats >= org.seats) {
      throw new BadRequestException('No available seats');
    }

    const inviteToken = randomBytes(32).toString('hex');
    const member = this.memberRepo.create({
      organizationId: orgId,
      invitedEmail: dto.email,
      role: dto.role,
      invitePending: true,
      inviteToken,
    });
    await this.memberRepo.save(member);

    // TODO: Send invite email
    return { inviteToken, email: dto.email };
  }

  async acceptInvite(inviteToken: string, userId: string, email: string) {
    const member = await this.memberRepo.findOne({
      where: { inviteToken, invitedEmail: email },
    });
    if (!member) throw new NotFoundException('Invite not found or expired');

    member.userId = userId;
    member.invitePending = false;
    member.inviteToken = null;
    await this.memberRepo.save(member);

    // Update org seat count
    await this.orgRepo.increment({ id: member.organizationId }, 'usedSeats', 1);

    return member;
  }

  async assignRoleToMember(orgId: string, memberId: string, role: OrgRole, updatedByUserId: string) {
    const updater = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: updatedByUserId },
    });
    if (!updater || updater.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only org owners can change roles');
    }

    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    member.role = role;
    return this.memberRepo.save(member);
  }

  async removeMember(orgId: string, memberId: string, userId: string) {
    const remover = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!remover || ![OrgRole.OWNER, OrgRole.ADMIN].includes(remover.role)) {
      throw new ForbiddenException('No permission to remove members');
    }

    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Only decrement if member is linked to org (not pending)
    if (member.userId) {
      await this.orgRepo.decrement({ id: orgId }, 'usedSeats', 1);
    }

    await this.memberRepo.delete(member.id);
  }

  async getOrganizationMembers(orgId: string) {
    return this.memberRepo.find({
      where: { organizationId: orgId },
      relations: ['user'],
    });
  }

  async getOrgBillingProfile(orgId: string) {
    return this.billingRepo.findOne({
      where: { organizationId: orgId },
    });
  }

  async updateBillingBudget(orgId: string, monthlyBudget: number) {
    return this.billingRepo.update(
      { organizationId: orgId },
      { monthlyBudget },
    );
  }
}
