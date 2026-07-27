import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CacheInvalidationEvent {
  keys: string[];
  prefix?: string;
  source: string;
}

export enum CacheKeys {
  COURSE_DETAIL = 'course:detail:',
  COURSE_LIST = 'course:list:',
  ENROLLMENT_STATUS = 'enrollment:status:',
  USER_PROGRESS = 'progress:',
  COHORT_MEMBERS = 'cohort:members:',
  LEADERBOARD = 'leaderboard:',
  INSTRUCTOR_ANALYTICS = 'instructor:analytics:',
}

const CACHE_STRATEGIES = {
  [CacheKeys.COURSE_DETAIL]: { ttl: 3600, prefix: 'course:detail:' }, // 1 hour
  [CacheKeys.COURSE_LIST]: { ttl: 1800, prefix: 'course:list:' }, // 30 minutes
  [CacheKeys.ENROLLMENT_STATUS]: { ttl: 900, prefix: 'enrollment:status:' }, // 15 minutes
  [CacheKeys.USER_PROGRESS]: { ttl: 600, prefix: 'progress:' }, // 10 minutes
  [CacheKeys.COHORT_MEMBERS]: { ttl: 300, prefix: 'cohort:members:' }, // 5 minutes
  [CacheKeys.LEADERBOARD]: { ttl: 1800, prefix: 'leaderboard:' }, // 30 minutes
  [CacheKeys.INSTRUCTOR_ANALYTICS]: { ttl: 3600, prefix: 'instructor:analytics:' }, // 1 hour
};

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2,
  ) {}

  async invalidateByKey(key: string, source: string = 'unknown'): Promise<void> {
    this.logger.debug(`Invalidating cache key: ${key} (source: ${source})`);
    await this.cacheService.del(key);
    this.eventEmitter.emit('cache.invalidated', { keys: [key], source });
  }

  async invalidateByPrefix(prefix: string, source: string = 'unknown'): Promise<void> {
    this.logger.debug(`Invalidating cache prefix: ${prefix}* (source: ${source})`);
    await this.cacheService.invalidatePrefix(prefix);
    this.eventEmitter.emit('cache.invalidated', { prefix, source });
  }

  async invalidateCourse(courseId: string, source: string = 'unknown'): Promise<void> {
    // Invalidate course detail and all course lists
    await Promise.all([
      this.invalidateByKey(`${CacheKeys.COURSE_DETAIL}${courseId}`, source),
      this.invalidateByPrefix(CacheKeys.COURSE_LIST, source),
    ]);
  }

  async invalidateEnrollment(enrollmentId: string, source: string = 'unknown'): Promise<void> {
    await this.invalidateByKey(`${CacheKeys.ENROLLMENT_STATUS}${enrollmentId}`, source);
  }

  async invalidateUserProgress(userId: string, source: string = 'unknown'): Promise<void> {
    await this.invalidateByPrefix(`${CacheKeys.USER_PROGRESS}${userId}:`, source);
  }

  async invalidateCohort(cohortId: string, source: string = 'unknown'): Promise<void> {
    await this.invalidateByKey(`${CacheKeys.COHORT_MEMBERS}${cohortId}`, source);
  }

  async invalidateInstructorAnalytics(instructorId: string, source: string = 'unknown'): Promise<void> {
    await this.invalidateByPrefix(`${CacheKeys.INSTRUCTOR_ANALYTICS}${instructorId}:`, source);
  }

  async invalidateLeaderboard(source: string = 'unknown'): Promise<void> {
    await this.invalidateByPrefix(CacheKeys.LEADERBOARD, source);
  }

  /**
   * Get cache TTL strategy for a given key pattern
   */
  getStrategy(keyPrefix: string): { ttl: number; prefix: string } {
    return CACHE_STRATEGIES[keyPrefix] || { ttl: 600, prefix: keyPrefix };
  }

  /**
   * Protect against cache stampede by using probabilistic early expiration (jitter)
   */
  getTtlWithJitter(baseTtl: number, jitterPercent: number = 10): number {
    const jitter = (Math.random() - 0.5) * 2 * (baseTtl * jitterPercent / 100);
    return Math.max(60, baseTtl + jitter); // Never less than 60 seconds
  }
}
