import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

export enum FlagType {
  BOOLEAN = 'boolean',
  PERCENTAGE = 'percentage',
  USER_TARGETED = 'user_targeted',
}

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'enum', enum: FlagType, default: FlagType.BOOLEAN })
  type: FlagType;

  @Column({ default: false })
  enabled: boolean;

  /** For percentage rollouts: 0-100 */
  @Column({ type: 'float', default: 0 })
  percentage: number;

  /** For user-targeted flags: array of user IDs */
  @Column({ type: 'simple-array', nullable: true })
  targetedUserIds: string[];

  @Column({ nullable: true })
  description: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
