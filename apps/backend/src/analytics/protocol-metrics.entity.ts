import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type MetricInterval = 'hour' | 'day' | 'week';

@Entity('protocol_metrics')
@Index(['metric', 'interval', 'bucketStart'], { unique: true })
export class ProtocolMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. 'registrations', 'tip_volume', 'escrow_throughput', 'dispute_outcomes' */
  @Index()
  @Column()
  metric: string;

  @Column({ type: 'varchar', length: 10 })
  interval: MetricInterval;

  /** Start of the time bucket (truncated to the interval) */
  @Index()
  @Column({ type: 'timestamptz' })
  bucketStart: Date;

  /** Numeric value — count, volume, etc. */
  @Column({ type: 'numeric', precision: 30, scale: 8, default: 0 })
  value: number;

  /** Optional dimension: asset code for tip_volume, outcome label for disputes */
  @Column({ nullable: true })
  dimension: string;

  /** Wall-clock time this row was last aggregated */
  @CreateDateColumn({ type: 'timestamptz' })
  aggregatedAt: Date;
}
