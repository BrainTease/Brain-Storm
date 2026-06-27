import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cohort } from './cohort.entity';
import { User } from '../users/user.entity';
import { SessionAttendance } from './session-attendance.entity';

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('cohort_sessions')
@Index(['cohortId', 'startTime'])
@Index(['status', 'startTime'])
export class CohortSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cohortId: string;

  @ManyToOne(() => Cohort, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cohortId' })
  cohort: Cohort;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamp')
  startTime: Date;

  @Column('timestamp')
  endTime: Date;

  @Column({ nullable: true })
  videoProviderId: string; // e.g., LiveKit room ID

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ type: 'uuid', nullable: true })
  instructorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @OneToMany(() => SessionAttendance, (a) => a.session, { cascade: true })
  attendances: SessionAttendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
