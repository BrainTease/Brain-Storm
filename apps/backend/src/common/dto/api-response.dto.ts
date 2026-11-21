import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PaginationMeta {
  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of items across all pages', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}

/**
 * Standardized API Response DTO
 * All API endpoints should return responses wrapped in this format
 */
export class ApiResponseDto<T = any> {
  /**
   * Response data payload
   */
  @ApiProperty({ description: 'Response data payload' })
  data: T;

  /**
   * HTTP status code
   */
  @ApiProperty({ description: 'HTTP status code', example: 200 })
  statusCode: number;

  /**
   * ISO 8601 timestamp of response
   */
  @ApiProperty({ description: 'ISO 8601 response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  /**
   * Optional message (success or error)
   */
  @ApiPropertyOptional({ description: 'Optional message', example: 'Created successfully' })
  message?: string;

  /**
   * Optional error details (for error responses)
   */
  @ApiPropertyOptional({ description: 'Error detail string', example: 'Bad Request' })
  error?: string;

  /**
   * Optional pagination metadata
   */
  @ApiPropertyOptional({ description: 'Pagination metadata', type: () => PaginationMeta })
  pagination?: PaginationMeta;

  constructor(
    data: T,
    statusCode: number,
    message?: string,
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  ) {
    this.data = data;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.message = message;
    this.pagination = pagination;
  }
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponseDto<T = any> extends ApiResponseDto<T[]> {
  constructor(data: T[], statusCode: number, page: number, limit: number, total: number) {
    super(data, statusCode, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }
}
