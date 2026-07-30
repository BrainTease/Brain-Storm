/**
 * DisputeResolutionService (#813)
 *
 * Responsibility: Manages the full lifecycle of dispute records — creation,
 * querying, and resolution. Extracted from AdminService to give dispute
 * management a clear, focused boundary and reduce the cyclomatic complexity
 * of the original monolithic service.
 *
 * Responsibilities owned by this service:
 *   • Creating new disputes (any authenticated user)
 *   • Listing disputes with optional status filter (admin)
 *   • Fetching a single dispute by id (admin)
 *   • Resolving or closing a dispute (admin)
 *
 * Explicitly NOT owned here (remains in AdminService):
 *   • User management (ban, suspend, role change)
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from './dispute.entity';
import { AuditService } from '../audit/audit.service';
import { CreateDisputeDto, ResolveDisputeDto } from './admin.dto';

/** Terminal statuses — a dispute in these states cannot be resolved again. */
const TERMINAL_STATUSES: DisputeStatus[] = [DisputeStatus.RESOLVED, DisputeStatus.CLOSED];

@Injectable()
export class DisputeResolutionService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    private readonly auditService: AuditService
  ) {}

  /**
   * Open a new dispute on behalf of the requesting user.
   */
  async createDispute(dto: CreateDisputeDto, userId: string): Promise<Dispute> {
    const dispute = this.disputeRepo.create({
      ...dto,
      submittedByUserId: userId,
      status: DisputeStatus.OPEN,
    });

    const saved = await this.disputeRepo.save(dispute);

    await this.auditService.log('admin.dispute_created', userId, true, {
      disputeId: saved.id,
    });

    return saved;
  }

  /**
   * Return all disputes, optionally filtered by status.
   */
  async listDisputes(status?: DisputeStatus): Promise<Dispute[]> {
    const where = status ? { status } : {};
    return this.disputeRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /**
   * Return a single dispute or throw NotFoundException.
   */
  async getDisputeOrThrow(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({ where: { id } });
    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }
    return dispute;
  }

  /**
   * Resolve or close an open dispute.
   *
   * Guards:
   *   - Dispute must exist (NotFoundException)
   *   - Dispute must not already be in a terminal state (BadRequestException)
   *   - Incoming status must be a terminal state (resolved / closed)
   */
  async resolveDispute(id: string, dto: ResolveDisputeDto, adminId: string): Promise<Dispute> {
    const dispute = await this.getDisputeOrThrow(id);

    if (this.isTerminal(dispute.status)) {
      throw new BadRequestException(
        `Dispute ${id} is already ${dispute.status} and cannot be updated`
      );
    }

    if (!this.isTerminal(dto.status)) {
      throw new BadRequestException(
        `Resolution status must be '${DisputeStatus.RESOLVED}' or '${DisputeStatus.CLOSED}'`
      );
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

  // ─── private helpers ────────────────────────────────────────────────────────

  private isTerminal(status: DisputeStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }
}
