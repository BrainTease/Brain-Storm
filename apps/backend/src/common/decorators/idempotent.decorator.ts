/**
 * @Idempotent decorator
 *
 * Marks an endpoint as requiring idempotency key support.
 * Used for transaction-submission endpoints to prevent duplicate submissions.
 *
 * The IdempotencyMiddleware must be applied globally for this decorator to work.
 *
 * Usage:
 *   @Post('transaction/submit')
 *   @Idempotent()
 *   @UseGuards(JwtAuthGuard)
 *   async submitTransaction(@Body() body: SubmitTransactionDto) {
 *     // Middleware will handle idempotency key caching
 *   }
 *
 * Client usage:
 *   POST /transaction/submit
 *   Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 *   Authorization: Bearer token
 *
 *   {
 *     "publicKey": "GABC...",
 *     "amount": 100
 *   }
 *
 * - First request: Transaction is submitted and response is cached
 * - Retry with same Idempotency-Key: Cached response is returned without re-submitting
 * - TTL: 24 hours (safe for Soroban ledger anchors)
 */

import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Mark an endpoint as idempotent
 * Enables automatic caching of responses to prevent duplicate submissions
 */
export function Idempotent() {
  return SetMetadata(IDEMPOTENT_KEY, true);
}
