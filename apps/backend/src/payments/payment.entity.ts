import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

export enum PaymentProvider {
  STRIPE = 'stripe',
  STELLAR = 'stellar',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ nullable: true })
  subscriptionId: string;

  /** Fiat amount in smallest currency unit (cents) */
  @Column({ default: 0 })
  amountCents: number;

  @Column({ default: 'usd' })
  currency: string;

  /** BST / XLM amount in stroops (1 XLM = 10_000_000 stroops) */
  @Column({ nullable: true, type: 'bigint' })
  bstAmount: string;

  @Column({ type: 'varchar', enum: PaymentProvider })
  provider: PaymentProvider;

  @Index()
  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  status: PaymentStatus;

  /** Stripe PaymentIntent ID / Checkout Session ID */
  @Index({ unique: true })
  @Column({ nullable: true })
  stripePaymentIntentId: string;

  /** Stellar transaction hash */
  @Column({ nullable: true })
  stellarTxHash: string;

  /**
   * Idempotency key — prevents duplicate processing when Stripe fires
   * the same webhook event more than once.
   */
  @Index({ unique: true })
  @Column({ nullable: true })
  idempotencyKey: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
