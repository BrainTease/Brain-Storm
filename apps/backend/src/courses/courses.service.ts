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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from './course.entity';
import { CourseQueryDto } from './dto/course-query.dto';
import { SearchService } from '../search/search.service';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';
import { QueryOptimizer } from '../common/database/query-optimizer';
import { CacheService } from '../cache/cache.service';

/** Base cache key for all-courses queries. */
const CACHE_KEY = 'courses:all';
/** Per-item key prefix. */
const COURSE_CACHE_KEY_PREFIX = 'courses:';
/** Default TTL in seconds (1 minute). */
const CACHE_TTL = 60;

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private repo: Repository<Course>,
    private readonly cacheService: CacheService,
    private readonly searchService: SearchService
  ) {}

  async findAll(query: CourseQueryDto = {}) {
    const { search, level, page = 1, limit = 20 } = query;
    const cacheKey = `${CACHE_KEY}:${search ?? 'all'}:${level ?? 'all'}:${page}:${limit}`;

    const result = await this.cacheService.getOrSet(
      cacheKey,
      () => this.queryCourses(query),
      CACHE_TTL
    );

    return new PaginatedResponseDto(result.data, 200, result.page, result.limit, result.total);
  }

  private async queryCourses(query: CourseQueryDto = {}) {
    const { search, level, page = 1, limit = 20 } = query;

    let qb = this.repo
      .createQueryBuilder('course')
      .where('course.isPublished = :isPublished', { isPublished: true })
      .andWhere('course.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      qb = qb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (level) {
      qb = qb.andWhere('course.level = :level', { level });
    }

    qb = QueryOptimizer.eagerLoadRelations(qb, ['modules', 'reviews']);
    const total = await qb.clone().getCount();
    qb = QueryOptimizer.paginate(qb, page, limit);
    qb = QueryOptimizer.sort(qb, 'createdAt', 'DESC');
    const courses = await qb.getMany();

    return { data: courses, total, page, limit };
  }

  async findOne(id: string): Promise<Course> {
    const cacheKey = `${COURSE_CACHE_KEY_PREFIX}${id}`;
    return this.cacheService.getOrSet<Course>(
      cacheKey,
      async () => {
        const course = await this.repo.findOne({ where: { id, isDeleted: false } });
        if (!course) throw new NotFoundException('Course not found');
        return course;
      },
      CACHE_TTL
    );
  }

  async create(data: Partial<Course>) {
    const course = await this.repo.save(this.repo.create(data));
    await this.invalidateCache();
    await this.searchService.indexCourse(course).catch(() => {});
    return course;
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    const updated = await this.repo.save({ ...course, ...data });
    await this.invalidateCache(id);
    await this.searchService.indexCourse(updated).catch(() => {});
    return updated;
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    const removed = await this.repo.remove(course);
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
    return this.repo.save({
      ...course,
      status: CourseStatus.SCHEDULED,
      scheduledAt,
      isPublished: false,
    });
  }

  async publishNow(id: string): Promise<Course> {
    const course = await this.findOne(id);
    const now = new Date();
    return this.repo.save({
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
