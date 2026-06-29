import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum MediaStatus { PENDING = 'pending', READY = 'ready', FAILED = 'failed', DELETED = 'deleted' }

@Entity('media')
@Index(['ownerId'])
@Index(['status'])
export class Media {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() ownerId: string;
  @Column() originalName: string;
  @Column() mimeType: string;
  @Column('int') sizeBytes: number;
  @Column() storageKey: string;
  @Column() bucket: string;
  @Column({ nullable: true }) publicUrl?: string;
  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.PENDING }) status: MediaStatus;
  @Column('jsonb', { nullable: true }) derivatives?: Record<string, string>;
  @Column('jsonb', { nullable: true }) metadata?: Record<string, unknown>;
  @CreateDateColumn() uploadedAt: Date;
  @Column({ nullable: true, type: 'timestamptz' }) deletedAt?: Date;
}
