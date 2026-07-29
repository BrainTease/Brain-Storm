import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { Webhook } from './webhook.entity';
import { WebhookDelivery, DeliveryStatus } from './webhook-delivery.entity';

describe('WebhooksService', () => {
  let service: WebhooksService;

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
    getMany: jest.fn().mockResolvedValue([]),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const makeWebhook = (overrides: Partial<Webhook> = {}): Webhook =>
    ({
      id: 'wh-1',
      userId: 'u1',
      url: 'https://example.com/hook',
      events: 'enrollment.created',
      secret: 'old-secret',
      previousSecret: null,
      secretRotatedAt: null,
      isActive: true,
      ...overrides,
    } as Webhook);

  beforeEach(async () => {
    mockWebhookRepo.createQueryBuilder.mockReturnValue(qb);
    mockDeliveryRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(Webhook), useValue: mockWebhookRepo },
        { provide: getRepositoryToken(WebhookDelivery), useValue: mockDeliveryRepo },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register ─────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a webhook with a generated secret', async () => {
      const wh = makeWebhook();
      mockWebhookRepo.create.mockReturnValue(wh);
      mockWebhookRepo.save.mockResolvedValue(wh);

      const result = await service.register('u1', 'https://example.com/hook', ['enrollment.created']);

      expect(mockWebhookRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          url: 'https://example.com/hook',
          events: 'enrollment.created',
          secret: expect.any(String),
        }),
      );
      expect(result).toEqual(wh);
    });

    it('generates a unique secret on each registration', async () => {
      const secrets: string[] = [];
      mockWebhookRepo.create.mockImplementation((data: any) => {
        secrets.push(data.secret);
        return data;
      });
      mockWebhookRepo.save.mockImplementation((wh: any) => Promise.resolve(wh));

      await service.register('u1', 'https://a.com', ['e1']);
      await service.register('u1', 'https://b.com', ['e2']);

      expect(secrets[0]).not.toBe(secrets[1]);
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all webhooks for the user', async () => {
      const webhooks = [makeWebhook(), makeWebhook({ id: 'wh-2' })];
      mockWebhookRepo.find.mockResolvedValue(webhooks);

      const result = await service.list('u1');

      expect(result).toEqual(webhooks);
      expect(mockWebhookRepo.find).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });
  });

  // ── getWebhookForUser ─────────────────────────────────────────────────────────

  describe('getWebhookForUser', () => {
    it('returns webhook when found for user', async () => {
      const wh = makeWebhook();
      mockWebhookRepo.findOne.mockResolvedValue(wh);

      const result = await service.getWebhookForUser('wh-1', 'u1');

      expect(result).toEqual(wh);
      expect(mockWebhookRepo.findOne).toHaveBeenCalledWith({ where: { id: 'wh-1', userId: 'u1' } });
    });

    it('throws NotFoundException when webhook not found for user', async () => {
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.getWebhookForUser('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('removes webhook when it belongs to user', async () => {
      const wh = makeWebhook();
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockWebhookRepo.remove.mockResolvedValue(wh);

      await service.delete('u1', 'wh-1');

      expect(mockWebhookRepo.remove).toHaveBeenCalledWith(wh);
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('u1', 'missing')).rejects.toThrow(NotFoundException);
      expect(mockWebhookRepo.remove).not.toHaveBeenCalled();
    });
  });

  // ── rotateSecret ──────────────────────────────────────────────────────────────

  describe('rotateSecret', () => {
    it('rotates the secret, preserving the old one for the grace period', async () => {
      const wh = makeWebhook({ secret: 'old-secret' });
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockWebhookRepo.save.mockImplementation((w: any) => Promise.resolve(w));

      const result = await service.rotateSecret('u1', 'wh-1');

      expect(wh.previousSecret).toBe('old-secret');
      expect(wh.secret).not.toBe('old-secret');
      expect(result.secret).toBe(wh.secret);
      expect(result.previousSecretExpiresAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.rotateSecret('u1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getDlq ────────────────────────────────────────────────────────────────────

  describe('getDlq', () => {
    it('returns failed deliveries for the webhook', async () => {
      const wh = makeWebhook();
      const deliveries = [
        { id: 'd1', webhookId: 'wh-1', status: DeliveryStatus.FAILED } as WebhookDelivery,
      ];
      mockWebhookRepo.findOne.mockResolvedValue(wh);
      mockDeliveryRepo.find.mockResolvedValue(deliveries);

      const result = await service.getDlq('wh-1', 'u1');

      expect(result).toEqual(deliveries);
    });

    it('throws NotFoundException when webhook not found', async () => {
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(service.getDlq('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
