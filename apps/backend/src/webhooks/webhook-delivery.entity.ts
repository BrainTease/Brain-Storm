import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum DeliveryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  DLQ = 'dlq',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  webhookId: string;

  @Column()
  event: string;

  @Column('text')
  payload: string;

  @Index()
  @Column({ type: 'varchar', default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ nullable: true })
  responseStatus: number;

  @Column({ nullable: true, type: 'text' })
  responseBody: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true, type: 'timestamp' })
  nextRetryAt: Date;

  /** Set when this delivery moves to the dead-letter queue */
  @Column({ nullable: true, type: 'timestamp' })
  deadLetteredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
