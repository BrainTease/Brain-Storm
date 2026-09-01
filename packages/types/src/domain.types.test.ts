/**
 * Unit tests for the canonical domain type definitions added in #
 * 1061 (Listing, Dispute, Grant).
 *
 * These types are the single source of truth for the domain interfaces across
 * `apps/frontend`, `apps/backend`, and `packages/sdk`. Every workspace must
 * import them from `@brain-storm/types` rather than redefining them locally.
 */

import {
  DisputeStatus,
  DisputeType,
  DISPUTE_FLAG_REASONS,
  type DisputeState,
  type Dispute,
  type CreateDispute,
  type ResolveDispute,
  type DisputeQuery,
} from './dispute.types';
import {
  type GrantStatus,
  type Grant,
  type CreateGrant,
  type UpdateGrant,
  type PaginatedGrants,
  type GrantApplicationValues,
} from './grant.types';
import {
  type ListingCurrency,
  type ListingFormData,
  type MarketplaceTransactionStatus,
  type MarketplaceTransaction,
  type MarketplaceTx,
} from './listing.types';

// ---------------------------------------------------------------------------
// Dispute
// ---------------------------------------------------------------------------

describe('Dispute domain types', () => {
  it('exposes the canonical DisputeStatus enum values', () => {
    expect(DisputeStatus.OPEN).toBe('open');
    expect(DisputeStatus.UNDER_REVIEW).toBe('under_review');
    expect(DisputeStatus.RESOLVED).toBe('resolved');
    expect(DisputeStatus.CLOSED).toBe('closed');
  });

  it('exposes the canonical DisputeType enum values', () => {
    expect(DisputeType.USER_CONTENT).toBe('user_content');
    expect(DisputeType.COURSE).toBe('course');
    expect(DisputeType.BILLING).toBe('billing');
    expect(DisputeType.ACCOUNT).toBe('account');
    expect(DisputeType.OTHER).toBe('other');
  });

  it('exposes a fixed set of flag reasons used by the frontend workflow', () => {
    expect(DISPUTE_FLAG_REASONS).toContain('Spam or advertising');
    expect(DISPUTE_FLAG_REASONS).toContain('Offensive or inappropriate content');
    expect(DISPUTE_FLAG_REASONS).toContain('Fake or misleading review');
    expect(DISPUTE_FLAG_REASONS).toContain('Irrelevant to this course');
    expect(DISPUTE_FLAG_REASONS).toContain('Other');
  });

  it('DisputeState tracks the UI step machine fields', () => {
    const state: DisputeState = {
      step: 'collect_reason',
      reason: 'Other',
      customReason: '',
      error: null,
    };
    expect(state.step).toBe('collect_reason');
  });

  it('exposes CreateDispute / ResolveDispute / Dispute / DisputeQuery shapes', () => {
    const create: CreateDispute = {
      type: DisputeType.COURSE,
      description: 'Incorrect course content',
      targetEntityId: 'course-1',
      targetEntityType: 'course',
    };
    expect(create.type).toBe('course');

    const resolve: ResolveDispute = { status: DisputeStatus.RESOLVED, resolution: 'Refunded' };
    expect(resolve.status).toBe('resolved');

    const query: DisputeQuery = { status: DisputeStatus.OPEN, page: 1, limit: 20 };
    expect(query.page).toBe(1);

    const dispute: Dispute = {
      id: 'd1',
      type: create.type,
      status: DisputeStatus.OPEN,
      submittedByUserId: 'u1',
      description: create.description,
      targetEntityId: create.targetEntityId ?? null,
      targetEntityType: create.targetEntityType ?? null,
      resolvedByUserId: null,
      resolution: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(dispute.status).toBe('open');
  });
});

// ---------------------------------------------------------------------------
// Grant
// ---------------------------------------------------------------------------

describe('Grant domain types', () => {
  it('exposes a GrantStatus union with all lifecycle states', () => {
    const statuses: GrantStatus[] = ['open', 'under_review', 'approved', 'rejected', 'closed'];
    expect(statuses).toHaveLength(5);
    expect(statuses).toContain('open');
    expect(statuses).toContain('closed');
  });

  it('exposes Grant entity and paginated result shapes', () => {
    const grant: Grant = {
      id: 'g1',
      title: 'Education Grant',
      description: 'Fund blockchain education.',
      amount: 5000,
      currency: 'USD',
      applicantId: 'u1',
      status: 'open',
      reviewNotes: null,
      reviewerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(grant.status).toBe('open');

    const paginated: PaginatedGrants = { data: [grant], total: 1, page: 1, limit: 20 };
    expect(paginated.data).toHaveLength(1);
  });

  it('exposes CreateGrant / UpdateGrant / GrantApplicationValues shapes', () => {
    const create: CreateGrant = {
      title: 'New',
      description: 'desc',
      amount: 100,
      currency: 'USD',
      applicantId: 'u1',
    };
    expect(create.amount).toBe(100);

    const update: UpdateGrant = { status: 'approved', reviewNotes: 'Looks good' };
    expect(update.status).toBe('approved');

    const form: GrantApplicationValues = {
      applicantName: 'Ada',
      email: 'ada@example.com',
      organization: 'Org',
      projectTitle: 'Title',
      projectDescription: 'A description long enough to be meaningful.',
      totalAmount: 1000,
      milestonesPlan: 'Milestones',
      agreement: true,
    };
    expect(form.agreement).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Listing / Marketplace
// ---------------------------------------------------------------------------

describe('Listing domain types', () => {
  it('exposes the supported listing currencies', () => {
    const currencies: ListingCurrency[] = ['BST', 'XLM', 'USDC'];
    expect(currencies).toHaveLength(3);
  });

  it('exposes a ListingFormData shape', () => {
    const data: ListingFormData = {
      title: 'Advanced Soroban NFT',
      description: '',
      price: 250,
      quantity: 1,
      currency: 'BST',
      royaltyBasis: 500,
    };
    expect(data.price).toBe(250);
    expect(data.royaltyBasis).toBe(500);
  });

  it('exposes marketplace transaction status values and shapes', () => {
    const statuses: MarketplaceTransactionStatus[] = [
      'completed',
      'pending',
      'refunded',
      'failed',
    ];
    expect(statuses).toHaveLength(4);

    const tx: MarketplaceTx = {
      id: 't1',
      date: '2025-01-01',
      course: 'Course',
      buyer: 'b1',
      seller: 's1',
      amount: '100',
      fee: '1',
      status: 'completed',
    };
    expect(tx.status).toBe('completed');

    // MarketplaceTransaction and MarketplaceTx are the same structural alias.
    const tx2: MarketplaceTransaction = { ...tx };
    expect(tx2.amount).toBe('100');
  });
});
