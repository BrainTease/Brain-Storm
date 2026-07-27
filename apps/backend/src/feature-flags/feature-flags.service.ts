import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { FeatureFlag, FlagType } from './feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  private readonly TTL = 60; // seconds

  constructor(
    @InjectRepository(FeatureFlag) private repo: Repository<FeatureFlag>,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  private cacheKey(key: string) {
    return `feature_flag:${key}`;
  }

  private async getFlag(key: string): Promise<FeatureFlag | null> {
    const cached = await this.cache.get<FeatureFlag>(this.cacheKey(key));
    if (cached) return cached;
    const flag = await this.repo.findOne({ where: { key } });
    if (flag) await this.cache.set(this.cacheKey(key), flag, this.TTL);
    return flag;
  }

  async evaluate(key: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlag(key);
    if (!flag || !flag.enabled) return false;

    if (flag.type === FlagType.BOOLEAN) return true;

    if (flag.type === FlagType.PERCENTAGE) {
      // Deterministic hash based on userId+key to ensure consistency
      const hash = userId
        ? [...`${userId}:${key}`].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0)
        : Math.random() * 100;
      return (hash % 100) < flag.percentage;
    }

    if (flag.type === FlagType.USER_TARGETED && userId) {
      return (flag.targetedUserIds ?? []).includes(userId);
    }

    return false;
  }

  findAll() {
    return this.repo.find();
  }

  async upsert(data: Partial<FeatureFlag>) {
    const existing = data.key ? await this.repo.findOne({ where: { key: data.key } }) : null;
    const flag = existing ? { ...existing, ...data } : this.repo.create(data);
    const saved = await this.repo.save(flag);
    await this.cache.del(this.cacheKey(saved.key));
    return saved;
  }

  async remove(key: string) {
    const flag = await this.repo.findOne({ where: { key } });
    if (flag) {
      await this.repo.remove(flag);
      await this.cache.del(this.cacheKey(key));
    }
  }
}
