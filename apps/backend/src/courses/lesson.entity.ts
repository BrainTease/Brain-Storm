import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  moduleId!: string;

  @ManyToOne(() => CourseModule, (m) => m.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module!: CourseModule;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ nullable: true })
  videoUrl!: string;

  @Column({ default: 0 })
  order!: number;

  @Column({ default: 0 })
  durationMinutes!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
