import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

@Entity('instructor_analytics')
@Index(['instructorId', 'courseId', 'month'])
export class InstructorAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  instructorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column()
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'varchar' }) // YYYY-MM format
  month: string;

  @Column({ type: 'integer', default: 0 })
  enrollments: number;

  @Column({ type: 'integer', default: 0 })
  completions: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  payout: number;

  @CreateDateColumn()
  createdAt: Date;
}
