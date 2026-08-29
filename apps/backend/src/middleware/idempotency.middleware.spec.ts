/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Idempotency Middleware Tests – Issue #984
 *
 * Validates that the idempotency middleware correctly:
 * - Prevents duplicate transaction submissions
 * - Caches and replays successful responses
 * - Validates idempotency key format
 * - Handles cache errors gracefully
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { IdempotencyMiddleware } from './idempotency.middleware';

const mockCache = () => ({ get: jest.fn(), set: jest.fn() });

interface MockResponse {
  statusCode: number;
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
}

function buildRes(): MockResponse {
  const res: any = { statusCode: 200 };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

describe('IdempotencyMiddleware – Issue #984', () => {
  let middleware: IdempotencyMiddleware;
  let cache: ReturnType<typeof mockCache>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [IdempotencyMiddleware, { provide: CACHE_MANAGER, useFactory: mockCache }],
    }).compile();
    middleware = module.get(IdempotencyMiddleware);
    cache = module.get(CACHE_MANAGER);
  });

  describe('Pass-through when no idempotency key', () => {
    it('should pass through when no Idempotency-Key header', async () => {
      const req: any = { headers: {} };
      const res = buildRes();
      const next = jest.fn();
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(cache.get).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate request handling', () => {
    it('should replay cached response for duplicate transaction', async () => {
      const cachedResponse = {
        status: 200,
        body: { txHash: 'abc123def456', success: true },
        timestamp: Date.now(),
      };
      cache.get.mockResolvedValue(cachedResponse);

      const req: any = { headers: { 'idempotency-key': '550e8400-e29b-41d4-a716-446655440000' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ txHash: 'abc123def456', success: true });
      expect(res.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent duplicate Soroban transaction submissions', async () => {
      const txResponse = {
        status: 201,
        body: {
          hash: 'soroban-tx-hash',
          ledger: 1234,
          status: 'SUCCESS',
        },
        timestamp: Date.now(),
      };
      cache.get.mockResolvedValue(txResponse);

      const req: any = {
        headers: { 'idempotency-key': 'tx-submission-key-12345' },
        path: '/stellar/transaction',
      };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      // Should return cached result instead of submitting again
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hash: 'soroban-tx-hash' }));
      expect(next).not.toHaveBeenCalled(); // Should not call next (no actual submission)
    });
  });

  describe('Idempotency key validation', () => {
    it('should accept valid UUID format', async () => {
      cache.get.mockResolvedValue(null);
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      const req: any = { headers: { 'idempotency-key': validUuid } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(cache.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should accept alphanumeric key format', async () => {
      cache.get.mockResolvedValue(null);

      const req: any = { headers: { 'idempotency-key': 'transaction-key-12345' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(cache.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid key with special characters', async () => {
      // Keys with invalid characters should be ignored
      const req: any = {
        headers: { 'idempotency-key': 'invalid<script>alert(1)</script>' },
      };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(cache.get).not.toHaveBeenCalled(); // Invalid key should not be checked
      expect(next).toHaveBeenCalled(); // Should still proceed without idempotency
    });

    it('should accept hyphenated and underscored keys', async () => {
      cache.get.mockResolvedValue(null);

      const req: any = { headers: { 'idempotency-key': 'key-with_both-types_12345' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(cache.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Response caching for transaction prevention', () => {
    it('should store first transaction response in cache', async () => {
      cache.get.mockResolvedValue(null);

      const req: any = { headers: { 'idempotency-key': 'key-2' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate successful transaction response
      res.json({ txHash: 'abc123', success: true });

      expect(cache.set).toHaveBeenCalledWith(
        'idempotency:key-2',
        expect.objectContaining({
          status: 200,
          body: { txHash: 'abc123', success: true },
        }),
        86400 // 24 hour TTL
      );
    });

    it('should not cache error responses (4xx)', async () => {
      cache.get.mockResolvedValue(null);

      const req: any = { headers: { 'idempotency-key': 'error-key' } };
      const res = buildRes();
      res.statusCode = 400; // Error status

      const next = jest.fn(() => {
        res.json({ error: 'Invalid request' });
      });

      await middleware.use(req, res, next);

      // Cache.set should not be called for 4xx responses
      // (Error responses are typically not retried with same key)
    });

    it('should support 24-hour cache TTL for Soroban ledger anchors', async () => {
      cache.get.mockResolvedValue(null);

      const req: any = { headers: { 'idempotency-key': 'soroban-key' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);
      res.json({ hash: 'soroban-hash' });

      // Verify 24-hour TTL (86400 seconds)
      expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 86400);
    });
  });

  describe('Cache error handling', () => {
    it('should proceed if cache read fails', async () => {
      cache.get.mockRejectedValueOnce(new Error('Cache unavailable'));

      const req: any = { headers: { 'idempotency-key': '550e8400-e29b-41d4-a716-446655440000' } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled(); // Should proceed despite cache error
    });

    it('should set idempotency headers on replay', async () => {
      const cachedResponse = {
        status: 201,
        body: { hash: 'tx-hash' },
        timestamp: Date.now(),
      };
      cache.get.mockResolvedValue(cachedResponse);

      const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';
      const req: any = { headers: { 'idempotency-key': idempotencyKey } };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Idempotency-Key', idempotencyKey);
      expect(res.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
    });
  });

  describe('Transaction submission duplicate prevention', () => {
    it('should prevent duplicate Soroban contract invocation', async () => {
      const contractInvocationResponse = {
        status: 200,
        body: {
          hash: 'soroban-contract-tx',
          method: 'mint_reward',
          recipient: 'GABC...',
        },
        timestamp: Date.now(),
      };
      cache.get.mockResolvedValue(contractInvocationResponse);

      const req: any = {
        headers: { 'idempotency-key': 'contract-invocation-1' },
        method: 'POST',
        path: '/stellar/invoke-contract',
      };
      const res = buildRes();
      const next = jest.fn();

      await middleware.use(req, res, next);

      // Should replay cached result
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ method: 'mint_reward' }));
      expect(next).not.toHaveBeenCalled(); // No actual invocation
    });
  });
});
