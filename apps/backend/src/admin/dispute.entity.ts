import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeType {
  USER_CONTENT = 'user_content',
  COURSE = 'course',
  BILLING = 'billing',
  ACCOUNT = 'account',
  OTHER = 'other',
}

@Entity('disputes')
@Index(['status'])
@Index(['submittedByUserId'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DisputeType, default: DisputeType.OTHER })
  type: DisputeType;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column()
  submittedByUserId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  targetEntityId: string | null;

  @Column({ nullable: true })
  targetEntityType: string | null;

  @Column({ nullable: true })
  resolvedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
