/**
 * Unit tests for #809 — Refactor grants API to separate business logic
 *
 * Covers:
 *  - GrantsBusinessService.assertUpdatePermission
 *  - GrantsBusinessService.applyCreateDefaults
 *  - GrantsBusinessService.resolvePagination
 *  - GrantsService delegation to GrantsBusinessService (integration at unit level)
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GrantsBusinessService } from '../grants-business.service';
import { GrantsService } from '../grants.service';
import type { Grant } from '../grant.entity';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const APPLICANT_ID = 'applicant-uuid-001';
const REVIEWER_ID = 'reviewer-uuid-002';
const OTHER_ID = 'other-uuid-003';

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: 'grant-uuid-001',
    title: 'Test Grant',
    description: 'Test description',
    amount: 5000,
    currency: 'USD',
    applicantId: APPLICANT_ID,
    status: 'open',
    reviewNotes: null,
    reviewerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Grant;
}

// ─── GrantsBusinessService ────────────────────────────────────────────────────

describe('GrantsBusinessService', () => {
  let service: GrantsBusinessService;

  beforeEach(() => {
    service = new GrantsBusinessService();
  });

  // ── assertUpdatePermission ───────────────────────────────────────────────

  describe('assertUpdatePermission', () => {
    it('allows the applicant to change any field', () => {
      const grant = makeGrant();
      const dto = { title: 'New title', status: 'under_review' as const };

      expect(() => service.assertUpdatePermission(grant, dto, APPLICANT_ID)).not.toThrow();
    });

    it('allows a reviewer to update status', () => {
      const grant = makeGrant();
      const dto = { status: 'approved' as const };

      expect(() => service.assertUpdatePermission(grant, dto, REVIEWER_ID)).not.toThrow();
    });

    it('allows a reviewer to update reviewNotes', () => {
      const grant = makeGrant();
      const dto = { reviewNotes: 'Looks good' };

      expect(() => service.assertUpdatePermission(grant, dto, REVIEWER_ID)).not.toThrow();
    });

    it('allows a reviewer to update reviewerId', () => {
      const grant = makeGrant();
      const dto = { reviewerId: REVIEWER_ID };

      expect(() => service.assertUpdatePermission(grant, dto, REVIEWER_ID)).not.toThrow();
    });

    it('throws ForbiddenException when a non-applicant tries to change title', () => {
      const grant = makeGrant();
      const dto = { title: 'Hacked title' };

      expect(() => service.assertUpdatePermission(grant, dto, OTHER_ID)).toThrow(
        ForbiddenException
      );
    });

    it('throws ForbiddenException when a non-applicant tries to change amount', () => {
      const grant = makeGrant();
      const dto = { amount: 99999 };

      expect(() => service.assertUpdatePermission(grant, dto, OTHER_ID)).toThrow(
        ForbiddenException
      );
    });

    it('throws when a reviewer mixes reviewer + non-reviewer fields', () => {
      const grant = makeGrant();
      const dto = { status: 'approved' as const, title: 'Sneaky title change' };

      expect(() => service.assertUpdatePermission(grant, dto, REVIEWER_ID)).toThrow(
        ForbiddenException
      );
    });
  });

  // ── applyCreateDefaults ──────────────────────────────────────────────────

  describe('applyCreateDefaults', () => {
    it('sets status to "open"', () => {
      const result = service.applyCreateDefaults({ title: 'Grant', amount: 100 });
      expect(result.status).toBe('open');
    });

    it('defaults currency to "USD" when not provided', () => {
      const result = service.applyCreateDefaults({ title: 'Grant' });
      expect(result.currency).toBe('USD');
    });

    it('preserves a caller-supplied currency', () => {
      const result = service.applyCreateDefaults({ currency: 'EUR' });
      expect(result.currency).toBe('EUR');
    });

    it('preserves other supplied fields', () => {
      const result = service.applyCreateDefaults({ amount: 7500, title: 'Test' });
      expect(result.amount).toBe(7500);
      expect(result.title).toBe('Test');
    });
  });

  // ── resolvePagination ────────────────────────────────────────────────────

  describe('resolvePagination', () => {
    it('returns defaults when no values are provided', () => {
      const { page, limit, skip } = service.resolvePagination();
      expect(page).toBe(1);
      expect(limit).toBe(20);
      expect(skip).toBe(0);
    });

    it('computes the correct skip from page and limit', () => {
      const { skip } = service.resolvePagination(3, 10);
      expect(skip).toBe(20); // (3 - 1) * 10
    });

    it('clamps limit to a maximum of 100', () => {
      const { limit } = service.resolvePagination(1, 999);
      expect(limit).toBe(100);
    });

    it('defaults page to 1 when 0 is passed', () => {
      const { page } = service.resolvePagination(0);
      expect(page).toBe(1);
    });

    it('defaults limit to 20 when 0 is passed', () => {
      const { limit } = service.resolvePagination(1, 0);
      expect(limit).toBe(20);
    });
  });
});

// ─── GrantsService (unit – verifies delegation to GrantsBusinessService) ─────

describe('GrantsService', () => {
  let service: GrantsService;
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
  const businessService = new GrantsBusinessService();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GrantsService(mockRepo as any, businessService);
  });

  it('create: applies defaults and saves the grant', async () => {
    const dto = {
      title: 'New Grant',
      description: 'Desc',
      amount: 1000,
      applicantId: APPLICANT_ID,
    };
    const saved = makeGrant();
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);

    const result = await service.create(dto as any);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open', currency: 'USD' })
    );
    expect(result).toEqual(saved);
  });

  it('findOne: throws NotFoundException for unknown id', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
  });

  it('update: delegates permission check to GrantsBusinessService', async () => {
    const grant = makeGrant();
    mockRepo.findOne.mockResolvedValue(grant);
    mockRepo.save.mockResolvedValue({ ...grant, status: 'approved' });

    // Applicant updating title — should succeed
    await service.update(grant.id, { title: 'Updated' }, APPLICANT_ID);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('update: throws ForbiddenException when non-applicant changes non-reviewer field', async () => {
    const grant = makeGrant();
    mockRepo.findOne.mockResolvedValue(grant);

    await expect(
      service.update(grant.id, { title: 'Unauthorized change' }, OTHER_ID)
    ).rejects.toThrow(ForbiddenException);
  });

  it('findAll: delegates pagination to GrantsBusinessService', async () => {
    mockRepo.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({ page: 2, limit: 5 } as any);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(mockRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 })
    );
  });

  it('remove: deletes the grant', async () => {
    const grant = makeGrant();
    mockRepo.findOne.mockResolvedValue(grant);
    mockRepo.remove.mockResolvedValue(undefined);

    await service.remove(grant.id);

    expect(mockRepo.remove).toHaveBeenCalledWith(grant);
  });
});
