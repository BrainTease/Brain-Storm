/**
 * AdminService (#813)
 *
 * Responsibility: Platform-level user management (ban, suspend, role change).
 * Dispute-resolution logic has been extracted into DisputeResolutionService
 * to reduce cyclomatic complexity and give each concern a focused boundary.
 *
 * Dispute methods are thin delegators kept here for backwards-compatibility
 * with AdminController — the real logic lives in DisputeResolutionService.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { CreateDisputeDto, ResolveDisputeDto, SuspendUserDto } from './admin.dto';
import { AuditAction } from '../audit/audit-log.entity';
import { Dispute, DisputeStatus } from './dispute.entity';
import { DisputeResolutionService } from './dispute-resolution.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly disputeResolutionService: DisputeResolutionService,
  ) {}

  // ── User management ───────────────────────────────────────────────────────

  async banUser(targetId: string, isBanned: boolean, adminId: string) {
    const user = await this.usersService.banUser(targetId, isBanned);
    await this.auditService.log(
      isBanned ? AuditAction.USER_BANNED : 'admin.user_unbanned',
      adminId,
      true,
      { targetUserId: targetId },
    );
    return user;
  }

  async suspendUser(targetId: string, dto: SuspendUserDto, adminId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.usersService.update(targetId, { isBanned: true });
    await this.auditService.log('admin.user_suspended', adminId, true, {
      targetUserId: targetId,
      reason: dto.reason,
      until: dto.until ?? null,
    });
    return updated;
  }

  async changeRole(targetId: string, role: string, adminId: string) {
    const user = await this.usersService.changeRole(targetId, role);
    await this.auditService.log(AuditAction.ROLE_CHANGED, adminId, true, {
      targetUserId: targetId,
      newRole: role,
    });
    return user;
  }

  // ── Dispute management (delegated) ────────────────────────────────────────

  async createDispute(dto: CreateDisputeDto, userId: string): Promise<Dispute> {
    return this.disputeResolutionService.createDispute(dto, userId);
  }

  async listDisputes(status?: DisputeStatus): Promise<Dispute[]> {
    return this.disputeResolutionService.listDisputes(status);
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto, adminId: string): Promise<Dispute> {
    return this.disputeResolutionService.resolveDispute(id, dto, adminId);
  }

  async getDisputeOrThrow(id: string): Promise<Dispute> {
    return this.disputeResolutionService.getDisputeOrThrow(id);
  }
}
