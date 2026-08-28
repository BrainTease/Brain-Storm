import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Course, CourseStatus } from './course.entity';
import { CourseQueryDto } from './dto/course-query.dto';
import { SearchService } from '../search/search.service';
import {
  CoursesRepository,
  COURSES_REPOSITORY_TOKEN,
} from '../repositories/courses-repository.interface';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';

@Injectable()
export class CoursesService {
  private readonly CACHE_KEY = 'courses:all';
  private readonly CACHE_TTL = 60;

  constructor(
    @Inject(COURSES_REPOSITORY_TOKEN)
    private readonly coursesRepository: CoursesRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly searchService: SearchService
  ) {}

  async findAll(query: CourseQueryDto = {}): Promise<PaginatedResponseDto<Course>> {
    const { page = 1, limit = 20 } = query;
    const result = await this.coursesRepository.findAll(query);
    return new PaginatedResponseDto<Course>(result.data, 200, page, limit, result.total);
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.coursesRepository.findById(id);
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: Partial<Course>): Promise<Course> {
    const course = await this.coursesRepository.save(data);
    await this.invalidateCache();
    await this.searchService.indexCourse(course).catch(() => {});
    return course;
  }

  async update(id: string, data: Partial<Course>): Promise<Course> {
    const course = await this.findOne(id);
    const updated = await this.coursesRepository.save({ ...course, ...data });
    await this.invalidateCache();
    await this.searchService.indexCourse(updated).catch(() => {});
    return updated;
  }

  async delete(id: string): Promise<Course> {
    const course = await this.findOne(id);
    const removed = await this.coursesRepository.remove(course);
    await this.invalidateCache();
    await this.searchService.deleteFromIndex('courses', id).catch(() => {});
    return removed;
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
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
}
