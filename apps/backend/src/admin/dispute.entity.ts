import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DisputeStatus, DisputeType } from '@brain-storm/types';

export { DisputeStatus, DisputeType } from '@brain-storm/types';

@Entity('disputes')
@Index(['status'])
@Index(['submittedByUserId'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: DisputeType, default: DisputeType.OTHER })
  type!: DisputeType;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status!: DisputeStatus;

  @Column()
  submittedByUserId!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ nullable: true })
  targetEntityId!: string | null;

  @Column({ nullable: true })
  targetEntityType!: string | null;

  @Column({ nullable: true })
  resolvedByUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  resolution!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
