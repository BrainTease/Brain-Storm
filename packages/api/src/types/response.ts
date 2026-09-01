/**
 * Standard API Response Envelope
 * 
 * All API endpoints must use this envelope shape for consistency.
 * 
 * @template T - The type of the data payload
 */
export interface ApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  /** The data payload (null if error) */
  data: T | null;
  /** Any error information */
  error: ApiError | null;
  /** Additional metadata */
  meta: ApiMeta;
}

/**
 * Error information
 */
export interface ApiError {
  /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details (optional) */
  details?: Record<string, any>;
}

/**
 * Response metadata
 */
export interface ApiMeta {
  /** Timestamp of the response */
  timestamp: string;
  /** Request ID for tracing */
  requestId: string;
  /** API version */
  version: string;
  /** Pagination info (if applicable) */
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Helper to create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: Partial<Omit<ApiMeta, 'timestamp' | 'requestId'>> & {
    pagination?: PaginationMeta;
  },
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0',
      ...options,
    },
  };
}

/**
 * Helper to create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  options?: Partial<Omit<ApiMeta, 'timestamp' | 'requestId'>>,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0',
      ...options,
    },
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
