import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_RESET_REQUEST = 'auth.password_reset.request',
  PASSWORD_RESET_COMPLETE = 'auth.password_reset.complete',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  API_KEY_CREATED = 'apikey.created',
  API_KEY_REVOKED = 'apikey.revoked',
  API_KEY_ROTATED = 'apikey.rotated',
  API_KEY_USED = 'apikey.used',
  ADMIN_ACTION = 'admin.action',
  ROLE_CHANGED = 'admin.role_changed',
  USER_BANNED = 'admin.user_banned',
  SECRET_ROTATED = 'secret.rotated',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string | null;

  @Column()
  action: string;

  /** Encrypted at rest via AES-256-CBC */
  @Column({ nullable: true, type: 'text' })
  ipAddress: string | null;

  /** Encrypted at rest via AES-256-CBC */
  @Column({ nullable: true, type: 'text' })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ default: true })
  success: boolean;

  /** SHA-256 hash of the previous entry — forms a tamper-evident chain */
  @Column({ nullable: true, type: 'varchar', length: 64 })
  prevHash: string | null;

  /** SHA-256 hash of this entry's canonical fields + prevHash */
  @Column({ nullable: true, type: 'varchar', length: 64 })
  entryHash: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
