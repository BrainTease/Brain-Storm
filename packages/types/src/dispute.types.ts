/**
 * Shared dispute types used by both the backend (domain entity + DTOs) and the
 * frontend (flagging / resolution workflow).  The dispute domain is sourced
 * from a single canonical definition here and imported by each workspace so the
 * status/type values stay in sync across the API boundary.
 *
 * @module dispute.types
 */

/** Lifecycle status of a dispute. String values mirror the persisted enum values. */
export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/** Category of a dispute. String values mirror the persisted enum values. */
export enum DisputeType {
  USER_CONTENT = 'user_content',
  COURSE = 'course',
  BILLING = 'billing',
  ACCOUNT = 'account',
  OTHER = 'other',
}

/**
 * Flags a user can select when reporting / disputing content.
 * Kept in a shared location so the UI and any consuming code agree on values.
 */
export const DISPUTE_FLAG_REASONS = [
  'Spam or advertising',
  'Offensive or inappropriate content',
  'Fake or misleading review',
  'Irrelevant to this course',
  'Other',
] as const;

export type FlagReason = (typeof DISPUTE_FLAG_REASONS)[number];

/** UI step-machine state used by the frontend dispute flagging flow. */
export interface DisputeState {
  step: 'collect_reason' | 'submitting' | 'confirmed' | 'failed';
  reason: FlagReason;
  customReason: string;
  error: string | null;
}

/**
 * The dispute domain entity, representing a single case opened against a user,
 * course, or other target.
 */
export interface Dispute {
  id: string;
  type: DisputeType;
  status: DisputeStatus;
  submittedByUserId: string;
  description: string;
  targetEntityId: string | null;
  targetEntityType: string | null;
  resolvedByUserId: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for opening a new dispute. */
export interface CreateDispute {
  type: DisputeType;
  description: string;
  targetEntityId?: string;
  targetEntityType?: string;
}

/** Payload for resolving / closing a dispute. */
export interface ResolveDispute {
  status: DisputeStatus;
  resolution: string;
}

/** Query parameters for filtering and paginating disputes. */
export interface DisputeQuery {
  status?: DisputeStatus;
  page?: number;
  limit?: number;
}
