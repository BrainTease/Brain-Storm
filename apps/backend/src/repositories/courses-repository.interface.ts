import { Course } from '../courses/course.entity';
import { CourseQueryDto } from '../courses/dto/course-query.dto';
import { BaseRepository } from './base-repository.interface';

export interface CoursesRepository extends BaseRepository<Course> {
  findAll(query?: CourseQueryDto): Promise<{
    data: Course[];
    total: number;
    page: number;
    limit: number;
  }>;
  findByIdWithDeleted(id: string): Promise<Course | null>;
  findManyByIds(ids: string[]): Promise<Course[]>;
}