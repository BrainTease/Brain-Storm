import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Progress } from '../progress/progress.entity';
import { ProgressRepository } from './progress-repository.interface';

@Injectable()
export class TypeOrmProgressRepository implements ProgressRepository {
  constructor(@InjectRepository(Progress) private readonly repo: Repository<Progress>) {}

  findById(id: string): Promise<Progress | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUserAndCourse(userId: string, courseId: string): Promise<Progress | null> {
    return this.repo.findOne({ where: { userId, courseId } });
  }

  findByUser(userId: string): Promise<Progress[]> {
    return this.repo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  countCompletedByUser(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, completedAt: Not(IsNull()) } });
  }

  save(data: Partial<Progress>): Promise<Progress> {
    if (data.id) {
      return this.repo.save(data);
    }
    return this.repo.save(this.repo.create(data));
  }

  remove(entity: Progress): Promise<Progress> {
    return this.repo.remove(entity);
  }
}
