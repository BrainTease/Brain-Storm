/**
 * CacheStage — Stage 4 of the analytics ingestion pipeline.
 *
 * Responsibility: Invalidate the stale cache entry for the course so that
 * the next call to `getAnalytics` fetches the freshly persisted record.
 * This stage performs exactly one cache operation per course.
 */

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PipelineContext, PipelineStage } from './pipeline.types';

@Injectable()
export class CacheStage implements PipelineStage {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async execute(ctx: PipelineContext): Promise<void> {
    await this.cache.del(`analytics:${ctx.courseId}`);
  }
}
