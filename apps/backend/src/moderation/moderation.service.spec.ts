import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ModerationService } from './moderation.service';
import { ModerationItem } from './moderation-item.entity';
import { ModerationLog } from './moderation-log.entity';
import { ContentType, ModerationAction, ModerationStatus } from './moderation.enums';
import { FlagContentDto, ReviewItemDto, AppealDto } from './dto/moderation.dto';

// Prevent real AWS Comprehend client instantiation
jest.mock('@aws-sdk/client-comprehend', () => ({
  ComprehendClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  DetectToxicContentCommand: jest.fn(),
}));

describe('ModerationService', () => {
  let service: ModerationService;

  const mockItemRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'aws.region': 'us-east-1',
        'aws.accessKeyId': 'test-key',
        'aws.secretAccessKey': 'test-secret',
        'moderation.toxicityThreshold': 0.7,
      };
      return config[key];
    }),
  };

  const makeItem = (overrides: Partial<ModerationItem> = {}): ModerationItem =>
    ({
      id: 'item-1',
      contentType: ContentType.POST,
      contentId: 'post-1',
      reportedByUserId: 'user-reporter',
      status: ModerationStatus.PENDING,
      flagReason: null,
      toxicityScore: null,
      comprehendResult: null,
      reviewedByUserId: null,
      reviewNote: null,
      appealReason: null,
      appealedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as ModerationItem);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ModerationLog), useValue: mockLogRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    // Silence logger noise in test output
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── flagContent ─────────────────────────────────────────────────────────────

  describe('flagContent', () => {
    const flagDto: FlagContentDto = {
      contentType: ContentType.POST,
      contentId: 'post-1',
      reason: 'Spam',
    };
    const userId = 'user-reporter';

    it('creates a new moderation item when content is not already flagged', async () => {
      const newItem = makeItem();
      mockItemRepo.findOne.mockResolvedValue(null);
      mockItemRepo.create.mockReturnValue(newItem);
      mockItemRepo.save.mockResolvedValue(newItem);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const result = await service.flagContent(flagDto, userId);

      expect(mockItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          contentType: flagDto.contentType,
          contentId: flagDto.contentId,
          status: ModerationStatus.PENDING,
        },
      });
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ contentId: flagDto.contentId, reportedByUserId: userId }),
      );
      expect(result).toEqual(newItem);
    });

    it('returns existing item when content is already pending review', async () => {
      const existing = makeItem();
      mockItemRepo.findOne.mockResolvedValue(existing);

      const result = await service.flagContent(flagDto, userId);

      expect(mockItemRepo.create).not.toHaveBeenCalled();
      expect(mockItemRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('logs the flag action on new item creation', async () => {
      const newItem = makeItem();
      mockItemRepo.findOne.mockResolvedValue(null);
      mockItemRepo.create.mockReturnValue(newItem);
      mockItemRepo.save.mockResolvedValue(newItem);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      await service.flagContent(flagDto, userId);

      expect(mockLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.FLAG }),
      );
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  // ── reviewItem ──────────────────────────────────────────────────────────────

  describe('reviewItem', () => {
    const adminId = 'admin-1';

    it('approves a pending item', async () => {
      const item = makeItem({ status: ModerationStatus.PENDING });
      const saved = makeItem({ status: ModerationStatus.APPROVED, reviewedByUserId: adminId });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const dto: ReviewItemDto = { status: ModerationStatus.APPROVED };
      const result = await service.reviewItem('item-1', dto, adminId);

      expect(item.status).toBe(ModerationStatus.APPROVED);
      expect(item.reviewedByUserId).toBe(adminId);
      expect(result).toEqual(saved);
    });

    it('rejects a pending item', async () => {
      const item = makeItem({ status: ModerationStatus.PENDING });
      const saved = makeItem({ status: ModerationStatus.REJECTED });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const dto: ReviewItemDto = { status: ModerationStatus.REJECTED, note: 'Policy violation' };
      await service.reviewItem('item-1', dto, adminId);

      expect(item.reviewNote).toBe('Policy violation');
    });

    it('can review an APPEALED item', async () => {
      const item = makeItem({ status: ModerationStatus.APPEALED });
      const saved = makeItem({ status: ModerationStatus.APPROVED });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const dto: ReviewItemDto = { status: ModerationStatus.APPROVED };
      await expect(service.reviewItem('item-1', dto, adminId)).resolves.toBeDefined();
    });

    it('throws BadRequestException when item is already approved (not pending)', async () => {
      const item = makeItem({ status: ModerationStatus.APPROVED });
      mockItemRepo.findOne.mockResolvedValue(item);

      const dto: ReviewItemDto = { status: ModerationStatus.APPROVED };
      await expect(service.reviewItem('item-1', dto, adminId)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      const dto: ReviewItemDto = { status: ModerationStatus.APPROVED };
      await expect(service.reviewItem('nonexistent', dto, adminId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── submitAppeal ────────────────────────────────────────────────────────────

  describe('submitAppeal', () => {
    const userId = 'content-owner';
    const appealDto: AppealDto = { reason: 'I believe this was flagged in error' };

    it('submits an appeal on a rejected item', async () => {
      const item = makeItem({ status: ModerationStatus.REJECTED });
      const saved = makeItem({ status: ModerationStatus.APPEALED, appealedByUserId: userId });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const result = await service.submitAppeal('item-1', appealDto, userId);

      expect(item.status).toBe(ModerationStatus.APPEALED);
      expect(item.appealReason).toBe(appealDto.reason);
      expect(item.appealedByUserId).toBe(userId);
      expect(result).toEqual(saved);
    });

    it('throws BadRequestException when item is not rejected', async () => {
      const item = makeItem({ status: ModerationStatus.PENDING });
      mockItemRepo.findOne.mockResolvedValue(item);

      await expect(service.submitAppeal('item-1', appealDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when appeal already submitted', async () => {
      const item = makeItem({
        status: ModerationStatus.REJECTED,
        appealedByUserId: 'existing-appealer',
      });
      mockItemRepo.findOne.mockResolvedValue(item);

      await expect(service.submitAppeal('item-1', appealDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(service.submitAppeal('nonexistent', appealDto, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── resolveAppeal ───────────────────────────────────────────────────────────

  describe('resolveAppeal', () => {
    const adminId = 'admin-1';

    it('approves an appeal (approve=true sets status to APPROVED)', async () => {
      const item = makeItem({ status: ModerationStatus.APPEALED });
      const saved = makeItem({ status: ModerationStatus.APPROVED });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const result = await service.resolveAppeal('item-1', true, adminId);

      expect(item.status).toBe(ModerationStatus.APPROVED);
      expect(result).toEqual(saved);
    });

    it('rejects an appeal (approve=false keeps status REJECTED)', async () => {
      const item = makeItem({ status: ModerationStatus.APPEALED });
      const saved = makeItem({ status: ModerationStatus.REJECTED });

      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(saved);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      const result = await service.resolveAppeal('item-1', false, adminId, 'Still in violation');

      expect(item.status).toBe(ModerationStatus.REJECTED);
      expect(item.reviewNote).toBe('Still in violation');
      expect(result).toEqual(saved);
    });

    it('throws BadRequestException when item is not under appeal', async () => {
      const item = makeItem({ status: ModerationStatus.REJECTED });
      mockItemRepo.findOne.mockResolvedValue(item);

      await expect(service.resolveAppeal('item-1', true, adminId)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(service.resolveAppeal('nonexistent', true, adminId)).rejects.toThrow(NotFoundException);
    });

    it('logs APPEAL_APPROVED action when appeal is approved', async () => {
      const item = makeItem({ status: ModerationStatus.APPEALED });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      await service.resolveAppeal('item-1', true, adminId);

      expect(mockLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.APPEAL_APPROVED }),
      );
    });

    it('logs APPEAL_REJECTED action when appeal is rejected', async () => {
      const item = makeItem({ status: ModerationStatus.APPEALED });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);
      mockLogRepo.create.mockReturnValue({});
      mockLogRepo.save.mockResolvedValue({});

      await service.resolveAppeal('item-1', false, adminId);

      expect(mockLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.APPEAL_REJECTED }),
      );
    });
  });

  // ── getItemOrThrow ──────────────────────────────────────────────────────────

  describe('getItemOrThrow', () => {
    it('returns item when found', async () => {
      const item = makeItem();
      mockItemRepo.findOne.mockResolvedValue(item);

      const result = await service.getItemOrThrow('item-1');

      expect(result).toEqual(item);
    });

    it('throws NotFoundException when item not found', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(service.getItemOrThrow('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
