import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  url: string;

  /** Comma-separated event types, e.g. "enrollment.created,enrollment.completed" */
  @Column('text')
  events: string;

  /** Active HMAC signing secret */
  @Column()
  secret: string;

  /** Previous secret kept for a 24-h grace period during rotation */
  @Column({ nullable: true, type: 'varchar' })
  previousSecret: string | null;

  /** When the previous secret expires (null = no rotation in progress) */
  @Column({ nullable: true, type: 'timestamp' })
  secretRotatedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
