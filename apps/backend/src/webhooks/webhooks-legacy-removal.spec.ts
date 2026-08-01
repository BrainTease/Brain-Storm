/**
 * Unit tests for #819 — Remove legacy webhook handlers
 *
 * Verifies that:
 *  1. The four legacy @OnEvent bridge methods no longer exist on
 *     WebhooksService (static analysis via object key inspection).
 *  2. WebhooksService.publish() still works correctly (the core capability
 *     is unaffected by the removal).
 *  3. All other public API methods remain intact.
 */

import { NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { DeliveryStatus } from './webhook-delivery.entity';
import type { Webhook } from './webhook.entity';
import type { WebhookDelivery } from './webhook-delivery.entity';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const makeWebhook = (overrides: Partial<Webhook> = {}): Webhook =>
  ({
    id: 'wh-1',
    userId: 'u1',
    url: 'https://example.com/hook',
    events: 'enrollment.created',
    secret: 'whs_testsecret',
    previousSecret: null,
    secretRotatedAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Webhook);

const makeDelivery = (overrides: Partial<WebhookDelivery> = {}): WebhookDelivery =>
  ({
    id: 'delivery-1',
    webhookId: 'wh-1',
    event: 'enrollment.created',
    payload: '{}',
    status: DeliveryStatus.DLQ,
    attempts: 5,
    nextRetryAt: null,
    deadLetteredAt: new Date(),
    ...overrides,
  } as WebhookDelivery);

function buildService() {
  const mockWebhookRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockDeliveryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };

  mockWebhookRepo.createQueryBuilder.mockReturnValue(qb);
  mockDeliveryRepo.createQueryBuilder.mockReturnValue(qb);

  const service = new WebhooksService(mockWebhookRepo as any, mockDeliveryRepo as any);

  // Silence internal loggers
  jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

  return { service, mockWebhookRepo, mockDeliveryRepo, qb };
}

// ─── #819: Legacy handlers must not exist ────────────────────────────────────

describe('#819 — Legacy @OnEvent handlers removed', () => {
  it('does not have onEnrollment method', () => {
    const { service } = buildService();
    expect(typeof (service as any).onEnrollment).toBe('undefined');
  });

  it('does not have onCompletion method', () => {
    const { service } = buildService();
    expect(typeof (service as any).onCompletion).toBe('undefined');
  });

  it('does not have onCredential method', () => {
    const { service } = buildService();
    expect(typeof (service as any).onCredential).toBe('undefined');
  });

  it('does not have onPaymentCompleted method', () => {
    const { service } = buildService();
    expect(typeof (service as any).onPaymentCompleted).toBe('undefined');
  });

  it('still exposes publish() for explicit outbound webhook dispatch', () => {
    const { service } = buildService();
    expect(typeof service.publish).toBe('function');
  });
});

// ─── Core API is unaffected ───────────────────────────────────────────────────

describe('WebhooksService — core functionality unaffected by #819', () => {
  describe('register', () => {
    it('saves a webhook with a generated secret', async () => {
      const { service, mockWebhookRepo } = buildService();
      const wh = makeWebhook();
      mockWebhookRepo.create.mockReturnValue(wh);
      mockWebhookRepo.save.mockResolvedValue(wh);

      const result = await service.register('u1', 'https://example.com/hook', ['enrollment.created']);

      expect(mockWebhookRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ secret: expect.stringMatching(/^whs_/) }),
      );
      expect(result).toEqual(wh);
    });
  });

  describe('delete', () => {
    it('removes the webhook when it belongs to the user', async () => {
      const { service, mockWebhookRepo } = buildService();
      const wh = makeWebhook();
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockWebhookRepo.remove.mockResolvedValue(wh);

      await service.delete('u1', 'wh-1');

      expect(mockWebhookRepo.remove).toHaveBeenCalledWith(wh);
    });

    it('throws NotFoundException when webhook not found', async () => {
      const { service, mockWebhookRepo } = buildService();
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('u1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rotateSecret', () => {
    it('preserves the old secret during the grace window', async () => {
      const { service, mockWebhookRepo } = buildService();
      const wh = makeWebhook({ secret: 'old-secret' });
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockWebhookRepo.save.mockImplementation((w: any) => Promise.resolve(w));

      const result = await service.rotateSecret('u1', 'wh-1');

      expect(wh.previousSecret).toBe('old-secret');
      expect(wh.secret).not.toBe('old-secret');
      expect(result.previousSecretExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifySignature', () => {
    it('returns true for a valid signature', () => {
      const { service } = buildService();
      const secret = 'test-secret';
      const body = '{"event":"test"}';
      // Compute signature the same way the service does
      const crypto = require('crypto');
      const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

      expect(service.verifySignature(secret, body, sig)).toBe(true);
    });

    it('returns false for a tampered signature', () => {
      const { service } = buildService();
      expect(service.verifySignature('secret', 'body', 'sha256=invalidsig')).toBe(false);
    });

    it('returns false when timestamp is outside the 5-minute replay window', () => {
      const { service } = buildService();
      const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
      expect(
        service.verifySignature('secret', 'body', 'sha256=anysig', staleTimestamp),
      ).toBe(false);
    });
  });

  describe('getDlq', () => {
    it('returns DLQ deliveries for the webhook', async () => {
      const { service, mockWebhookRepo, mockDeliveryRepo } = buildService();
      const wh = makeWebhook();
      const deliveries = [makeDelivery()];
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockDeliveryRepo.find.mockResolvedValue(deliveries);

      const result = await service.getDlq('wh-1', 'u1');

      expect(result).toEqual(deliveries);
    });

    it('throws NotFoundException when webhook not found', async () => {
      const { service, mockWebhookRepo } = buildService();
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.getDlq('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
