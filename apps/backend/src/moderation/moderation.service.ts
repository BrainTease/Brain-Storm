import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ComprehendClient,
  DetectToxicContentCommand,
  TextSegment,
} from '@aws-sdk/client-comprehend';
import { ModerationItem } from './moderation-item.entity';
import { ModerationLog } from './moderation-log.entity';
import { ContentType, ModerationAction, ModerationStatus } from './moderation.enums';
import {
  AppealDto,
  FlagContentDto,
  ModerationQueueQueryDto,
  ReviewItemDto,
} from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly comprehend: ComprehendClient;
  private readonly toxicityThreshold: number;

  constructor(
    @InjectRepository(ModerationItem)
    private readonly itemRepo: Repository<ModerationItem>,
    @InjectRepository(ModerationLog)
    private readonly logRepo: Repository<ModerationLog>,
    private readonly config: ConfigService
  ) {
    this.comprehend = new ComprehendClient({
      region: this.config.get<string>('aws.region') || 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('aws.accessKeyId') || '',
        secretAccessKey: this.config.get<string>('aws.secretAccessKey') || '',
      },
    });
    this.toxicityThreshold = this.config.get<number>('moderation.toxicityThreshold') || 0.7;
  }

  /** Auto-moderate content via AWS Comprehend. Returns true if content was flagged. */
  async analyzeContent(
    contentType: ContentType,
    contentId: string,
    text: string,
    userId: string
  ): Promise<boolean> {
    let toxicityScore: number | null = null;
    let comprehendResult: Record<string, unknown> | null = null;

    try {
      const segments: TextSegment[] = [{ Text: text }];
      const command = new DetectToxicContentCommand({ TextSegments: segments, LanguageCode: 'en' });
      const response = await this.comprehend.send(command);

      comprehendResult = response as unknown as Record<string, unknown>;
      const resultItems = response.ResultList ?? [];
      toxicityScore = resultItems[0]?.Toxicity ?? null;
    } catch (err) {
      this.logger.warn(`Comprehend analysis failed for ${contentType}:${contentId} — ${err}`);
    }

    const isToxic = toxicityScore !== null && toxicityScore >= this.toxicityThreshold;

    if (isToxic) {
      const item = this.itemRepo.create({
        contentType,
        contentId,
        reportedByUserId: userId,
        status: ModerationStatus.PENDING,
        flagReason: 'Auto-flagged by AWS Comprehend',
        toxicityScore,
        comprehendResult,
      });
      const saved = await this.itemRepo.save(item);
      await this.log(saved.id, contentType, contentId, ModerationAction.FLAG, null, 'auto-flagged');
    }

    return isToxic;
  }

  /** Manually flag content */
  async flagContent(dto: FlagContentDto, userId: string): Promise<ModerationItem> {
    const existing = await this.itemRepo.findOne({
      where: { contentType: dto.contentType, contentId: dto.contentId, status: ModerationStatus.PENDING },
    });
    if (existing) return existing;

    const item = this.itemRepo.create({
      contentType: dto.contentType,
      contentId: dto.contentId,
      reportedByUserId: userId,
      status: ModerationStatus.PENDING,
      flagReason: dto.reason ?? null,
    });
    const saved = await this.itemRepo.save(item);
    await this.log(saved.id, dto.contentType, dto.contentId, ModerationAction.FLAG, userId, dto.reason);
    return saved;
  }

  /** Get moderation queue (admin only) */
  async getQueue(query: ModerationQueueQueryDto): Promise<ModerationItem[]> {
    const where: FindOptionsWhere<ModerationItem> = {};
    if (query.status) where.status = query.status;
    if (query.contentType) where.contentType = query.contentType;
    return this.itemRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  /** Admin reviews an item */
  async reviewItem(id: string, dto: ReviewItemDto, adminId: string): Promise<ModerationItem> {
    const item = await this.getItemOrThrow(id);
    if (item.status !== ModerationStatus.PENDING && item.status !== ModerationStatus.APPEALED) {
      throw new BadRequestException('Item is not pending review');
    }

    item.status = dto.status;
    item.reviewedByUserId = adminId;
    item.reviewNote = dto.note ?? null;
    const saved = await this.itemRepo.save(item);

    const action =
      dto.status === ModerationStatus.APPROVED ? ModerationAction.APPROVE : ModerationAction.REJECT;
    await this.log(id, item.contentType, item.contentId, action, adminId, dto.note);
    return saved;
  }

  /** Content owner submits an appeal */
  async submitAppeal(id: string, dto: AppealDto, userId: string): Promise<ModerationItem> {
    const item = await this.getItemOrThrow(id);
    if (item.status !== ModerationStatus.REJECTED) {
      throw new BadRequestException('Only rejected items can be appealed');
    }
    if (item.appealedByUserId) {
      throw new BadRequestException('Appeal already submitted');
    }

    item.status = ModerationStatus.APPEALED;
    item.appealReason = dto.reason;
    item.appealedByUserId = userId;
    const saved = await this.itemRepo.save(item);
    await this.log(id, item.contentType, item.contentId, ModerationAction.APPEAL_SUBMITTED, userId, dto.reason);
    return saved;
  }

  /** Admin resolves an appeal */
  async resolveAppeal(
    id: string,
    approve: boolean,
    adminId: string,
    note?: string
  ): Promise<ModerationItem> {
    const item = await this.getItemOrThrow(id);
    if (item.status !== ModerationStatus.APPEALED) {
      throw new BadRequestException('Item is not under appeal');
    }

    item.status = approve ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;
    item.reviewedByUserId = adminId;
    item.reviewNote = note ?? null;
    const saved = await this.itemRepo.save(item);

    const action = approve ? ModerationAction.APPEAL_APPROVED : ModerationAction.APPEAL_REJECTED;
    await this.log(id, item.contentType, item.contentId, action, adminId, note);
    return saved;
  }

  async getItemOrThrow(id: string): Promise<ModerationItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Moderation item not found');
    return item;
  }

  async getLogs(moderationItemId: string): Promise<ModerationLog[]> {
    return this.logRepo.find({ where: { moderationItemId }, order: { createdAt: 'ASC' } });
  }

  private async log(
    moderationItemId: string,
    contentType: ContentType,
    contentId: string,
    action: ModerationAction,
    performedByUserId: string | null,
    note?: string
  ) {
    const entry = this.logRepo.create({
      moderationItemId,
      contentType,
      contentId,
      action,
      performedByUserId,
      note: note ?? null,
    });
    await this.logRepo.save(entry);
  }
}
