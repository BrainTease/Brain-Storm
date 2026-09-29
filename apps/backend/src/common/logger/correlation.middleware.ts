/**
 * Correlation middleware (#1215).
 *
 * On every HTTP request:
 *   1. Reads X-Correlation-ID (or falls back to X-Request-ID, then generates)
 *   2. Stores it on `req.correlationId`
 *   3. Binds it via AsyncLocalStorage for the lifetime of the request
 *   4. Echoes it back on the response as X-Correlation-ID
 *
 * Any logger call or downstream function (stellar event handlers,
 * ws-gateway message handlers chained from the same promise tree) can read
 * it via getCorrelationId() from correlation.store.ts.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from './correlation.store';

export const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound =
      (req.headers[CORRELATION_HEADER] as string) ||
      (req.headers['x-request-id'] as string);

    const correlationId = inbound && inbound.trim().length > 0 ? inbound : uuidv4();

    // Express request scoped fields
    (req as any).correlationId = correlationId;
    (req as any).requestId = correlationId; // keep existing field name populated
    res.setHeader('X-Correlation-ID', correlationId);

    // Bind for downstream async code (stellar handlers, ws-gateway, etc.)
    runWithCorrelationId(correlationId, () => next());
  }
}
