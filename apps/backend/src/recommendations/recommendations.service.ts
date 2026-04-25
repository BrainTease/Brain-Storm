import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { Progress } from '../progress/progress.entity';

@Injectable()
export class RecommendationsService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Progress) private progressRepo: Repository<Progress>,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getRecommendations(userId: string, limit = 10): Promise<Course[]> {
    const cacheKey = `recommendations:${userId}`;
    const cached = await this.cache.get<Course[]>(cacheKey);
    if (cached) return cached;

    const [collaborative, contentBased] = await Promise.all([
      this.collaborativeFiltering(userId, limit),
      this.contentBasedFiltering(userId, limit),
    ]);

    // Merge and deduplicate, collaborative first
    const seen = new Set<string>();
    const merged: Course[] = [];
    for (const c of [...collaborative, ...contentBased]) {
      if (!seen.has(c.id) && merged.length < limit) {
        seen.add(c.id);
        merged.push(c);
      }
    }

    // Fallback: popular courses if not enough
    if (merged.length < limit) {
      const popular = await this.getPopularCourses(limit - merged.length, seen);
      merged.push(...popular);
    }

    await this.cache.set(cacheKey, merged, this.CACHE_TTL);
    return merged;
  }

  /** Collaborative filtering: find users with similar enrollments */
  private async collaborativeFiltering(userId: string, limit: number): Promise<Course[]> {
    // Get courses the user is already enrolled in
    const userEnrollments = await this.enrollmentRepo.find({ where: { userId } });
    const enrolledIds = userEnrollments.map((e) => e.courseId);
    if (!enrolledIds.length) return [];

    // Find users who share at least one course
    const similarUsers = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('e.userId', 'userId')
      .addSelect('COUNT(*)', 'overlap')
      .where('e.courseId IN (:...ids)', { ids: enrolledIds })
      .andWhere('e.userId != :userId', { userId })
      .groupBy('e.userId')
      .orderBy('overlap', 'DESC')
      .limit(20)
      .getRawMany<{ userId: string }>();

    if (!similarUsers.length) return [];

    const similarUserIds = similarUsers.map((u) => u.userId);

    // Get courses those users enrolled in that our user hasn't
    const recs = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.course', 'course')
      .where('e.userId IN (:...ids)', { ids: similarUserIds })
      .andWhere(enrolledIds.length ? 'e.courseId NOT IN (:...enrolled)' : '1=1', {
        enrolled: enrolledIds,
      })
      .andWhere('course.isPublished = true')
      .andWhere('course.isDeleted = false')
      .select('e.courseId', 'courseId')
      .addSelect('COUNT(*)', 'score')
      .groupBy('e.courseId')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany<{ courseId: string }>();

    if (!recs.length) return [];

    return this.courseRepo.findByIds(recs.map((r) => r.courseId));
  }

  /** Content-based filtering: recommend courses with same level as completed ones */
  private async contentBasedFiltering(userId: string, limit: number): Promise<Course[]> {
    const completed = await this.enrollmentRepo.find({
      where: { userId },
      relations: ['course'],
    });

    if (!completed.length) return [];

    const enrolledIds = completed.map((e) => e.courseId);
    const levels = [...new Set(completed.map((e) => e.course?.level).filter(Boolean))];

    if (!levels.length) return [];

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .where('course.level IN (:...levels)', { levels })
      .andWhere('course.isPublished = true')
      .andWhere('course.isDeleted = false')
      .andWhere('course.id NOT IN (:...enrolled)', { enrolled: enrolledIds })
      .orderBy('course.createdAt', 'DESC')
      .limit(limit);

    return qb.getMany();
  }

  private async getPopularCourses(limit: number, exclude: Set<string>): Promise<Course[]> {
    const popular = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('e.courseId', 'courseId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('e.courseId')
      .orderBy('cnt', 'DESC')
      .limit(limit + exclude.size)
      .getRawMany<{ courseId: string }>();

    const ids = popular.map((p) => p.courseId).filter((id) => !exclude.has(id)).slice(0, limit);
    if (!ids.length) return [];
    return this.courseRepo.findByIds(ids);
  }

  async invalidateCache(userId: string) {
    await this.cache.del(`recommendations:${userId}`);
  }
}
