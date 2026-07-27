import {
  Injectable,
  NestMiddleware,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const IDEMPOTENCY_TTL = 86400; // 24 h in seconds

interface StoredResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) return next();

    const cacheKey = `idempotency:${key}`;
    const stored = await this.cache.get<StoredResponse>(cacheKey);

    if (stored) {
      // Replay the original response
      return res.status(stored.status).json(stored.body);
    }

    // Intercept the response to store it
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400) {
        this.cache.set(cacheKey, { status: res.statusCode, body }, IDEMPOTENCY_TTL);
      }
      return originalJson(body);
    };

    next();
  }
}
