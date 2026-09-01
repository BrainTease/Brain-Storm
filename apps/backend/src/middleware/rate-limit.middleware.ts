import { Injectable, NestMiddleware, TooManyRequestsException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Rate Limiting Middleware – Issue #982
 *
 * Provides configurable rate limiting per IP address or per account (authenticated user).
 * Supports multiple rate limit rules for different endpoints.
 * Used to protect write endpoints from abuse attacks, especially transaction submission routes.
 */

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Skip specific paths */
  skip?: (req: Request) => boolean;
  /** Custom key generator (defaults to IP address) */
  keyGenerator?: (req: Request) => string;
  /** Custom message when limit is exceeded */
  message?: string;
  /** Whether to use account ID if available (for authenticated requests) */
  useAccountId?: boolean;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private defaultOptions: RateLimitOptions = {
    limit: 100,
    windowMs: 60000, // 1 minute default
  };

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  /**
   * Create a rate limit middleware for a specific configuration
   * @param options Rate limit configuration
   * @returns Express middleware function
   */
  createMiddleware(options: RateLimitOptions) {
    const config = { ...this.defaultOptions, ...options };

    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip if configured
      if (config.skip && config.skip(req)) {
        return next();
      }

      // Generate rate limit key
      const key = config.keyGenerator ? config.keyGenerator(req) : this.getDefaultKey(req, config);

      // Get current count
      const current = await this.cache.get<number>(key);
      const count = (current ?? 0) + 1;

      // Check if exceeded
      if (count > config.limit) {
        this.logger.warn(`Rate limit exceeded for ${key}: ${count}/${config.limit}`);
        return res.status(429).json({
          statusCode: 429,
          message: config.message || 'Too many requests, please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
      }

      // Store updated count with TTL
      await this.cache.set(key, count, config.windowMs);

      // Set retry-after header
      res.setHeader('X-RateLimit-Limit', config.limit);
      res.setHeader('X-RateLimit-Remaining', config.limit - count);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

      next();
    };
  }

  /**
   * Generate default rate limit key
   * Prioritizes account ID if available (authenticated user), falls back to IP
   */
  private getDefaultKey(req: Request, options: RateLimitOptions): string {
    if (options.useAccountId && (req as any).user?.id) {
      return `ratelimit:account:${(req as any).user.id}`;
    }

    const ip = this.getClientIp(req);
    return `ratelimit:ip:${ip}`;
  }

  /**
   * Extract client IP from request
   * Handles X-Forwarded-For, X-Real-IP, and direct connection
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Base middleware just calls next
    // Use createMiddleware() to get configured middleware
    next();
  }
}

/**
 * Presets for common rate limit scenarios
 */
export const RateLimitPresets = {
  // Public endpoints: 1000 requests per hour
  public: {
    limit: 1000,
    windowMs: 60 * 60 * 1000,
  },

  // Standard endpoints: 300 requests per hour per IP
  standard: {
    limit: 300,
    windowMs: 60 * 60 * 1000,
  },

  // Authenticated endpoints: 500 requests per hour per user
  authenticated: {
    limit: 500,
    windowMs: 60 * 60 * 1000,
    useAccountId: true,
  },

  // Write endpoints: 100 requests per hour per IP (strict)
  write: {
    limit: 100,
    windowMs: 60 * 60 * 1000,
  },

  // Transaction submission: 50 requests per hour per IP (very strict)
  transaction: {
    limit: 50,
    windowMs: 60 * 60 * 1000,
    message: 'Transaction submission limit exceeded. Please try again later.',
  },

  // Login/auth: 5 attempts per 15 minutes
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many login attempts. Please try again later.',
  },

  // Testnet funding: 3 requests per hour per IP
  testnetFunding: {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Testnet funding limit reached. Please try again later.',
  },
};
