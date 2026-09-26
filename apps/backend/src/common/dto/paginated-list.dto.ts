import { ApiProperty } from '@nestjs/swagger';

/**
 * Canonical shape for every paginated list endpoint's response body.
 *
 * A number of list endpoints (forum posts, cohort sessions, organization
 * members, ...) previously returned a bare array with no pagination at all,
 * while others returned pagination metadata nested in different shapes.
 * Every new/migrated list endpoint should return this flat shape instead —
 * see PaginationDto for the matching query-parameter contract.
 */
export class PaginatedListDto<T> {
  @ApiProperty({ isArray: true, description: 'Page of results' })
  data: T[];

  @ApiProperty({ description: 'Total number of items across all pages' })
  total: number;

  @ApiProperty({ description: 'Current page number (1-based)' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether a subsequent page exists' })
  hasMore: boolean;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    this.hasMore = page * limit < total;
  }
}
