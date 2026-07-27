/**
 * Redis Sorted-Set Leaderboard Service (Issue #630)
 *
 * Maintains rankings in Redis sorted sets keyed by scope:
 *   leaderboard:global          – all users
 *   leaderboard:cohort:<id>     – cohort members
 *   leaderboard:course:<id>     – course enrollees
 *
 * Scores are updated on progress, quiz, and reward events.
 * Rankings are O(log n) reads via ZREVRANK/ZREVRANGE.
 * A periodic reconciliation job syncs Redis against the source-of-truth tables.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as IORedis from 'ioredis';
import { Progress } from '../progress/progress.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { User } from '../users/user.entity';

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  score: number;
  rank: number;
}

export interface PagedLeaderboard {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// Score weights
const PROGRESS_WEIGHT = 1;    // 1 point per % of progress
const COMPLETION_BONUS = 50;  // bonus for full course completion
const QUIZ_WEIGHT = 10;        // 10 points per quiz point

@Injectable()
export class RedisLeaderboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisLeaderboardService.name);
  private redis: IORedis.Redis;

  // Cache leaderboard page reads for 10 seconds
  private readonly PAGE_CACHE_TTL = 10;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.redis = new IORedis.Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    this.redis.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  // ── Score updates ────────────────────────────────────────────────────────

  /**
   * Add progress-based score for a user in global, course, and optional cohort scopes.
   */
  async updateProgressScore(
    userId: string,
    courseId: string,
    progressPct: number,
    cohortId?: string,
  ) {
    const delta = progressPct * PROGRESS_WEIGHT;
    const keys = this.buildKeys(courseId, cohortId);
    await this.incrementScores(keys, userId, delta);
  }

  /**
   * Apply the course-completion bonus for a user.
   */
  async applyCompletionBonus(userId: string, courseId: string, cohortId?: string) {
    const keys = this.buildKeys(courseId, cohortId);
    await this.incrementScores(keys, userId, COMPLETION_BONUS);
  }

  /**
   * Update score from a quiz result.
   */
  async updateQuizScore(
    userId: string,
    courseId: string,
    score: number,
    cohortId?: string,
  ) {
    const delta = score * QUIZ_WEIGHT;
    const keys = this.buildKeys(courseId, cohortId);
    await this.incrementScores(keys, userId, delta);
  }

  /**
   * Update score from a reward (token mint).
   * 1 BST (in smallest unit = 10^7) → 1 leaderboard point.
   */
  async updateRewardScore(userId: string, bstAmount: number) {
    const points = Math.floor(bstAmount / 10_000_000);
    if (points <= 0) return;
    await this.redis.zincrby(this.globalKey(), points, userId);
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  /**
   * Get top-N entries for a scope with username enrichment.
   * Cached for PAGE_CACHE_TTL seconds to absorb bursts.
   */
  async getTopEntries(
    scope: 'global' | 'course' | 'cohort',
    scopeId: string | null,
    limit = 50,
  ): Promise<LeaderboardEntry[]> {
    const key = this.scopeKey(scope, scopeId);
    const cacheKey = `lb:cache:${key}:${limit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as LeaderboardEntry[];

    const raw = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const entries = await this.hydrateEntries(raw);

    await this.redis.set(cacheKey, JSON.stringify(entries), 'EX', this.PAGE_CACHE_TTL);
    return entries;
  }

  /**
   * Paginated leaderboard for a scope.
   */
  async getPage(
    scope: 'global' | 'course' | 'cohort',
    scopeId: string | null,
    page = 1,
    pageSize = 20,
  ): Promise<PagedLeaderboard> {
    const key = this.scopeKey(scope, scopeId);
    const offset = (page - 1) * pageSize;

    const [total, raw] = await Promise.all([
      this.redis.zcard(key),
      this.redis.zrevrange(key, offset, offset + pageSize - 1, 'WITHSCORES'),
    ]);

    const entries = await this.hydrateEntries(raw, offset);
    return { entries, total, page, pageSize };
  }

  /**
   * Get a user's rank and score in a scope ("around-me").
   */
  async getUserRank(
    scope: 'global' | 'course' | 'cohort',
    scopeId: string | null,
    userId: string,
  ): Promise<{ rank: number; score: number } | null> {
    const key = this.scopeKey(scope, scopeId);
    const [rank, score] = await Promise.all([
      this.redis.zrevrank(key, userId),
      this.redis.zscore(key, userId),
    ]);

    if (rank === null) return null;
    return { rank: rank + 1, score: Number(score ?? 0) };
  }

  /**
   * Get entries around a user (neighbourhood view).
   */
  async getAroundMe(
    scope: 'global' | 'course' | 'cohort',
    scopeId: string | null,
    userId: string,
    radius = 5,
  ): Promise<LeaderboardEntry[]> {
    const key = this.scopeKey(scope, scopeId);
    const rank = await this.redis.zrevrank(key, userId);
    if (rank === null) return [];

    const start = Math.max(0, rank - radius);
    const end = rank + radius;
    const raw = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    return this.hydrateEntries(raw, start);
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  /**
   * Hourly full reconciliation against source-of-truth DB.
   * Rebuilds global + per-course sorted sets from progress & enrollment tables.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcile() {
    this.logger.log('Starting leaderboard reconciliation…');

    try {
      // Load all progress rows
      const progressRows = await this.progressRepo.find({ select: ['userId', 'courseId', 'progressPct', 'completedAt'] });

      // Load all enrollments
      const enrollments = await this.enrollmentRepo.find({ select: ['userId', 'courseId', 'completedAt'] });

      // Aggregate scores per user (global) and per course
      const globalScores = new Map<string, number>();
      const courseScores = new Map<string, Map<string, number>>(); // courseId → userId → score

      for (const row of progressRows) {
        const base = row.progressPct * PROGRESS_WEIGHT;
        const bonus = row.completedAt ? COMPLETION_BONUS : 0;
        const total = base + bonus;

        globalScores.set(row.userId, (globalScores.get(row.userId) ?? 0) + total);

        if (!courseScores.has(row.courseId)) courseScores.set(row.courseId, new Map());
        const cs = courseScores.get(row.courseId)!;
        cs.set(row.userId, (cs.get(row.userId) ?? 0) + total);
      }

      // Write global sorted set atomically
      await this.rebuildSortedSet(this.globalKey(), globalScores);

      // Write per-course sorted sets
      for (const [courseId, scores] of courseScores) {
        await this.rebuildSortedSet(`leaderboard:course:${courseId}`, scores);
      }

      this.logger.log(`Reconciliation complete: ${globalScores.size} users, ${courseScores.size} courses`);
    } catch (err) {
      this.logger.error(`Reconciliation failed: ${err.message}`);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private globalKey(): string {
    return 'leaderboard:global';
  }

  private scopeKey(scope: 'global' | 'course' | 'cohort', id: string | null): string {
    if (scope === 'global') return this.globalKey();
    if (!id) return this.globalKey();
    return `leaderboard:${scope}:${id}`;
  }

  private buildKeys(courseId: string, cohortId?: string): string[] {
    const keys = [this.globalKey(), `leaderboard:course:${courseId}`];
    if (cohortId) keys.push(`leaderboard:cohort:${cohortId}`);
    return keys;
  }

  private async incrementScores(keys: string[], userId: string, delta: number) {
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.zincrby(key, delta, userId);
    }
    await pipeline.exec();
  }

  private async hydrateEntries(raw: string[], offset = 0): Promise<LeaderboardEntry[]> {
    // raw = [userId, score, userId, score, …]
    if (!raw.length) return [];

    const userIds: string[] = [];
    for (let i = 0; i < raw.length; i += 2) userIds.push(raw[i]);

    const users = await this.userRepo.findByIds(userIds, { select: ['id', 'username'] });
    const userMap = new Map(users.map((u) => [u.id, u.username ?? null]));

    return userIds.map((userId, idx) => ({
      userId,
      username: userMap.get(userId) ?? null,
      score: Number(raw[idx * 2 + 1] ?? 0),
      rank: offset + idx + 1,
    }));
  }

  private async rebuildSortedSet(key: string, scores: Map<string, number>) {
    const tmpKey = `${key}:tmp`;
    const pipeline = this.redis.pipeline();
    pipeline.del(tmpKey);
    for (const [userId, score] of scores) {
      pipeline.zadd(tmpKey, score, userId);
    }
    pipeline.rename(tmpKey, key);
    await pipeline.exec();
  }
}
