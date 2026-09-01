/**
 * LeaderboardService – Issue #817 refactor
 *
 * Previously injected CACHE_MANAGER directly and duplicated the get/set
 * pattern that CacheService already abstracts.
 *
 * Now delegates all cache reads and writes to CacheService, which
 * - provides a consistent getOrSet helper
 * - tracks cache hit/miss Prometheus metrics
 * - handles Redis prefix-based invalidation centrally
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { StellarService } from '../stellar/stellar.service';
import { CacheService } from '../cache/cache.service';

type LeaderboardEntry = {
  userId: string;
  username: string | null;
  email: string;
  stellarPublicKey: string;
  balance: string;
};

/** Cache key for the top-50 leaderboard snapshot. */
const LEADERBOARD_TOP50_KEY = 'leaderboard:top50';
/** TTL in seconds (5 minutes). */
const LEADERBOARD_CACHE_TTL = 300;

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stellarService: StellarService,
    private readonly cacheService: CacheService
  ) {}

  async getTopUsers(): Promise<LeaderboardEntry[]> {
    return this.cacheService.getOrSet<LeaderboardEntry[]>(
      LEADERBOARD_TOP50_KEY,
      () => this.computeTopUsers(),
      LEADERBOARD_CACHE_TTL
    );
  }

  private async computeTopUsers(): Promise<LeaderboardEntry[]> {
    const users = await this.userRepo.find({
      where: {},
      order: { createdAt: 'DESC' },
    });

    const walletUsers = users.filter((user) => Boolean(user.stellarPublicKey) && !user.deletedAt);

    const balances = await Promise.all(
      walletUsers.map(async (user) => {
        try {
          const balance = await this.stellarService.getTokenBalance(user.stellarPublicKey);
          return {
            userId: user.id,
            username: user.username ?? null,
            email: user.email,
            stellarPublicKey: user.stellarPublicKey,
            balance,
          };
        } catch {
          return {
            userId: user.id,
            username: user.username ?? null,
            email: user.email,
            stellarPublicKey: user.stellarPublicKey,
            balance: '0',
          };
        }
      })
    );

    return balances
      .sort((a, b) => {
        const left = BigInt(a.balance);
        const right = BigInt(b.balance);
        if (left === right) return a.email.localeCompare(b.email);
        return right > left ? 1 : -1;
      })
      .slice(0, 50);
  }
}
