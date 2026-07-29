import { Progress } from '../progress/progress.entity';
import { BaseRepository } from './base-repository.interface';

export interface ProgressRepository extends BaseRepository<Progress> {
  findByUserAndCourse(userId: string, courseId: string): Promise<Progress | null>;
  findByUser(userId: string): Promise<Progress[]>;
  countCompletedByUser(userId: string): Promise<number>;
}
