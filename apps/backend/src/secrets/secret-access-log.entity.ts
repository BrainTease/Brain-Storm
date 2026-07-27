import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum SecretAccessAction {
  READ = 'read',
  WRITE = 'write',
  ROTATE = 'rotate',
  BACKUP = 'backup',
  EMERGENCY_ACCESS = 'emergency_access',
}

@Entity('secret_access_logs')
@Index(['secretName'])
@Index(['accessedAt'])
@Index(['accessedBy'])
export class SecretAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  secretName: string;

  @Column()
  action: SecretAccessAction;

  @Column({ nullable: true })
  accessedBy: string | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ default: true })
  success: boolean;

  @Column({ nullable: true })
  reason: string | null;

  @CreateDateColumn()
  accessedAt: Date;
}
