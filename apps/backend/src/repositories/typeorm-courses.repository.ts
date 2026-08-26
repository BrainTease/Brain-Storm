import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from '../courses/course.entity';
import { CourseQueryDto } from '../courses/dto/course-query.dto';
import { CoursesRepository } from './courses-repository.interface';
import { QueryOptimizer } from '../common/database/query-optimizer';

@Injectable()
export class TypeOrmCoursesRepository implements CoursesRepository {
  constructor(@InjectRepository(Course) private repo: Repository<Course>) {}

  findById(id: string): Promise<Course | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  findByIdWithDeleted(id: string): Promise<Course | null> {
    return this.repo.findOne({ where: { id } });
  }

  findManyByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids), isDeleted: false } });
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
    const data = await qb.getMany();

    return { data, total, page, limit };
  }
}
