import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from '../users/user.entity';

@Entity('course_versions')
export class CourseVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  courseId!: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @Column()
  versionTag!: string;

  @Column({ default: 1 })
  versionNumber!: number;

  @Column('jsonb')
  snapshot!: Record<string, any>;

  @Column({ nullable: true, type: 'text' })
  changeNote!: string;

  @Column({ nullable: true })
  createdById!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
