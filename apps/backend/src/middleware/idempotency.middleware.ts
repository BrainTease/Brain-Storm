/**
 * Idempotency Middleware – Issue #984
 *
 * Prevents duplicate transaction submissions by caching results based on idempotency keys.
 *
 * Problem it solves:
 * ─────────────────
 *  • Retried client requests can result in duplicate transaction submissions
 *  • No mechanism to detect and prevent duplicate Soroban transactions
 *  • Can lead to duplicate credits, transfers, or state changes on-chain
 *
 * Solution:
 * ────────
 *  • Cache transaction results based on idempotency-key header
 *  • Return cached result for duplicate requests within TTL window
 *  • Prevent actual transaction submission if key already processed
 *  • Supports 24-hour TTL for transaction replay protection
 *
 * Usage:
 * ──────
 *  // Client includes idempotency-key header in request
 *  POST /stellar/transaction
 *  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 *  Content-Type: application/json
 *
 *  {
 *    "publicKey": "GABC...",
 *    "amount": 100
 *  }
 *
 *  // Server caches the response and returns it for retries with same key
 *  // Subsequent requests with same key within 24 hours get cached response
 */

import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds (safe for Soroban ledger anchors)
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const IDEMPOTENCY_CACHE_PREFIX = 'idempotency:';

interface StoredResponse {
  status: number;
  body: unknown;
  timestamp: number;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = this.getIdempotencyKey(req);
    if (!idempotencyKey) {
      // No idempotency key provided, proceed without caching
      return next();
    }

    const cacheKey = `${IDEMPOTENCY_CACHE_PREFIX}${idempotencyKey}`;

    try {
      const stored = await this.cache.get<StoredResponse>(cacheKey);

      if (stored) {
        // Duplicate request detected - return cached response
        const ageSecs = (Date.now() - stored.timestamp) / 1000;
        this.logger.log(
          `Idempotent request replayed for key: ${idempotencyKey} (${ageSecs.toFixed(1)}s old)`
        );

        // Set headers indicating this is a cached response
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.setHeader('X-Idempotency-Replayed', 'true');

        return res.status(stored.status).json(stored.body);
      }

      // First occurrence of this key - store the response when it's ready
      this.interceptAndStoreResponse(res, cacheKey, idempotencyKey);
    } catch (error) {
      this.logger.warn(
        `Error checking idempotency cache: ${error instanceof Error ? error.message : String(error)}`
      );
      // If cache fails, allow request to proceed without idempotency protection
    }

    next();
  }

  /**
   * Intercept the response and store it in cache
   */
  private interceptAndStoreResponse(res: Response, cacheKey: string, idempotencyKey: string): void {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (body: unknown) => {
      this.storeResponseInCache(cacheKey, res.statusCode, body, idempotencyKey);
      return originalJson(body);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.send = (body?: any) => {
      if (typeof body === 'object' || typeof body === 'string') {
        this.storeResponseInCache(cacheKey, res.statusCode, body, idempotencyKey);
      }
      return originalSend(body);
    };
  }

  /**
   * Store response in cache if it indicates success
   */
  private async storeResponseInCache(
    cacheKey: string,
    statusCode: number,
    body: unknown,
    idempotencyKey: string
  ): Promise<void> {
    // Only cache successful responses (2xx)
    if (statusCode < 200 || statusCode >= 300) {
      this.logger.debug(`Not caching error response (${statusCode}) for key: ${idempotencyKey}`);
      return;
    }

    try {
      const storedResponse: StoredResponse = {
        status: statusCode,
        body,
        timestamp: Date.now(),
      };

      await this.cache.set(cacheKey, storedResponse, IDEMPOTENCY_TTL);
      this.logger.debug(`Cached idempotent response for key: ${idempotencyKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to cache idempotent response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract and validate idempotency key from request headers
   */
  private getIdempotencyKey(req: Request): string | null {
    const key = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;

    if (!key) {
      return null;
    }

    // Validate key format (should be a valid UUID or similar)
    if (!this.isValidIdempotencyKey(key)) {
      this.logger.warn(`Invalid idempotency key format: ${key}`);
      return null;
    }

    return key;
  }

  /**
   * Validate idempotency key format
   * Accepts UUIDs and alphanumeric strings
   */
  private isValidIdempotencyKey(key: string): boolean {
    // UUID v4 format or alphanumeric string
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const alphanumericRegex = /^[a-zA-Z0-9\-_]{1,256}$/;

    return uuidRegex.test(key) || alphanumericRegex.test(key);
  }
}
