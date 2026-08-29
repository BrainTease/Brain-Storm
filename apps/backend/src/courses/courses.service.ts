/**
 * CoursesService – Issue #817 refactor
 *
 * Previously injected CACHE_MANAGER directly, duplicated a private
 * `deleteCacheKeys` helper (raw Redis key scan + del), and used
 * `cacheManager.wrap` – a pattern not available in all cache backends.
 *
 * Now delegates all caching to CacheService:
 *  - `getOrSet`        replaces `cacheManager.wrap`
 *  - `del`             replaces `cacheManager.del`
 *  - `invalidatePrefix` replaces the private `deleteCacheKeys` helper
 *
 * The `CACHE_MANAGER` injection token is no longer used in this class.
 */

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Course, CourseStatus } from './course.entity';
import { CourseQueryDto } from './dto/course-query.dto';
import { SearchService } from '../search/search.service';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';
import { CacheService } from '../cache/cache.service';
import { COURSES_REPOSITORY_TOKEN, CoursesRepository } from '../repositories';

/** Base cache key for all-courses queries. */
const CACHE_KEY = 'courses:all';
/** Per-item key prefix. */
const COURSE_CACHE_KEY_PREFIX = 'courses:';
/** Default TTL in seconds (1 minute). */
const CACHE_TTL = 60;

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSES_REPOSITORY_TOKEN) private readonly coursesRepository: CoursesRepository,
    private readonly cacheService: CacheService,
    private readonly searchService: SearchService
  ) {}

  async findAll(query: CourseQueryDto = {}) {
    const { search, level, page = 1, limit = 20 } = query;
    const cacheKey = `${CACHE_KEY}:${search ?? 'all'}:${level ?? 'all'}:${page}:${limit}`;

    const result = await this.cacheService.getOrSet(
      cacheKey,
      () => this.coursesRepository.findAll(query),
      CACHE_TTL
    );

    return new PaginatedResponseDto(result.data, 200, result.page, result.limit, result.total);
  }

  async findOne(id: string): Promise<Course> {
    const cacheKey = `${COURSE_CACHE_KEY_PREFIX}${id}`;
    return this.cacheService.getOrSet<Course>(
      cacheKey,
      async () => {
        const course = await this.coursesRepository.findById(id);
        if (!course) throw new NotFoundException('Course not found');
        return course;
      },
      CACHE_TTL
    );
  }

  async create(data: Partial<Course>) {
    const course = await this.coursesRepository.save(data);
    await this.invalidateCache();
    await this.searchService.indexCourse(course).catch(() => {});
    return course;
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    const updated = await this.coursesRepository.save({ ...course, ...data });
    await this.invalidateCache(id);
    await this.searchService.indexCourse(updated).catch(() => {});
    return updated;
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    const removed = await this.coursesRepository.remove(course);
    await this.invalidateCache(id);
    await this.searchService.deleteFromIndex('courses', id).catch(() => {});
    return removed;
  }

  /** Warm the list cache with a default query on startup / on demand. */
  async warmCache() {
    await this.findAll({});
  }

  async scheduleCourse(id: string, scheduledAt: Date): Promise<Course> {
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
    const course = await this.findOne(id);
    return this.coursesRepository.save({
      ...course,
      status: CourseStatus.SCHEDULED,
      scheduledAt,
      isPublished: false,
    });
  }

  async publishNow(id: string): Promise<Course> {
    const course = await this.findOne(id);
    const now = new Date();
    return this.coursesRepository.save({
      ...course,
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: now,
      scheduledAt: course.scheduledAt ?? null,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Invalidate the list cache (all pages) and optionally a single item key.
   * Uses CacheService.invalidatePrefix so the raw Redis pattern scan is
   * centralised in one place.
   */
  private async invalidateCache(id?: string): Promise<void> {
    await this.cacheService.invalidatePrefix(`${CACHE_KEY}:`);
    if (id) {
      await this.cacheService.del(`${COURSE_CACHE_KEY_PREFIX}${id}`);
    }
  }
}
