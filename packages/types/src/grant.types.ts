/**
 * Shared grant types used by both the backend (domain entity + DTOs) and the
 * frontend (grant application form).  The grant domain is sourced from a single
 * canonical definition here so the status values and field shapes stay in sync
 * across the API boundary.
 *
 * @module grant.types
 */

/** Lifecycle status of a grant application. */
export type GrantStatus = 'open' | 'under_review' | 'approved' | 'rejected' | 'closed';

/**
 * The grant domain entity. Timestamps are ISO-8601 strings when serialised over
 * the wire and `Date` objects when materialised by the backend.
 */
export interface Grant {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  applicantId: string;
  status: GrantStatus;
  reviewNotes: string | null;
  reviewerId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Payload for creating a new grant application. */
export interface CreateGrant {
  title: string;
  description: string;
  amount: number;
  currency?: string;
  applicantId: string;
}

/** Payload for updating an existing grant application. */
export interface UpdateGrant {
  title?: string;
  description?: string;
  amount?: number;
  status?: GrantStatus;
  reviewNotes?: string;
  reviewerId?: string;
}

/** Paginated grant results returned by the backend listing endpoint. */
export interface PaginatedGrants {
  data: Grant[];
  total: number;
  page: number;
  limit: number;
}

/** Fields collected by the frontend grant application form. */
export interface GrantApplicationValues {
  applicantName: string;
  email: string;
  organization: string;
  projectTitle: string;
  projectDescription: string;
  totalAmount: number;
  milestonesPlan: string;
  agreement: boolean;
}
