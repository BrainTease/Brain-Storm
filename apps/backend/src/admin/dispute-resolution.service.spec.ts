/**
 * Unit tests for DisputeResolutionService (#813).
 *
 * Verifies all dispute lifecycle operations — creation, listing, lookup,
 * and resolution — in isolation with jest mocks (no DB or audit service).
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DisputeResolutionService } from './dispute-resolution.service';
import { Dispute, DisputeStatus, DisputeType } from './dispute.entity';
import { CreateDisputeDto, ResolveDisputeDto } from './admin.dto';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: 'dispute-1',
    type: DisputeType.OTHER,
    status: DisputeStatus.OPEN,
    submittedByUserId: 'user-1',
    description: 'Test dispute',
    targetEntityId: null,
    targetEntityType: null,
    resolvedByUserId: null,
    resolution: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation(async (r: any) => r),
    ...overrides,
  };
}

function makeAuditService() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeService(repoOverrides: Partial<Record<string, jest.Mock>> = {}) {
  const repo = makeRepo(repoOverrides);
  const auditService = makeAuditService();
  return {
    service: new DisputeResolutionService(repo as any, auditService as any),
    repo,
    auditService,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// createDispute
// ═════════════════════════════════════════════════════════════════════════════

describe('DisputeResolutionService.createDispute', () => {
  it('creates a dispute with OPEN status and logs an audit event', async () => {
    const savedDispute = makeDispute({ id: 'new-dispute' });
    const { service, repo, auditService } = makeService({
      save: jest.fn().mockResolvedValue(savedDispute),
    });

    const dto: CreateDisputeDto = {
      type: DisputeType.BILLING,
      description: 'Incorrect charge',
    };

    const result = await service.createDispute(dto, 'user-1');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DisputeStatus.OPEN,
        submittedByUserId: 'user-1',
      })
    );
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('new-dispute');
    expect(auditService.log).toHaveBeenCalledWith(
      'admin.dispute_created',
      'user-1',
      true,
      expect.objectContaining({ disputeId: 'new-dispute' })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// listDisputes
// ═════════════════════════════════════════════════════════════════════════════

describe('DisputeResolutionService.listDisputes', () => {
  it('returns all disputes when no status filter is provided', async () => {
    const disputes = [makeDispute(), makeDispute({ id: 'd2', status: DisputeStatus.RESOLVED })];
    const { service, repo } = makeService({
      find: jest.fn().mockResolvedValue(disputes),
    });

    const result = await service.listDisputes();

    expect(repo.find).toHaveBeenCalledWith({ where: {}, order: { createdAt: 'DESC' } });
    expect(result).toHaveLength(2);
  });

  it('filters disputes by status when provided', async () => {
    const openDisputes = [makeDispute()];
    const { service, repo } = makeService({
      find: jest.fn().mockResolvedValue(openDisputes),
    });

    const result = await service.listDisputes(DisputeStatus.OPEN);

    expect(repo.find).toHaveBeenCalledWith({
      where: { status: DisputeStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getDisputeOrThrow
// ═════════════════════════════════════════════════════════════════════════════

describe('DisputeResolutionService.getDisputeOrThrow', () => {
  it('returns the dispute when it exists', async () => {
    const dispute = makeDispute({ id: 'exists' });
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
    });

    const result = await service.getDisputeOrThrow('exists');
    expect(result.id).toBe('exists');
  });

  it('throws NotFoundException when the dispute does not exist', async () => {
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(service.getDisputeOrThrow('missing')).rejects.toThrow(NotFoundException);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// resolveDispute
// ═════════════════════════════════════════════════════════════════════════════

describe('DisputeResolutionService.resolveDispute', () => {
  it('resolves an open dispute and logs an audit event', async () => {
    const dispute = makeDispute({ status: DisputeStatus.OPEN });
    const { service, auditService } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
      save: jest.fn().mockImplementation(async (r: any) => r),
    });

    const dto: ResolveDisputeDto = {
      status: DisputeStatus.RESOLVED,
      resolution: 'Refund issued',
    };

    const result = await service.resolveDispute('dispute-1', dto, 'admin-1');

    expect(result.status).toBe(DisputeStatus.RESOLVED);
    expect(result.resolution).toBe('Refund issued');
    expect(result.resolvedByUserId).toBe('admin-1');
    expect(auditService.log).toHaveBeenCalledWith(
      'admin.dispute_resolved',
      'admin-1',
      true,
      expect.objectContaining({ status: DisputeStatus.RESOLVED })
    );
  });

  it('resolves an under_review dispute (not just open)', async () => {
    const dispute = makeDispute({ status: DisputeStatus.UNDER_REVIEW });
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
      save: jest.fn().mockImplementation(async (r: any) => r),
    });

    const dto: ResolveDisputeDto = {
      status: DisputeStatus.CLOSED,
      resolution: 'No action needed',
    };

    const result = await service.resolveDispute('dispute-1', dto, 'admin-1');
    expect(result.status).toBe(DisputeStatus.CLOSED);
  });

  it('throws BadRequestException when dispute is already resolved', async () => {
    const dispute = makeDispute({ status: DisputeStatus.RESOLVED });
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
    });

    const dto: ResolveDisputeDto = {
      status: DisputeStatus.CLOSED,
      resolution: 'Another attempt',
    };

    await expect(service.resolveDispute('dispute-1', dto, 'admin-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when dispute is already closed', async () => {
    const dispute = makeDispute({ status: DisputeStatus.CLOSED });
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
    });

    const dto: ResolveDisputeDto = {
      status: DisputeStatus.RESOLVED,
      resolution: 'Too late',
    };

    await expect(service.resolveDispute('dispute-1', dto, 'admin-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when resolution status is not terminal', async () => {
    const dispute = makeDispute({ status: DisputeStatus.OPEN });
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(dispute),
    });

    // Trying to "resolve" to UNDER_REVIEW is not allowed
    const dto = {
      status: DisputeStatus.UNDER_REVIEW,
      resolution: 'This should fail',
    } as unknown as ResolveDisputeDto;

    await expect(service.resolveDispute('dispute-1', dto, 'admin-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws NotFoundException when the dispute does not exist', async () => {
    const { service } = makeService({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const dto: ResolveDisputeDto = {
      status: DisputeStatus.RESOLVED,
      resolution: 'Whatever',
    };

    await expect(service.resolveDispute('ghost', dto, 'admin-1')).rejects.toThrow(
      NotFoundException
    );
  });
});
