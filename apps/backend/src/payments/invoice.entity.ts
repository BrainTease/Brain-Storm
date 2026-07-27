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
import { Subscription } from './subscription.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  subscriptionId: string;

  @ManyToOne(() => Subscription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  /** Stripe Invoice ID */
  @Index({ unique: true })
  @Column({ nullable: true })
  stripeInvoiceId: string;

  @Column({ type: 'varchar', default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ default: 0 })
  amountDueCents: number;

  @Column({ default: 0 })
  amountPaidCents: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate: Date;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
