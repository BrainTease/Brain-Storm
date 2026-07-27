import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum StellarTxType {
  CREDENTIAL = 'credential',
  PROGRESS = 'progress',
  MINT_REWARD = 'mint_reward',
  MINT_CERTIFICATE = 'mint_certificate',
  FUND_TESTNET = 'fund_testnet',
}

export enum StellarTxStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('stellar_transaction_logs')
export class StellarTransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StellarTxType })
  type: StellarTxType;

  @Column({ nullable: true })
  txHash: string;

  @Column({ nullable: true })
  recipientPublicKey: string;

  @Column({ nullable: true })
  courseId: string;

  @Column({ type: 'enum', enum: StellarTxStatus })
  status: StellarTxStatus;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
