import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from './dispute.entity';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { CreateDisputeDto, ResolveDisputeDto, SuspendUserDto } from './admin.dto';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService
  ) {}

  // ── User management ───────────────────────────────────────────────────────

  async banUser(targetId: string, isBanned: boolean, adminId: string) {
    const user = await this.usersService.banUser(targetId, isBanned);
    await this.auditService.log(
      isBanned ? AuditAction.USER_BANNED : 'admin.user_unbanned',
      adminId,
      true,
      { targetUserId: targetId }
    );
    return user;
  }

  async suspendUser(targetId: string, dto: SuspendUserDto, adminId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    // Store suspension as ban with metadata in audit log (no separate field needed)
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

  // ── Dispute management ────────────────────────────────────────────────────

  async createDispute(dto: CreateDisputeDto, userId: string): Promise<Dispute> {
    const dispute = this.disputeRepo.create({
      ...dto,
      submittedByUserId: userId,
      status: DisputeStatus.OPEN,
    });
    const saved = await this.disputeRepo.save(dispute);
    await this.auditService.log('admin.dispute_created', userId, true, { disputeId: saved.id });
    return saved;
  }

  async listDisputes(status?: DisputeStatus): Promise<Dispute[]> {
    const where = status ? { status } : {};
    return this.disputeRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto, adminId: string): Promise<Dispute> {
    const dispute = await this.getDisputeOrThrow(id);
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Dispute already resolved or closed');
    }

    dispute.status = dto.status;
    dispute.resolution = dto.resolution;
    dispute.resolvedByUserId = adminId;
    const saved = await this.disputeRepo.save(dispute);

    await this.auditService.log('admin.dispute_resolved', adminId, true, {
      disputeId: id,
      status: dto.status,
    });
    return saved;
  }

  async getDisputeOrThrow(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }
}
