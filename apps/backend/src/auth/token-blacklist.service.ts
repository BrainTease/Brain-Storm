import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TokenBlacklist } from './token-blacklist.entity';
import * as crypto from 'crypto';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectRepository(TokenBlacklist)
    private blacklistRepo: Repository<TokenBlacklist>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async blacklistToken(token: string, userId: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `blacklist:${tokenHash}`;

    // Add to cache for fast lookup
    const ttlMs = expiresAt.getTime() - Date.now();
    if (ttlMs > 0) {
      await this.cacheManager.set(cacheKey, true, ttlMs);
    }

    // Add to database for persistence
    await this.blacklistRepo.save(
      this.blacklistRepo.create({
        tokenHash,
        userId,
        expiresAt,
      })
    );
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `blacklist:${tokenHash}`;

    // Check cache first
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Check database
    const entry = await this.blacklistRepo.findOne({
      where: { tokenHash },
    });

    if (entry) {
      // Re-cache for future lookups
      const ttlMs = entry.expiresAt.getTime() - Date.now();
      if (ttlMs > 0) {
        await this.cacheManager.set(cacheKey, true, ttlMs);
      }
      return true;
    }

    return false;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.blacklistRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
