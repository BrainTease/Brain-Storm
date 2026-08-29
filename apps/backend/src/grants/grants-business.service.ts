/**
 * #809 — Grants: Business-Logic Layer
 *
 * Contains all domain rules for the grants feature:
 *   - Authorization: who may update a grant
 *   - Defaults: currency defaults, initial status
 *   - Pagination math
 *
 * `GrantsService` (persistence layer) calls into this service for any
 * decision that is not a simple CRUD operation.  This makes the rules
 * independently testable without a database.
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { Grant } from './grant.entity';
import { UpdateGrantDto } from './dto/grant.dto';

/** Fields that a reviewer (non-applicant) is allowed to change. */
const REVIEWER_FIELDS: Array<keyof UpdateGrantDto> = ['status', 'reviewNotes', 'reviewerId'];

@Injectable()
export class GrantsBusinessService {
  /**
   * Assert that `requesterId` is allowed to apply `dto` to `grant`.
   *
   * Rules:
   *  - The original applicant may change any field.
   *  - A reviewer (anyone else) may only change `status`, `reviewNotes`, and
   *    `reviewerId`.
   *
   * @throws ForbiddenException when the caller is not authorised.
   */
  assertUpdatePermission(grant: Grant, dto: UpdateGrantDto, requesterId: string): void {
    if (grant.applicantId === requesterId) {
      // Applicant can update anything
      return;
    }

    // Non-applicants may only touch reviewer-specific fields
    const hasNonReviewerField = (Object.keys(dto) as Array<keyof UpdateGrantDto>).some(
      (key) => !REVIEWER_FIELDS.includes(key)
    );

    if (hasNonReviewerField) {
      throw new ForbiddenException('You do not have permission to update this grant');
    }
  }

  /**
   * Apply domain defaults to a new grant payload before persistence.
   *
   * @returns A partial `Grant` with defaults applied.
   */
  applyCreateDefaults(partial: Partial<Grant>): Partial<Grant> {
    return {
      ...partial,
      currency: partial.currency ?? 'USD',
      status: 'open',
    };
  }

  /**
   * Compute pagination metadata.
   *
   * @returns `{ skip, take, page, limit }` ready for TypeORM `findAndCount`.
   */
  resolvePagination(
    rawPage?: number,
    rawLimit?: number
  ): { page: number; limit: number; skip: number } {
    const page = rawPage && rawPage > 0 ? rawPage : 1;
    const limit = rawLimit && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    return { page, limit, skip: (page - 1) * limit };
  }
}
