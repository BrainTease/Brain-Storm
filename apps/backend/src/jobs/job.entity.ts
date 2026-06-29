import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum JobStatus { OPEN = 'open', CLOSED = 'closed', EXPIRED = 'expired', FILLED = 'filled' }
export enum ApplicationStatus { PENDING = 'pending', REVIEWED = 'reviewed', ACCEPTED = 'accepted', REJECTED = 'rejected', WITHDRAWN = 'withdrawn' }

@Entity('jobs')
@Index(['status', 'expiresAt'])
@Index(['instructorId'])
export class Job {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column('text') description: string;
  @Column({ default: '' }) category: string;
  @Column('simple-array', { nullable: true }) requiredSkills: string[];
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) budgetMin?: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) budgetMax?: number;
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.OPEN }) status: JobStatus;
  @Column({ nullable: true }) instructorId: string;
  @Column({ nullable: true, type: 'timestamptz' }) expiresAt?: Date;
  @Column({ default: false }) isDeleted: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'instructorId' }) instructor: User;
  @OneToMany(() => JobApplication, a => a.job) applications: JobApplication[];
}

@Entity('job_applications')
@Index(['jobId', 'applicantId'], { unique: true })
@Index(['applicantId', 'status'])
export class JobApplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() jobId: string;
  @Column() applicantId: string;
  @Column('text', { nullable: true }) coverLetter?: string;
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING }) status: ApplicationStatus;
  @Column({ nullable: true, type: 'text' }) reviewNote?: string;
  @CreateDateColumn() appliedAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @ManyToOne(() => Job, j => j.applications, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'jobId' }) job: Job;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'applicantId' }) applicant: User;
}
