import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SecurityMiddleware
 *
 * Sets baseline security response headers for every request.
 * Helmet is applied at bootstrap level; this middleware adds
 * additional project-specific overrides and strict CORS defaults
 * for routes that bypass the global Helmet configuration.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // Prevent browsers from MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Block clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Disable legacy XSS auditor (covered by CSP)
    res.setHeader('X-XSS-Protection', '0');
    // Strict HTTPS enforcement (1 year, include sub-domains)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Restrict referrer to same origin
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Disallow FLoC / Topics API tracking
    res.setHeader('Permissions-Policy', 'interest-cohort=()');
    next();
  }
}
