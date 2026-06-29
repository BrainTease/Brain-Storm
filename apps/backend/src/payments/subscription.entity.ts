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

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
}

export enum SubscriptionPlan {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @Index()
  @Column({ type: 'varchar', default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  /** Stripe Subscription ID for fiat subscriptions */
  @Index({ unique: true })
  @Column({ nullable: true })
  stripeSubscriptionId: string;

  /** Stripe Customer ID */
  @Column({ nullable: true })
  stripeCustomerId: string;

  /** UTC timestamp when the current billing period ends */
  @Column({ nullable: true, type: 'timestamp' })
  currentPeriodEnd: Date;

  /** UTC timestamp of the trial end (if applicable) */
  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
