import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PaginationDto – shared pagination query parameters.
 *
 * Extend this class in any list-endpoint query DTO to get consistent
 * page/limit handling across the whole API.
 *
 * @example
 * export class CourseQueryDto extends PaginationDto {
 *   @IsOptional() @IsString() search?: string;
 * }
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Helper to compute the "page metadata" block included in every paginated
 * response.  Call this instead of duplicating the math in every service.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): { page: number; limit: number; total: number; totalPages: number } {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
