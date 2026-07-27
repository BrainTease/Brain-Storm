/**
 * Standardized API Response DTO
 * All API endpoints should return responses wrapped in this format
 */
export class ApiResponseDto<T = any> {
  /**
   * Response data payload
   */
  data: T;

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * ISO 8601 timestamp of response
   */
  timestamp: string;

  /**
   * Optional error message (for error responses)
   */
  message?: string;

  /**
   * Optional error details (for error responses)
   */
  error?: string;

  /**
   * Optional pagination metadata
   */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  constructor(
    data: T,
    statusCode: number,
    message?: string,
    pagination?: { page: number; limit: number; total: number; totalPages: number },
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
  constructor(
    data: T[],
    statusCode: number,
    page: number,
    limit: number,
    total: number,
  ) {
    super(data, statusCode, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }
}
