import { Enrollment } from '../enrollments/enrollment.entity';
import { BaseRepository } from './base-repository.interface';

export interface EnrollmentsRepository extends BaseRepository<Enrollment> {
  findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null>;
  findByUser(userId: string): Promise<Enrollment[]>;
  findByIdWithRelations(id: string): Promise<Enrollment | null>;
}
