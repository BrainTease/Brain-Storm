import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity';
import { EnrollmentsRepository } from './enrollments-repository.interface';

@Injectable()
export class TypeOrmEnrollmentsRepository implements EnrollmentsRepository {
  constructor(@InjectRepository(Enrollment) private readonly repo: Repository<Enrollment>) {}

  findById(id: string): Promise<Enrollment | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdWithRelations(id: string): Promise<Enrollment | null> {
    return this.repo.findOne({ where: { id }, relations: ['user', 'course'] });
  }

  findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return this.repo.findOne({ where: { userId, courseId } });
  }

  findByUser(userId: string): Promise<Enrollment[]> {
    return this.repo.find({
      where: { userId },
      relations: ['course'],
      order: { enrolledAt: 'DESC' },
    });
  }

  save(data: Partial<Enrollment>): Promise<Enrollment> {
    if (data.id) {
      return this.repo.save(data);
    }
    return this.repo.save(this.repo.create(data));
  }

  remove(entity: Enrollment): Promise<Enrollment> {
    return this.repo.remove(entity);
  }
}
