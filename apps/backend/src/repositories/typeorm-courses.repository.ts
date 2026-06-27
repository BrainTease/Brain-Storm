import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/course.entity';
import { CourseQueryDto } from '../courses/dto/course-query.dto';
import { CoursesRepository } from './courses-repository.interface';

@Injectable()
export class TypeOrmCoursesRepository implements CoursesRepository {
  constructor(@InjectRepository(Course) private repo: Repository<Course>) {}

  findById(id: string): Promise<Course | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  findByIdWithDeleted(id: string): Promise<Course | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(data: Partial<Course>): Promise<Course> {
    if (data.id) {
      return this.repo.save(data);
    }
    return this.repo.save(this.repo.create(data));
  }

  remove(entity: Course): Promise<Course> {
    return this.repo.remove(entity);
  }

  async findAll(query: CourseQueryDto = {}) {
    const { search, level, page = 1, limit = 20 } = query;

    const qb = this.repo.createQueryBuilder('course')
      .where('course.isPublished = :isPublished', { isPublished: true })
      .andWhere('course.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      qb.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (level) {
      qb.andWhere('course.level = :level', { level });
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit).orderBy('course.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }
}