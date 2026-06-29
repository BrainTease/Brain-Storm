import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * CacheHeadersMiddleware — #707 HTTP Caching & CDN Strategy
 *
 * Behaviour:
 *  - Safe reads (GET / HEAD) on cacheable routes get Cache-Control + ETag.
 *  - Authenticated responses use `private` so CDN never caches user data.
 *  - If the client sends If-None-Match and it matches the ETag, we short-
 *    circuit with 304 (no body) — saves bandwidth on large list payloads.
 *  - Mutating methods (POST/PATCH/PUT/DELETE) get no-store so browsers and
 *    CDNs never cache them.
 */
@Injectable()
export class CacheHeadersMiddleware implements NestMiddleware {
  /** Routes that can be publicly cached at the CDN edge (max-age in seconds) */
  private static readonly PUBLIC_ROUTES: { pattern: RegExp; maxAge: number; swr: number }[] = [
    // Course list & detail — safe public reads, low churn
    { pattern: /^\/v1\/courses$/, maxAge: 60, swr: 300 },
    { pattern: /^\/v1\/courses\/[^/]+$/, maxAge: 120, swr: 600 },
    // Stellar balance — changes rarely, cheap to re-validate
    { pattern: /^\/v1\/stellar\/balance\//, maxAge: 30, swr: 60 },
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    // Only cache-control on safe methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    const path = req.path;
    const isAuthenticated = Boolean(req.headers['authorization']);
    const publicRoute = CacheHeadersMiddleware.PUBLIC_ROUTES.find((r) =>
      r.pattern.test(path),
    );

    if (publicRoute && !isAuthenticated) {
      // Public CDN-cacheable route
      res.setHeader(
        'Cache-Control',
        `public, max-age=${publicRoute.maxAge}, stale-while-revalidate=${publicRoute.swr}`,
      );
    } else if (isAuthenticated) {
      // Authenticated: private cache only (browser cache, not CDN)
      res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    } else {
      // Everything else: revalidate on every request
      res.setHeader('Cache-Control', 'no-cache');
    }

    // Intercept `res.json` to compute ETag from the serialised body
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const serialised = JSON.stringify(body);
      const etag = `"${createHash('sha1').update(serialised).digest('hex').slice(0, 16)}"`;

      res.setHeader('ETag', etag);

      // Conditional request support (If-None-Match → 304)
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === etag) {
        res.status(304).end();
        return res;
      }

      return originalJson(body);
    };

    next();
  }
}
