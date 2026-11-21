/**
 * Shared helper for external HTTP calls — issue #59
 *
 * Wraps the global `fetch` with:
 *  - a configurable per-request timeout via AbortSignal
 *  - exponential-backoff retries for transient failures (network errors
 *    and 429 / 5xx responses)
 *
 * Both `timeoutMs` and `maxRetries` / `retryBaseDelayMs` are injected by
 * callers so they can be driven from ConfigService rather than hard-coded.
 */

export interface FetchRetryOptions {
  /** Maximum ms to wait for a single attempt before aborting. Default: 10 000 */
  timeoutMs?: number;
  /** How many times to retry after the first failure. Default: 3 */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1 000 */
  retryBaseDelayMs?: number;
}

/** HTTP status codes that warrant a retry */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Fetch `url` with timeout and automatic exponential-backoff retries.
 *
 * Throws if all attempts are exhausted or the request is non-retryable.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 10_000,
    maxRetries = 3,
    retryBaseDelayMs = 1_000,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (!RETRYABLE_STATUSES.has(response.status) || attempt === maxRetries) {
        return response;
      }

      // Retryable HTTP status — fall through to backoff
      lastError = new Error(`HTTP ${response.status} from ${url}`);
    } catch (err: unknown) {
      lastError = err;
      if (attempt === maxRetries) break;
    } finally {
      clearTimeout(timer);
    }

    const delay = retryBaseDelayMs * Math.pow(2, attempt);
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  throw lastError;
}
