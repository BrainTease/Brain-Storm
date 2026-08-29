import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
}

export enum ProposalType {
  PARAMETER_CHANGE = 'parameter_change',
  TREASURY = 'treasury',
  UPGRADE = 'upgrade',
  TEXT = 'text',
}

@Entity('governance_proposals')
export class GovernanceProposal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ type: 'enum', enum: ProposalType, default: ProposalType.TEXT })
  type!: ProposalType;

  @Column({ type: 'enum', enum: ProposalStatus, default: ProposalStatus.DRAFT })
  status!: ProposalStatus;

  /** Stellar account address of the proposer */
  @Column()
  proposerAddress!: string;

  /** On-chain proposal ID (set after contract creation) */
  @Column({ nullable: true })
  onChainId!: string;

  @Column({ type: 'int', default: 0 })
  votesFor!: number;

  @Column({ type: 'int', default: 0 })
  votesAgainst!: number;

  @Column({ type: 'int', default: 0 })
  quorumRequired!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  votingStartsAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  votingEndsAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  executedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
