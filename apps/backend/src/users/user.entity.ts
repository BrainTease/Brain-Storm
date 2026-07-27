import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['email', 'deletedAt'])
@Index(['role', 'deletedAt'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  stellarPublicKey: string;

  @Column({ default: 'student' })
  role: string;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  deletedAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  verificationToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  verificationTokenExpiresAt: Date | null;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true })
  mfaSecret: string | null;

  @Column({ type: 'simple-array', nullable: true, default: null })
  mfaBackupCodes: string[] | null;

  @Column({ unique: true, nullable: true })
  referralCode: string;

  @Column({ nullable: true, type: 'varchar' })
  referredBy: string | null;

  // Audit columns
  @Column({ nullable: true })
  createdBy: string | null;

  @Column({ nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
