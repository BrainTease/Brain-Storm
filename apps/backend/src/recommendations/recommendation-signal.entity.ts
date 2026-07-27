/**
 * Recommendation signal entity (Issue #631)
 *
 * Captures both implicit (view, dwell, complete) and explicit (rating, dismiss)
 * signals for use in the recommendation feedback loop.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

export enum SignalType {
  /** User viewed the course detail page */
  VIEW = 'view',
  /** User spent time on the course (seconds) */
  DWELL = 'dwell',
  /** User completed the course */
  COMPLETE = 'complete',
  /** User explicitly rated the course (1-5) */
  RATING = 'rating',
  /** User explicitly dismissed/not-interested */
  DISMISS = 'dismiss',
  /** User clicked enroll */
  CLICK = 'click',
}

@Entity('recommendation_signals')
@Index(['userId', 'courseId', 'signalType'])
@Index(['userId', 'createdAt'])
export class RecommendationSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'varchar' })
  signalType: SignalType;

  /**
   * Signal value:
   *  - VIEW/COMPLETE/CLICK/DISMISS: 1
   *  - DWELL: seconds spent
   *  - RATING: 1-5 star value
   */
  @Column({ type: 'float', default: 1 })
  value: number;

  /** Respect user privacy — false = signal must not be used for recommendations */
  @Column({ default: true })
  consentGranted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
