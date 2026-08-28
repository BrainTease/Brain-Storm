import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type GrantStatus = 'open' | 'under_review' | 'approved' | 'rejected' | 'closed';

@Entity('grants')
export class Grant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount!: number;

  @Column({ length: 10, default: 'USD' })
  currency!: string;

  @Column({ length: 36 })
  applicantId!: string;

  @Column({ length: 50, default: 'open' })
  status!: GrantStatus;

  @Column({ type: 'text', nullable: true })
  reviewNotes!: string | null;

  @Column({ length: 36, nullable: true })
  reviewerId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
