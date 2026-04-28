import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SecretRotation, SecretType } from './secret-rotation.entity';
import { ApiKey } from '../auth/api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class SecretRotationService {
  private readonly logger = new Logger(SecretRotationService.name);

  constructor(
    @InjectRepository(SecretRotation) private rotationRepo: Repository<SecretRotation>,
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoRotateExpiredApiKeys() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oldKeys = await this.apiKeyRepo.find({
      where: { isActive: true, createdAt: LessThan(ninetyDaysAgo) },
    });

    for (const key of oldKeys) {
      await this.apiKeyRepo.update(key.id, { isActive: false });
      await this.logRotation(SecretType.API_KEY, key.id, null, true);
      this.logger.warn(`Auto-rotated API key ${key.id} (older than 90 days)`);
    }
  }

  async rotateApiKey(keyId: string, userId: string): Promise<string> {
    const key = await this.apiKeyRepo.findOne({ where: { id: keyId, userId } });
    if (!key) throw new Error('API key not found');

    const rawKey = `bst_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await this.apiKeyRepo.update(keyId, { keyHash: hash, lastUsedAt: null });
    await this.logRotation(SecretType.API_KEY, keyId, userId, false);

    this.logger.log(`API key ${keyId} rotated by user ${userId}`);
    return rawKey;
  }

  async getRotationHistory(secretType?: string, limit = 50) {
    const qb = this.rotationRepo.createQueryBuilder('r');
    if (secretType) qb.where('r.secretType = :secretType', { secretType });
    qb.orderBy('r.rotatedAt', 'DESC').limit(limit);
    return qb.getMany();
  }

  private async logRotation(
    secretType: SecretType,
    identifier: string | null,
    rotatedBy: string | null,
    automated: boolean,
  ) {
    await this.rotationRepo.save({
      secretType,
      identifier,
      rotatedBy,
      automated,
      rotatedAt: new Date(),
    });
  }
}
